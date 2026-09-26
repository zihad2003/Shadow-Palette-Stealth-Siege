import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Users } from 'lucide-react';
import { useGameState } from '../state/GameStateContext.jsx';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import { createDuoVoiceCall } from './voiceCall.js';
import { ensureStompConnected, stompSubscribe, stompUnsubscribe } from '../live/stompClient.js';

/**
 * Voice bar + party strip while in a duo lobby or raid.
 */
export default function DuoVoiceBar() {
  const { duoParty, userId, leaveDuoParty, showToast } = useGameState();
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [muted, setMuted] = useState(false);
  const callRef = useRef(null);
  const audioRef = useRef(null);
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const partyId = duoParty?.partyId;
  const isHost = Number(duoParty?.hostId) === Number(userId);
  const partnerName =
    isHost ? duoParty?.guestName || `Player ${duoParty?.guestId}` : duoParty?.hostName || `Player ${duoParty?.hostId}`;

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
              audioRef.current.play().catch(() => {});
            }
          },
        });
        callRef.current = call;
        await call.start();
      } catch {
        if (!cancelled) {
          setVoiceStatus('mic-denied');
          showToastRef.current?.('Mic needed for duo call', 'error');
        }
      }
    })();

    return () => {
      cancelled = true;
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
  };

  const statusLabel = (() => {
    const s = String(voiceStatus || '');
    if (!s || s === 'idle') return '…';
    if (s === 'connected' || s === 'completed') return 'Connected';
    if (s === 'calling' || s === 'answering' || s === 'connecting' || s === 'waiting-offer') return 'Connecting…';
    if (s === 'requesting-mic') return 'Mic…';
    if (s === 'mic-denied') return 'Mic blocked';
    if (s.startsWith('signal-error')) return 'Reconnecting…';
    if (s === 'failed' || s === 'disconnected') return 'Reconnecting…';
    if (s === 'ended') return 'Ended';
    return s;
  })();
  const linked = voiceStatus === 'connected' || voiceStatus === 'completed';

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[165] pointer-events-auto">
      <audio ref={audioRef} autoPlay playsInline />
      <ClayPanel depth="deep" className="h-12 pl-3.5 pr-2 rounded-full flex items-center gap-2.5 shadow-lg border border-white/10">
        <div
          className={`h-2 w-2 rounded-full shrink-0 ${linked ? 'bg-emerald-400' : 'bg-clay-accent animate-pulse'}`}
        />
        <Users size={14} className="text-clay-accent shrink-0" />
        <div className="min-w-0 leading-tight">
          <p className="text-[12px] font-semibold text-clay-text truncate max-w-[9rem]">Duo · {partnerName}</p>
          <p className="text-[10px] text-clay-muted">{statusLabel}</p>
        </div>
        <div className="flex items-center gap-1.5 ml-1">
          <ClayButton
            variant={muted ? 'ghost' : 'primary'}
            className="!h-9 !w-9 !min-w-9 !p-0 !rounded-full !gap-0 shrink-0"
            onClick={toggleMute}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <MicOff size={15} strokeWidth={2.25} /> : <Mic size={15} strokeWidth={2.25} />}
          </ClayButton>
          <ClayButton
            variant="danger"
            className="!h-9 !w-9 !min-w-9 !p-0 !rounded-full !gap-0 shrink-0"
            title="Leave duo"
            onClick={() => leaveDuoParty?.()}
          >
            <PhoneOff size={15} strokeWidth={2.25} />
          </ClayButton>
        </div>
      </ClayPanel>
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
            // Host learns guest accepted — GameStateContext also polls/sets party
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
