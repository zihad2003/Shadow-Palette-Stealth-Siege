/**
 * Duo voice routed through the game server (STOMP), not peer-to-peer WebRTC.
 * Both players already reach the API, so this works across NATs after a Vercel deploy
 * without a separate TURN relay.
 */
import { stompPublish, stompSubscribe, stompUnsubscribe } from '../live/stompClient.js';

const RATE = 16000;
const FRAME = 2048;

export function createDuoVoiceCall({ partyId, userId, onStatus }) {
  let localStream = null;
  let captureCtx = null;
  let playCtx = null;
  let processor = null;
  let muted = false;
  let deafened = false;
  let disposed = false;
  let nextPlay = 0;
  const voiceDest = `/topic/voice/${partyId}`;

  const setStatus = (s) => {
    try {
      onStatus?.(s);
    } catch {
      /* ignore */
    }
  };

  function resume() {
    captureCtx?.resume?.().catch(() => {});
    playCtx?.resume?.().catch(() => {});
  }

  function playPcm(bytes, rate) {
    if (deafened || disposed || !bytes || bytes.length < 2) return;
    const playRate = rate || RATE;
    if (!playCtx) playCtx = new AudioContext();
    resume();
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
    if (nextPlay < now + 0.02) nextPlay = now + 0.06;
    src.start(nextPlay);
    nextPlay += buf.duration;
    if (nextPlay > now + 0.6) nextPlay = now + 0.08;
    setStatus('connected');
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
    if (muted || disposed) return;
    const pcm = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i += 1) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(pcm.buffer);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
    stompPublish(`/app/voice/${partyId}`, {
      pcm: btoa(bin),
      rate: captureCtx?.sampleRate || RATE,
    }).catch(() => {});
  }

  async function start() {
    setStatus('requesting-mic');
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch (err) {
      setStatus('mic-denied');
      throw err;
    }
    if (disposed) {
      localStream.getTracks().forEach((t) => t.stop());
      return;
    }

    await stompSubscribe(voiceDest, onVoice);
    captureCtx = new AudioContext({ sampleRate: RATE });
    resume();
    const source = captureCtx.createMediaStreamSource(localStream);
    processor = captureCtx.createScriptProcessor(FRAME, 1, 1);
    const sink = captureCtx.createGain();
    sink.gain.value = 0;
    processor.onaudioprocess = (ev) => {
      publishPcm(ev.inputBuffer.getChannelData(0));
    };
    source.connect(processor);
    processor.connect(sink);
    sink.connect(captureCtx.destination);
    setStatus(captureCtx.state === 'suspended' ? 'needs-gesture' : 'calling');
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
    if (deafened) nextPlay = 0;
  }

  function isDeafened() {
    return deafened;
  }

  async function stop() {
    disposed = true;
    stompUnsubscribe(voiceDest, onVoice);
    try {
      processor?.disconnect();
    } catch {
      /* ignore */
    }
    processor = null;
    localStream?.getTracks().forEach((t) => t.stop());
    localStream = null;
    captureCtx?.close?.().catch(() => {});
    playCtx?.close?.().catch(() => {});
    captureCtx = null;
    playCtx = null;
    setStatus('ended');
  }

  return { start, stop, resume, setMuted, isMuted, setDeafened, isDeafened };
}
