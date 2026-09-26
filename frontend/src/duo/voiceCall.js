/**
 * WebRTC audio-only call. Signaling goes through STOMP (/app/duo/{partyId}/signal).
 * Best on localhost / same LAN; hard NAT may need TURN later.
 *
 * Handshake: guest publishes `ready`; host (re)sends offer so late joiners still connect.
 * Duplicate answers/offers are ignored when signalingState is already past that step.
 */
import { stompPublish, stompSubscribe, stompUnsubscribe } from '../live/stompClient.js';

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export function createDuoVoiceCall({ partyId, userId, isHost, onStatus, onRemoteStream }) {
  let pc = null;
  let localStream = null;
  let muted = false;
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
        /* stale candidate after renegotiation */
      }
    }
  }

  async function sendOffer() {
    if (disposed || !pc || !isHost) return;
    makingOffer = true;
    try {
      setStatus('calling');
      const offer = await pc.createOffer();
      if (disposed) return;
      await pc.setLocalDescription(offer);
      await publish('offer', offer);
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
        // Guest joined (or rejoined) — (re)send offer even if we already offered once.
        if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
          if (pc.signalingState === 'have-local-offer') {
            // Rollback local offer so we can create a fresh one for the late guest.
            await pc.setLocalDescription({ type: 'rollback' }).catch(() => {});
          }
          await sendOffer();
        }
        return;
      }

      if (msg.type === 'offer' && !isHost) {
        // Only answer when we can apply a remote offer.
        if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') {
          return;
        }
        if (makingOffer) return;
        await pc.setRemoteDescription(msg.payload);
        if (!pc.remoteDescription || pc.remoteDescription.type !== 'offer') return;
        await flushIce();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await publish('answer', answer);
        setStatus('answering');
        return;
      }

      if (msg.type === 'answer' && isHost) {
        // Duplicate answers after remount/HMR land in "stable" — ignore safely.
        if (pc.signalingState !== 'have-local-offer') {
          return;
        }
        await pc.setRemoteDescription(msg.payload);
        await flushIce();
        setStatus('connecting');
        return;
      }

      if (msg.type === 'ice' && msg.payload) {
        if (!pc.remoteDescription) {
          pendingIce.push(msg.payload);
        } else {
          await pc.addIceCandidate(msg.payload);
        }
      }
    } catch (e) {
      const text = String(e?.message || e);
      // Benign races — don't spam the bar.
      if (/wrong state|stable|InvalidStateError|no pending remote|pending remote description/i.test(text)) {
        return;
      }
      setStatus(`signal-error: ${text}`);
    }
  }

  async function start() {
    setStatus('requesting-mic');
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    if (disposed) {
      localStream.getTracks().forEach((t) => t.stop());
      return;
    }
    pc = new RTCPeerConnection(ICE);
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      publish('ice', ev.candidate.toJSON());
    };
    pc.ontrack = (ev) => {
      const stream = ev.streams?.[0] || new MediaStream([ev.track]);
      onRemoteStream?.(stream);
      setStatus('connected');
    };
    pc.onconnectionstatechange = () => {
      const s = pc?.connectionState;
      if (s && s !== 'connecting') setStatus(s);
    };

    await stompSubscribe(signalDest, handleSignal);

    if (isHost) {
      setStatus('calling');
      // Offer once; also wait for guest `ready` to re-offer if they joined late.
      await sendOffer();
      if (!remoteReady) {
        // Guest may already be waiting — nudge again shortly.
        window.setTimeout(() => {
          if (!disposed && pc && pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
            sendOffer().catch(() => {});
          }
        }, 800);
      }
    } else {
      setStatus('waiting-offer');
      await publish('ready');
      // Re-announce ready in case host subscribed after our first ready.
      window.setTimeout(() => {
        if (!disposed) publish('ready');
      }, 600);
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

  return { start, stop, setMuted, isMuted };
}
