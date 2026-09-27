/**
 * Robust WebRTC voice chat with STUN/TURN traversal and Web Audio API playback.
 * Modeled after battle-royale in-game comms (PUBG/Valorant).
 */
import { stompPublish, stompSubscribe, stompUnsubscribe } from '../live/stompClient.js';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelay',
      credential: 'openrelay',
    },
  ],
  iceCandidatePoolSize: 10,
};

export function createDuoVoiceCall({ partyId, userId, isHost, onStatus, onRemoteStream }) {
  let pc = null;
  let localStream = null;
  let muted = false;
  let deafened = false;
  let disposed = false;
  let makingOffer = false;
  let remoteReady = false;
  let audioCtx = null;
  let remoteAudioElement = null;
  const pendingIce = [];
  const signalDest = `/topic/duo/${partyId}/signal`;

  const setStatus = (s) => {
    try {
      onStatus?.(s);
    } catch {
      /* ignore */
    }
  };

  const publish = (type, payload = null) =>
    stompPublish(`/app/duo/${partyId}/signal`, {
      fromUserId: userId,
      type,
      payload,
    }).catch(() => {});

  async function flushIce() {
    if (!pc?.remoteDescription) return;
    while (pendingIce.length) {
      const c = pendingIce.shift();
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* ignore stale candidate */
      }
    }
  }

  function playStream(stream) {
    if (disposed || !stream) return;

    // 1. Standalone persistent HTML5 Audio element
    try {
      if (!remoteAudioElement) {
        remoteAudioElement = new Audio();
        remoteAudioElement.autoplay = true;
        remoteAudioElement.playsInline = true;
      }
      remoteAudioElement.srcObject = stream;
      remoteAudioElement.volume = deafened ? 0 : 1.0;
      remoteAudioElement.muted = deafened;
      remoteAudioElement.play().catch((err) => {
        console.warn('[Voice] Autoplay blocked, waiting for user interaction:', err);
      });
    } catch {
      /* fallback */
    }

    // 2. Web Audio API pipeline for crystal-clear output
    try {
      if (!audioCtx || audioCtx.state === 'closed') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
        }
      }
      if (audioCtx) {
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        const source = audioCtx.createMediaStreamSource(stream);
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = deafened ? 0 : 1.0;
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
      }
    } catch (e) {
      console.warn('[Voice] WebAudio pipeline:', e);
    }

    onRemoteStream?.(stream);
  }

  async function sendOffer() {
    if (disposed || !pc || !isHost) return;
    makingOffer = true;
    try {
      setStatus('calling');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
      });
      if (disposed) return;
      await pc.setLocalDescription(offer);
      await publish('offer', { type: offer.type, sdp: offer.sdp });
    } catch (e) {
      console.warn('[Voice] Offer error:', e);
    } finally {
      makingOffer = false;
    }
  }

  async function handleSignal(msg) {
    if (disposed || !msg || Number(msg.fromUserId) === Number(userId)) return;
    if (!pc) return;

    try {
      if (msg.type === 'ready' && isHost) {
        remoteReady = true;
        if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setLocalDescription({ type: 'rollback' }).catch(() => {});
          }
          await sendOffer();
        }
        return;
      }

      if (msg.type === 'offer' && !isHost) {
        if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') {
          return;
        }
        if (makingOffer) return;

        const desc = new RTCSessionDescription(msg.payload);
        await pc.setRemoteDescription(desc);
        await flushIce();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await publish('answer', { type: answer.type, sdp: answer.sdp });
        setStatus('connected');
        return;
      }

      if (msg.type === 'answer' && isHost) {
        if (pc.signalingState !== 'have-local-offer') return;

        const desc = new RTCSessionDescription(msg.payload);
        await pc.setRemoteDescription(desc);
        await flushIce();
        setStatus('connected');
        return;
      }

      if (msg.type === 'ice' && msg.payload) {
        try {
          const candidate = new RTCIceCandidate(msg.payload);
          if (!pc.remoteDescription) {
            pendingIce.push(candidate);
          } else {
            await pc.addIceCandidate(candidate);
          }
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      const text = String(e?.message || e);
      if (/wrong state|stable|InvalidStateError|no pending remote/i.test(text)) return;
      console.warn('[Voice] Signal error:', text);
    }
  }

  async function start() {
    setStatus('requesting-mic');
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (err) {
      setStatus('mic-denied');
      throw err;
    }

    if (disposed) {
      localStream?.getTracks().forEach((t) => t.stop());
      return;
    }

    pc = new RTCPeerConnection(ICE_SERVERS);

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      publish('ice', ev.candidate.toJSON());
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams?.[0] || new MediaStream([ev.track]);
      playStream(stream);
      if (ev.track) {
        ev.track.onunmute = () => playStream(stream);
      }
      setStatus('connected');
    };

    pc.onconnectionstatechange = () => {
      const s = pc?.connectionState;
      if (s === 'connected') setStatus('connected');
      else if (s === 'failed' || s === 'disconnected') setStatus('reconnecting');
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc?.iceConnectionState;
      if (s === 'connected' || s === 'completed') setStatus('connected');
    };

    await stompSubscribe(signalDest, handleSignal);

    if (isHost) {
      setStatus('calling');
      await sendOffer();
      // Periodically ping offer if not connected yet
      const timer = window.setInterval(() => {
        if (disposed || !pc || pc.connectionState === 'connected') {
          window.clearInterval(timer);
          return;
        }
        if (!remoteReady) {
          publish('ready');
          sendOffer().catch(() => {});
        }
      }, 2000);
    } else {
      setStatus('waiting-offer');
      await publish('ready');
      const timer = window.setInterval(() => {
        if (disposed || !pc || pc.connectionState === 'connected') {
          window.clearInterval(timer);
          return;
        }
        publish('ready');
      }, 1500);
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
    if (remoteAudioElement) {
      remoteAudioElement.muted = deafened;
      remoteAudioElement.volume = deafened ? 0 : 1.0;
    }
  }

  function isDeafened() {
    return deafened;
  }

  async function stop() {
    disposed = true;
    stompUnsubscribe(signalDest);
    try {
      pc?.close();
    } catch {
      /* ignore */
    }
    pc = null;
    localStream?.getTracks().forEach((t) => t.stop());
    localStream = null;
    if (remoteAudioElement) {
      remoteAudioElement.srcObject = null;
      remoteAudioElement = null;
    }
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    setStatus('ended');
  }

  return { start, stop, setMuted, isMuted, setDeafened, isDeafened };
}
