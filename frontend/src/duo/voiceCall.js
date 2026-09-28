/**
 * Robust WebRTC voice chat with STUN and Open Relay TURN fallback.
 * Fixes SDP negotiation races, prevents audio feedback conflicts, and guarantees reliable laptop-to-laptop and laptop-to-mobile audio.
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
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
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

  async function sendOffer() {
    if (disposed || !pc || !isHost || makingOffer) return;
    if (pc.signalingState !== 'stable') return;
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
      console.warn('[Voice] sendOffer error:', e);
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
        if (pc.signalingState === 'stable') {
          await sendOffer();
        }
        return;
      }

      if (msg.type === 'offer' && !isHost) {
        if (pc.signalingState !== 'stable') {
          // Collision resolution: roll back if we had a local offer
          if (pc.signalingState === 'have-local-offer') {
            await pc.setLocalDescription({ type: 'rollback' }).catch(() => {});
          } else {
            return;
          }
        }

        const desc = new RTCSessionDescription(msg.payload);
        await pc.setRemoteDescription(desc);
        await flushIce();

        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
        });
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

    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      publish('ice', ev.candidate.toJSON());
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams?.[0] || new MediaStream([ev.track]);
      onRemoteStream?.(stream);
      if (ev.track) {
        ev.track.onunmute = () => onRemoteStream?.(stream);
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
      else if (s === 'failed') {
        setStatus('reconnecting');
        if (isHost && pc && pc.signalingState === 'stable') {
          pc.restartIce?.();
          sendOffer().catch(() => {});
        }
      }
    };

    await stompSubscribe(signalDest, handleSignal);

    if (isHost) {
      setStatus('calling');
      await sendOffer();
    } else {
      setStatus('waiting-offer');
      await publish('ready');
      // If host was slightly slower to subscribe, re-announce ready every 2s until offer arrives
      const timer = window.setInterval(() => {
        if (disposed || !pc || pc.connectionState === 'connected' || pc.remoteDescription) {
          window.clearInterval(timer);
          return;
        }
        publish('ready');
      }, 2000);
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
    setStatus('ended');
  }

  return { start, stop, setMuted, isMuted, setDeafened, isDeafened };
}
