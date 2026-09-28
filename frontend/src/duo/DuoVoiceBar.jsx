import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Volume1 } from 'lucide-react';
import { useGameState } from '../state/GameStateContext.jsx';
import { createDuoVoiceCall } from './voiceCall.js';
import { ensureStompConnected, stompSubscribe, stompUnsubscribe } from '../live/stompClient.js';
import ClayButton from '../components/ui/ClayButton.jsx';
import ClayPanel from '../components/ui/ClayPanel.jsx';

/**
 * Minimal in-game voice bar placed at `top-16 left-4` (under the header banner).
 * Features ONLY Mic On/Off and Sound On/Off with zero UI overlap.
 */
export default function DuoVoiceBar() {
  const { duoParty, userId, showToast } = useGameState();
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const partyId = duoParty?.partyId;
  const isHost = Number(duoParty?.hostId) === Number(userId);
  const partnerName = isHost ? duoParty?.guestName : duoParty?.hostName;

  const callRef = useRef(null);
  const audioRef = useRef(null);
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const partyId = duoParty?.partyId;
  const isHost = Number(duoParty?.hostId) === Number(userId);
  const fmtUid = (id) => String(id).padStart(5, '0');
  const partnerName =
    isHost ? duoParty?.guestName || `Player ${fmtUid(duoParty?.guestId)}` : duoParty?.hostName || `Player ${fmtUid(duoParty?.hostId)}`;
  const bothInLobby =
    !!duoParty?.partyId &&
    duoParty.status !== 'ENDED' &&
    (duoParty.guestJoined || duoParty.status === 'IN_RAID');

  useEffect(() => {
    if (!bothInLobby || !userId) return undefined;
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
              audioRef.current.volume = deafened ? 0 : 1.0;
              audioRef.current.muted = deafened;
              const p = audioRef.current.play();
              if (p !== undefined) {
                p.then(() => setAutoplayBlocked(false))
                  .catch((err) => {
                    console.warn('[Voice] Audio autoplay waiting for gesture:', err);
                    setAutoplayBlocked(true);
                  });
              }
            }
          },
        });
        callRef.current = call;
        await call.start();
      } catch (err) {
        if (!cancelled) {
          setVoiceStatus('mic-denied');
          showToastRef.current?.('Please allow microphone in browser', 'error');
        }
      }
    })();

    // Continuous audio unlocker on any mouse click or keyboard interaction (essential for laptops)
    const unlockAudio = () => {
      if (audioRef.current && audioRef.current.srcObject && audioRef.current.paused) {
        audioRef.current
          .play()
          .then(() => setAutoplayBlocked(false))
          .catch(() => {});
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
      setAutoplayBlocked(false);
    };
  }, [partyId, userId, isHost, deafened, bothInLobby]);

  if (!bothInLobby) return null;

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
    if (audioRef.current) {
      audioRef.current.muted = next;
      audioRef.current.volume = next ? 0 : 1.0;
    }
    showToast(next ? 'Sound MUTED' : 'Sound ON', next ? 'error' : 'success');
  };

  const handleManualUnmuteClick = (e) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => setAutoplayBlocked(false))
        .catch(() => {});
    }
  };

  const isConnected = voiceStatus === 'connected';

  return (
    <div className="fixed top-16 left-4 z-[180] pointer-events-auto select-none">
      <div className="h-9 px-2.5 rounded-full bg-black/80 backdrop-blur-md border border-white/15 shadow-xl flex items-center gap-2">
        {/* Status indicator & partner name */}
        <div className="flex items-center gap-1.5 pr-2 border-r border-white/10">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                : 'bg-amber-400 animate-ping'
            }`}
          />
          <span className="text-[11px] font-mono font-medium text-white/90 max-w-[85px] truncate">
            {partnerName}
          </span>
        </div>

        {/* Mic Toggle Button */}
        <button
          onClick={toggleMute}
          title={muted ? 'Mic Off (Click to speak)' : 'Mic On (Click to mute)'}
          className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
            muted
              ? 'bg-red-500/80 text-white hover:bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
              : 'bg-emerald-500/90 text-black hover:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
          }`}
        >
          {muted ? <MicOff size={12} strokeWidth={2.5} /> : <Mic size={12} strokeWidth={2.5} />}
        </button>

        {/* Sound / Speaker Toggle Button */}
        <button
          onClick={toggleDeafen}
          title={deafened ? 'Sound Muted (Click to listen)' : 'Sound On (Click to mute teammate)'}
          className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
            deafened
              ? 'bg-red-500/80 text-white hover:bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
              : 'bg-white/15 text-white/90 hover:bg-white/25 hover:text-white'
          }`}
        >
          {deafened ? <VolumeX size={12} strokeWidth={2.5} /> : <Volume2 size={12} strokeWidth={2.5} />}
        </button>

        {/* Autoplay unlock pill if browser blocked initial sound */}
        {autoplayBlocked && (
          <button
            onClick={handleManualUnmuteClick}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse hover:bg-amber-500/30"
            title="Click to enable incoming voice"
          >
            <Volume1 size={11} />
            <span>Click to hear</span>
          </button>
        )}
      </div>

      {/* Rendered audio element (positioned off-screen so Chromium never throttles layout rendering) */}
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
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
