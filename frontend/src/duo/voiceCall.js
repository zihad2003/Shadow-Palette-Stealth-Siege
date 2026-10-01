/**
 * Duo voice routed through the game server (STOMP), not peer-to-peer WebRTC.
 * Both players already reach the API, so this works across NATs after a Vercel deploy
 * without a separate TURN relay.
 */
import { stompPublishNow, stompSubscribe, stompUnsubscribe } from '../live/stompClient.js';

const RATE = 16000;
const FRAME = 320;
const PLAY_LEAD = 0.02;
const PLAY_MAX = 0.055;

function downsample(input, inRate, outRate) {
  if (!input || input.length === 0) return new Float32Array(0);
  if (!inRate || inRate === outRate) return input;
  const ratio = inRate / outRate;
  const length = Math.floor(input.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = pos - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
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

  function primeAudio() {
    if (disposed) return;
    if (!contextUsable(playCtx)) playCtx = new AudioContext({ latencyHint: 'interactive' });
    if (!contextUsable(captureCtx)) captureCtx = new AudioContext({ latencyHint: 'interactive' });
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
  }

  function resume() {
    primeAudio();
  }

  function playPcm(bytes, rate) {
    if (deafened || disposed || !bytes || bytes.length < 2) return;
    const playRate = rate || RATE;
    if (!contextUsable(playCtx)) playCtx = new AudioContext();
    playCtx.resume?.().catch(() => {});
    if (playCtx.state === 'suspended') {
      setStatus('needs-gesture');
      return;
    }
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
    src.connect(playCtx.destination);
    const now = playCtx.currentTime;
    if (nextPlay < now + 0.005 || nextPlay > now + PLAY_MAX) nextPlay = now + PLAY_LEAD;
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
      publishPcm(merged.subarray(offset, offset + FRAME));
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
    enqueue(downsample(samples, inRate, RATE));
  }

  function attachScriptProcessor(source, inRate) {
    processor = captureCtx.createScriptProcessor(512, 1, 1);
    const sink = captureCtx.createGain();
    sink.gain.value = 0;
    processor.onaudioprocess = (ev) => {
      onCaptured(ev.inputBuffer.getChannelData(0), inRate);
    };
    source.connect(processor);
    processor.connect(sink);
    sink.connect(captureCtx.destination);
  }

  async function attachMic() {
    if (!localStream || !contextUsable(captureCtx) || processor || workletNode) return;
    const source = captureCtx.createMediaStreamSource(localStream);
    const inRate = captureCtx.sampleRate || 48000;
    try {
      await captureCtx.audioWorklet.addModule(new URL('./voiceCaptureWorklet.js', import.meta.url));
      if (disposed) return;
      workletNode = new AudioWorkletNode(captureCtx, 'voice-capture');
      workletNode.port.onmessage = (ev) => onCaptured(ev.data, inRate);
      const sink = captureCtx.createGain();
      sink.gain.value = 0;
      source.connect(workletNode);
      workletNode.connect(sink);
      sink.connect(captureCtx.destination);
    } catch {
      attachScriptProcessor(source, inRate);
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
              noiseSuppression: false,
              autoGainControl: false,
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
    } catch {
      /* ignore */
    }
    processor = null;
    workletNode = null;
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
