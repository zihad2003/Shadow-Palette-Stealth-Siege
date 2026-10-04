/**
 * Duo voice routed through the game server (STOMP), not peer-to-peer WebRTC.
 * Both players already reach the API, so this works across NATs after a Vercel deploy
 * without a separate TURN relay.
 *
 * 32 kHz wideband PCM + browser NS/AEC/AGC + speech EQ keeps talk clear
 * without leaving the existing STOMP path.
 */
import { stompPublishNow, stompSubscribe, stompUnsubscribe } from '../live/stompClient.js';

const RATE = 32000;
const FRAME = 640;
const PLAY_LEAD = 0.08;
const PLAY_MAX = 0.22;
const GATE_OPEN = 0.012;
const GATE_CLOSE = 0.007;

function resampleCubic(input, inRate, outRate) {
  if (!input || input.length === 0) return new Float32Array(0);
  if (!inRate || Math.abs(inRate - outRate) < 1) return input;
  const ratio = inRate / outRate;
  const length = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(length);
  const last = input.length - 1;
  for (let i = 0; i < length; i += 1) {
    const pos = i * ratio;
    const i1 = Math.min(last, Math.floor(pos));
    const frac = pos - i1;
    const s0 = input[Math.max(0, i1 - 1)];
    const s1 = input[i1];
    const s2 = input[Math.min(last, i1 + 1)];
    const s3 = input[Math.min(last, i1 + 2)];
    const a0 = s3 - s2 - s0 + s1;
    const a1 = s0 - s1 - a0;
    const a2 = s2 - s0;
    out[i] = ((a0 * frac + a1) * frac + a2) * frac + s1;
  }
  return out;
}

function frameRms(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
  return Math.sqrt(sum / Math.max(1, samples.length));
}

function wireSpeechChain(ctx, { presenceHz = 2500, presenceGain = 4, playGain = 1 } = {}) {
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 90;
  highpass.Q.value = 0.707;

  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = presenceHz;
  presence.Q.value = 1.05;
  presence.gain.value = presenceGain;

  const deEss = ctx.createBiquadFilter();
  deEss.type = 'highshelf';
  deEss.frequency.value = 7000;
  deEss.gain.value = -2.5;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -22;
  comp.knee.value = 16;
  comp.ratio.value = 3;
  comp.attack.value = 0.005;
  comp.release.value = 0.14;

  const gain = ctx.createGain();
  gain.gain.value = playGain;

  highpass.connect(presence);
  presence.connect(deEss);
  deEss.connect(comp);
  comp.connect(gain);

  return { input: highpass, output: gain, nodes: [highpass, presence, deEss, comp, gain] };
}

export function createDuoVoiceCall({ partyId, userId, onStatus }) {
  let localStream = null;
  let captureCtx = null;
  let playCtx = null;
  let processor = null;
  let muted = false;
  let deafened = false;
  let disposed = false;
  let nextPlay = 0;
  let heard = false;
  let workletNode = null;
  let hold = new Float32Array(0);
  let micStarting = null;
  let listenPromise = null;
  let captureChain = null;
  let playChain = null;
  let gateOpen = false;
  const voiceDest = `/topic/voice/${partyId}`;

  const setStatus = (s) => {
    try {
      onStatus?.(s);
    } catch {
      /* ignore */
    }
  };

  function contextUsable(ctx) {
    return ctx && ctx.state !== 'closed';
  }

  function ensurePlayChain() {
    if (!contextUsable(playCtx)) return null;
    if (playChain) return playChain;
    playChain = wireSpeechChain(playCtx, { presenceHz: 2200, presenceGain: 3.5, playGain: 1.25 });
    playChain.output.connect(playCtx.destination);
    return playChain;
  }

  function primeAudio() {
    if (disposed) return;
    if (!contextUsable(playCtx)) {
      try {
        playCtx = new AudioContext({ latencyHint: 'interactive', sampleRate: RATE });
      } catch {
        playCtx = new AudioContext({ latencyHint: 'interactive' });
      }
      playChain = null;
    }
    if (!contextUsable(captureCtx)) {
      captureCtx = new AudioContext({ latencyHint: 'interactive' });
      captureChain = null;
    }
    playCtx.resume?.().catch(() => {});
    captureCtx.resume?.().catch(() => {});
    try {
      const buf = playCtx.createBuffer(1, 1, playCtx.sampleRate || RATE);
      const src = playCtx.createBufferSource();
      src.buffer = buf;
      src.connect(playCtx.destination);
      src.start();
    } catch {
      /* unlock is best-effort */
    }
    ensurePlayChain();
  }

  function resume() {
    primeAudio();
  }

  function playPcm(bytes, rate) {
    if (deafened || disposed || !bytes || bytes.length < 2) return;
    const playRate = rate || RATE;
    if (!contextUsable(playCtx)) {
      try {
        playCtx = new AudioContext({ latencyHint: 'interactive', sampleRate: RATE });
      } catch {
        playCtx = new AudioContext({ latencyHint: 'interactive' });
      }
      playChain = null;
    }
    playCtx.resume?.().catch(() => {});
    if (playCtx.state === 'suspended') {
      setStatus('needs-gesture');
      return;
    }
    const chain = ensurePlayChain();
    if (!chain) return;
    const samples = bytes.length >> 1;
    const f32 = new Float32Array(samples);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < samples; i += 1) {
      f32[i] = view.getInt16(i * 2, true) / 32768;
    }
    const buf = playCtx.createBuffer(1, f32.length, playRate);
    buf.copyToChannel(f32, 0);
    const src = playCtx.createBufferSource();
    src.buffer = buf;
    src.connect(chain.input);
    const now = playCtx.currentTime;
    if (nextPlay < now + 0.012 || nextPlay > now + PLAY_MAX) nextPlay = now + PLAY_LEAD;
    src.start(nextPlay);
    nextPlay += buf.duration;
    if (!heard) {
      heard = true;
      setStatus('connected');
    }
  }

  function onVoice(msg) {
    if (disposed || !msg || Number(msg.fromUserId) === Number(userId) || !msg.pcm) return;
    try {
      const bin = atob(msg.pcm);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      playPcm(bytes, Number(msg.rate) || RATE);
    } catch {
      /* bad chunk */
    }
  }

  function publishPcm(float32) {
    if (muted || disposed || !float32 || float32.length === 0) return;
    const pcm = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i += 1) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
    stompPublishNow(`/app/voice/${partyId}`, {
      pcm: btoa(bin),
      rate: RATE,
    });
  }

  function enqueue(samples) {
    if (!samples || samples.length === 0) return;
    const merged = new Float32Array(hold.length + samples.length);
    merged.set(hold, 0);
    merged.set(samples, hold.length);
    let offset = 0;
    while (merged.length - offset >= FRAME) {
      const frame = merged.subarray(offset, offset + FRAME);
      const rms = frameRms(frame);
      if (rms >= GATE_OPEN) gateOpen = true;
      else if (rms < GATE_CLOSE) gateOpen = false;
      if (gateOpen) {
        publishPcm(frame);
      } else if (rms > 0.001) {
        const hush = new Float32Array(frame.length);
        const scale = 0.12;
        for (let i = 0; i < frame.length; i += 1) hush[i] = frame[i] * scale;
        publishPcm(hush);
      }
      offset += FRAME;
    }
    hold = merged.slice(offset);
  }

  function listen() {
    if (listenPromise) return listenPromise;
    listenPromise = stompSubscribe(voiceDest, onVoice).catch((err) => {
      listenPromise = null;
      throw err;
    });
    return listenPromise;
  }

  function onCaptured(samples, inRate) {
    if (muted || disposed) return;
    enqueue(resampleCubic(samples, inRate, RATE));
  }

  function attachScriptProcessor(tap, inRate) {
    processor = captureCtx.createScriptProcessor(512, 1, 1);
    const sink = captureCtx.createGain();
    sink.gain.value = 0;
    processor.onaudioprocess = (ev) => {
      onCaptured(ev.inputBuffer.getChannelData(0), inRate);
    };
    tap.connect(processor);
    processor.connect(sink);
    sink.connect(captureCtx.destination);
  }

  async function attachMic() {
    if (!localStream || !contextUsable(captureCtx) || processor || workletNode) return;
    const source = captureCtx.createMediaStreamSource(localStream);
    captureChain = wireSpeechChain(captureCtx, { presenceHz: 2700, presenceGain: 4.5, playGain: 1 });
    source.connect(captureChain.input);
    const tap = captureChain.output;
    const inRate = captureCtx.sampleRate || 48000;
    try {
      await captureCtx.audioWorklet.addModule(new URL('./voiceCaptureWorklet.js', import.meta.url));
      if (disposed) return;
      workletNode = new AudioWorkletNode(captureCtx, 'voice-capture');
      workletNode.port.onmessage = (ev) => onCaptured(ev.data, inRate);
      const sink = captureCtx.createGain();
      sink.gain.value = 0;
      tap.connect(workletNode);
      workletNode.connect(sink);
      sink.connect(captureCtx.destination);
    } catch {
      attachScriptProcessor(tap, inRate);
    }
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
    setStatus(captureCtx.state === 'running' ? 'live' : 'needs-gesture');
  }

  async function enableMic() {
    primeAudio();
    if (localStream && (processor || workletNode)) {
      setStatus(captureCtx?.state === 'running' ? 'live' : 'needs-gesture');
      return;
    }
    if (micStarting) return micStarting;
    micStarting = (async () => {
      await listen();
      if (!localStream) {
        setStatus('requesting-mic');
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              latency: 0,
            },
            video: false,
          });
        } catch (err) {
          setStatus('mic-denied');
          throw err;
        }
      }
      if (disposed) {
        localStream?.getTracks().forEach((t) => t.stop());
        localStream = null;
        return;
      }
      primeAudio();
      try {
        await attachMic();
      } catch (err) {
        setStatus('mic-denied');
        throw err;
      }
    })().finally(() => {
      micStarting = null;
    });
    return micStarting;
  }

  async function start() {
    setStatus('connecting');
    await listen();
    if (disposed) return;
    setStatus('listening');
    try {
      await enableMic();
    } catch {
      /* hearing still works; the bar asks for a click to talk */
    }
  }

  function setMuted(next) {
    muted = !!next;
    localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  function isMuted() {
    return muted;
  }

  function setDeafened(next) {
    deafened = !!next;
    if (deafened) {
      nextPlay = 0;
      heard = false;
    }
  }

  function isDeafened() {
    return deafened;
  }

  async function stop() {
    disposed = true;
    stompUnsubscribe(voiceDest, onVoice);
    try {
      processor?.disconnect();
      workletNode?.disconnect();
      captureChain?.nodes?.forEach((n) => {
        try { n.disconnect(); } catch { /* ignore */ }
      });
      playChain?.nodes?.forEach((n) => {
        try { n.disconnect(); } catch { /* ignore */ }
      });
    } catch {
      /* ignore */
    }
    processor = null;
    workletNode = null;
    captureChain = null;
    playChain = null;
    heard = false;
    hold = new Float32Array(0);
    localStream?.getTracks().forEach((t) => t.stop());
    localStream = null;
    captureCtx?.close?.().catch(() => {});
    playCtx?.close?.().catch(() => {});
    captureCtx = null;
    playCtx = null;
    setStatus('ended');
  }

  return { start, stop, resume, primeAudio, enableMic, setMuted, isMuted, setDeafened, isDeafened };
}
