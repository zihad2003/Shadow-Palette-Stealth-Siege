import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff } from 'lucide-react';
import { useGameState } from '../state/GameStateContext.jsx';
import { createDuoVoiceCall } from './voiceCall.js';
import { ensureStompConnected, stompSubscribe, stompUnsubscribe } from '../live/stompClient.js';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';

/**
 * Ultra-minimal PUBG / Battle Royale style in-game voice widget.
 * Floating compact controls with one-tap Mic & Speaker toggles.
 */
export default function DuoVoiceBar() {
  const { duoParty, userId, leaveDuoParty, showToast } = useGameState();
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const callRef = useRef(null);
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const partyId = duoParty?.partyId;
  const isHost = Number(duoParty?.hostId) === Number(userId);
  const partnerName =
    isHost ? duoParty?.guestName || `Player ${duoParty?.guestId}` : duoParty?.hostName || `Player ${duoParty?.hostId}`;

  const audioRef = useRef(null);

  useEffect(() => {
    if (!partyId || !userId) return undefined;
    let cancelled = false;
    let call = null;

    (async () => {
      try {
        await ensureStompConnected();
        if (cancelled) return;
        call = createDuoVoiceCall({
          partyId,
          userId,
          isHost,
          onStatus: (s) => !cancelled && setVoiceStatus(s),
          onRemoteStream: (stream) => {
            if (audioRef.current) {
              audioRef.current.srcObject = stream;
              audioRef.current.volume = 1.0;
              audioRef.current.muted = false;
              audioRef.current.play().catch(() => {});
            }
          },
        });
        callRef.current = call;
        await call.start();
      } catch (err) {
        if (!cancelled) {
          setVoiceStatus('mic-denied');
          showToastRef.current?.('Please allow microphone in browser for voice chat', 'error');
        }
      }
    })();

    // Continuous audio unlocker on any user interaction (essential for Chrome on Laptop/Desktop)
    const unlockAudio = () => {
      if (audioRef.current && audioRef.current.srcObject && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
      const extEl = document.getElementById('webrtc-duo-audio-el');
      if (extEl && extEl.srcObject && extEl.paused) {
        extEl.play().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      call?.stop();
      callRef.current = null;
      setVoiceStatus('idle');
    };
  }, [partyId, userId, isHost]);

  if (!duoParty || duoParty.status === 'ENDED') return null;

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    callRef.current?.setMuted(next);
    showToast(next ? 'Mic MUTED' : 'Mic ON', next ? 'error' : 'success');
  };

  const toggleDeafen = () => {
    const next = !deafened;
    setDeafened(next);
    callRef.current?.setDeafened(next);
    showToast(next ? 'Teammate DEAFENED' : 'Voice UNMUTED', next ? 'error' : 'success');
  };

  const isConnected = voiceStatus === 'connected';

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 sm:left-auto sm:right-28 sm:translate-x-0 z-[180] pointer-events-auto select-none">
      <div className="h-10 px-2.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 shadow-2xl flex items-center gap-2">
        {/* Connection status indicator */}
        <div className="flex items-center gap-1.5 pl-1 pr-1.5 border-r border-white/10">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                : 'bg-amber-400 animate-ping'
            }`}
          />
          <span className="text-[11px] font-mono font-medium text-white/90 max-w-[80px] truncate">
            {partnerName}
          </span>
        </div>

        {/* PUBG Minimal Mic Button */}
        <button
          onClick={toggleMute}
          title={muted ? 'Mic Off (Click to speak)' : 'Mic On (Click to mute)'}
          className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
            muted
              ? 'bg-red-500/80 text-white hover:bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
              : 'bg-emerald-500/90 text-black hover:bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
          }`}
        >
          {muted ? <MicOff size={13} strokeWidth={2.5} /> : <Mic size={13} strokeWidth={2.5} />}
        </button>

        {/* PUBG Minimal Speaker / Deafen Button */}
        <button
          onClick={toggleDeafen}
          title={deafened ? 'Muted (Click to listen)' : 'Listening (Click to mute teammate)'}
          className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
            deafened
              ? 'bg-red-500/80 text-white hover:bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
              : 'bg-white/15 text-white/90 hover:bg-white/25 hover:text-white'
          }`}
        >
          {deafened ? <VolumeX size={13} strokeWidth={2.5} /> : <Volume2 size={13} strokeWidth={2.5} />}
        </button>

        {/* Minimal Leave Button */}
        <button
          onClick={() => leaveDuoParty?.()}
          title="Disconnect duo"
          className="h-6 w-6 ml-0.5 rounded-full bg-white/5 hover:bg-red-500/30 text-white/60 hover:text-red-300 flex items-center justify-center transition-all"
        >
          <PhoneOff size={11} strokeWidth={2} />
        </button>
      </div>

      {/* Persistent DOM-mounted audio element for desktop Chrome audio output */}
      <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />
    </div>
  );
}

/** App-shell invite listener for incoming duo invites. */
export function DuoInviteListener() {
  const {
    userId,
    gameState,
    duoInvite,
    setDuoInvite,
    acceptDuoInvite,
    declineDuoInvite,
    showToast,
  } = useGameState();

  useEffect(() => {
    if (!userId) return undefined;
    if (gameState === 'SPLASH' || gameState === 'STORY' || gameState === 'MAIN_MENU') return undefined;
    let cancelled = false;
    (async () => {
      try {
        await ensureStompConnected();
        if (cancelled) return;
        await stompSubscribe(`/topic/duo-invite/${userId}`, (msg) => {
          if (!msg) return;
          if (msg.type === 'DUO_INVITE' || msg.message === 'INVITE_SENT') {
            setDuoInvite(msg);
            showToast?.('Duo raid invite', 'info');
          }
          if (msg.message === 'GUEST_ACCEPTED' || msg.message === 'ACCEPTED') {
            setDuoInvite(null);
          }
          if (msg.message === 'DECLINED' || msg.message === 'LEFT') {
            setDuoInvite(null);
          }
        });
      } catch {
        /* backend offline */
      }
    })();
    return () => {
      cancelled = true;
      stompUnsubscribe(`/topic/duo-invite/${userId}`);
    };
  }, [userId, gameState, setDuoInvite, showToast]);

  if (!duoInvite?.partyId) return null;
  if (gameState === 'STEALTH_RAID' || gameState === 'LIVE_DEFENSE') return null;

  return (
    <div className="fixed top-[4.75rem] left-1/2 -translate-x-1/2 z-[175] pointer-events-auto">
      <ClayPanel depth="deep" className="px-3 py-2.5 rounded-2xl flex items-center gap-3">
        <div>
          <p className="text-[12px] font-semibold text-clay-text">
            {duoInvite.hostName || 'A player'} wants a duo raid
          </p>
          <p className="text-[10px] text-clay-muted">Voice call + attack together</p>
        </div>
        <ClayButton variant="success" className="h-8 px-3 rounded-lg text-[11px]" onClick={() => acceptDuoInvite(duoInvite)}>
          Accept
        </ClayButton>
        <ClayButton variant="ghost" className="h-8 px-3 rounded-lg text-[11px]" onClick={() => declineDuoInvite(duoInvite)}>
          Decline
        </ClayButton>
      </ClayPanel>
    </div>
  );
}
