import React, { useEffect, useRef, useState } from 'react';
import { Car, Users, LogOut } from 'lucide-react';
import { useGameState, CART_PARTS, WHEEL_PART_IDS, BODY_PART_IDS } from '../../state/GameStateContext.jsx';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';
import { GAME_COLORS } from '../../colors.js';

function chatLines(raw) {
  return (Array.isArray(raw) ? raw : []).map((line, index) => {
    const parts = String(line).split('|');
    if (parts.length < 4) return null;
    return {
      key: `${parts[0]}-${index}`,
      userId: parts[1],
      name: parts[2] || 'Player',
      text: parts.slice(3).join('|'),
    };
  }).filter(Boolean);
}

export default function VisitHud() {
  const {
    gameState,
    mountedParts,
    carriedPart,
    garageComplete,
    mountProgress,
    missingPartLabel,
    buggySeated,
    buggyGear,
    onlinePlayers,
    pendingInvite,
    rideInviteOpen,
    closeRideInvite,
    openRideInvite,
    visitSession,
    visitRole,
    isVisitGuest,
    invitePlayer,
    acceptPendingInvite,
    declinePendingInvite,
    endVisit,
    bumpBuggyGear,
    sendVisitReaction,
    sendVisitChat,
    userId,
  } = useGameState();
  const [sentIds, setSentIds] = useState({});
  const [draft, setDraft] = useState('');
  const logRef = useRef(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visitSession?.chat]);

  if (
    gameState === 'STEALTH_RAID' ||
    gameState === 'SPLASH' ||
    gameState === 'STORY' ||
    gameState === 'INTRO_FORTRESS' ||
    gameState === 'INTRO_COLOR' ||
    gameState === 'INTRO_RAID' ||
    gameState === 'MAIN_MENU' ||
    gameState === 'PAINT_TUTORIAL'
  )
    return null;

  const showParts = gameState === 'BASE_BUILDER' && !isVisitGuest;
  const showRide = gameState === 'BASE_BUILDER' && buggySeated;
  const showVisitBanner = gameState === 'BASE_BUILDER' && visitSession;
  const showInvite =
    gameState === 'BASE_BUILDER' && rideInviteOpen && buggySeated && !isVisitGuest && !visitSession;
  const wheelsOn = mountedParts.filter((id) => WHEEL_PART_IDS.includes(id)).length;
  const bodyOn = mountedParts.filter((id) => BODY_PART_IDS.includes(id)).length;
  const wheels = CART_PARTS.filter((p) => p.kind === 'wheel');
  const bodies = CART_PARTS.filter((p) => p.kind === 'body');
  const players = onlinePlayers || [];
  const messages = chatLines(visitSession?.chat);

  const submitChat = (event) => {
    event?.preventDefault?.();
    if (!sendVisitChat(draft)) return;
    setDraft('');
  };

  const sendInvite = async (player) => {
    const ok = await invitePlayer(player.userId);
    if (ok) setSentIds((prev) => ({ ...prev, [player.userId]: true }));
  };

  return (
    <>
      {pendingInvite && (
        <div className="fixed top-[4.75rem] left-1/2 -translate-x-1/2 z-[170] pointer-events-auto">
          <ClayPanel depth="deep" className="px-3 py-2.5 rounded-2xl flex items-center gap-3">
            <div>
              <p className="text-[12px] font-semibold text-clay-text">
                {pendingInvite.hostName || 'A player'} invited you
              </p>
              <p className="text-[10px] text-clay-muted">Accept to enter their base</p>
            </div>
            <ClayButton variant="success" className="h-8 px-3 rounded-lg text-[11px]" onClick={() => acceptPendingInvite(pendingInvite)}>
              Accept
            </ClayButton>
            <ClayButton variant="ghost" className="h-8 px-3 rounded-lg text-[11px]" onClick={() => declinePendingInvite(pendingInvite)}>
              Decline
            </ClayButton>
          </ClayPanel>
        </div>
      )}

      {showInvite && (
        <div className="fixed right-4 bottom-[5.5rem] z-[160] pointer-events-auto w-60 max-h-[min(18rem,42vh)] overflow-y-auto">
          <ClayPanel depth="deep" className="px-3 py-3 rounded-2xl">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[12px] font-semibold text-clay-text">Invite a player</p>
              <ClayButton variant="ghost" className="h-6 px-2 rounded-lg text-[10px]" onClick={closeRideInvite}>
                Close
              </ClayButton>
            </div>
            <p className="text-[10px] text-clay-muted mb-2">Friendly visit. They can look and talk, not change your base.</p>
            {players.length === 0 ? (
              <p className="text-[11px] text-clay-muted py-1">No other players online</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {players.map((p) => (
                  <div key={p.userId} className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-clay-text truncate">{p.username || `Player ${String(p.userId).padStart(5, '0')}`}</span>
                    <ClayButton
                      variant={sentIds[p.userId] ? 'ghost' : 'success'}
                      className="h-7 px-2.5 rounded-lg text-[10px]"
                      onClick={() => sendInvite(p)}
                    >
                      {sentIds[p.userId] ? 'Sent' : 'Invite'}
                    </ClayButton>
                  </div>
                ))}
              </div>
            )}
          </ClayPanel>
        </div>
      )}

      {showVisitBanner && (
        <div className="fixed top-[4.75rem] left-1/2 -translate-x-1/2 z-[120] pointer-events-auto">
          <ClayPanel className="h-11 px-3 rounded-2xl flex items-center gap-2">
            <Users size={13} className="text-clay-accent" />
            <span className="text-[11px] font-semibold">
              Friendly · {isVisitGuest ? visitSession.hostName : visitSession.guestName}
            </span>
            <ClayButton
              variant="danger"
              className="h-7 px-2.5 rounded-lg text-[10px] flex items-center gap-1"
              onClick={() => endVisit()}
            >
              <LogOut size={11} />
              {isVisitGuest ? 'Leave' : 'Kick'}
            </ClayButton>
            {isVisitGuest && (
              <>
                <span className="w-px h-4 bg-clay-muted/40 mx-1" />
                <ClayButton variant="ghost" className="h-7 px-2 rounded-lg text-[14px]" onClick={() => sendVisitReaction('heart')}>❤️</ClayButton>
                <ClayButton variant="ghost" className="h-7 px-2 rounded-lg text-[14px]" onClick={() => sendVisitReaction('clap')}>👏</ClayButton>
              </>
            )}
          </ClayPanel>
        </div>
      )}

      {showVisitBanner && (
        <div className="fixed left-4 bottom-[8.75rem] z-[150] pointer-events-auto w-64">
          <ClayPanel depth="deep" className="px-2.5 py-2 rounded-2xl">
            <p className="text-[10px] font-semibold text-clay-muted px-1 pb-1">Talk</p>
            <div ref={logRef} className="max-h-28 overflow-y-auto flex flex-col gap-1 px-1">
              {messages.length === 0 ? (
                <p className="text-[11px] text-clay-muted py-1">Say hello</p>
              ) : (
                messages.map((line) => {
                  const mine = Number(line.userId) === Number(userId);
                  return (
                    <p key={line.key} className="text-[11px] leading-snug text-clay-text break-words">
                      <span className={mine ? 'text-clay-accent font-semibold' : 'font-semibold'}>{line.name}: </span>
                      {line.text}
                    </p>
                  );
                })
              )}
            </div>
            <form className="mt-1.5 flex gap-1" onSubmit={submitChat}>
              <input
                value={draft}
                maxLength={80}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Message"
                className="min-w-0 flex-1 h-8 px-2 rounded-lg bg-black/25 text-[12px] text-clay-text outline-none"
              />
              <ClayButton type="submit" variant="primary" className="h-8 px-2.5 rounded-lg text-[10px]">
                Send
              </ClayButton>
            </form>
          </ClayPanel>
        </div>
      )}

      {showParts && (
        <div className="absolute left-4 bottom-[4.5rem] z-40 pointer-events-none">
          <ClayPanel className="h-11 px-3 rounded-2xl flex items-center gap-2">
            <Car size={13} className="text-clay-accent" />
            <span className="text-[11px] font-heading font-semibold whitespace-nowrap">
              {wheelsOn}/4 · {bodyOn}/5
            </span>
            <div className="flex items-center gap-1">
              {wheels.map((p) => {
                const on = mountedParts.includes(p.id);
                const carrying = carriedPart === p.id;
                return (
                  <span
                    key={p.id}
                    title={p.label}
                    className={`block w-2.5 h-2.5 rounded-full ${carrying ? 'ring-1 ring-clay-text' : ''}`}
                    style={{
                      backgroundColor: '#2c2c2c',
                      boxShadow: on || carrying ? 'inset 0 0 0 1.5px #C0392B' : 'none',
                      opacity: on || carrying ? 1 : 0.28,
                    }}
                  />
                );
              })}
              <span className="w-px h-3 bg-clay-muted/40 mx-0.5" />
              {bodies.map((p) => {
                const on = mountedParts.includes(p.id);
                const carrying = carriedPart === p.id;
                return (
                  <span
                    key={p.id}
                    title={p.label}
                    className={`block w-2.5 h-2.5 rounded-sm ${carrying ? 'ring-1 ring-clay-text' : ''}`}
                    style={{
                      backgroundColor: GAME_COLORS[p.color],
                      opacity: on || carrying ? 1 : 0.28,
                    }}
                  />
                );
              })}
            </div>
            <span className="text-[10px] text-clay-muted whitespace-nowrap">
              {carriedPart
                ? mountProgress > 0.02
                  ? `${Math.round(mountProgress * 100)}%`
                  : 'Hold F'
                : garageComplete
                  ? buggySeated
                    ? 'F stand'
                    : 'F enter'
                  : (typeof missingPartLabel === 'function' ? missingPartLabel() : missingPartLabel) || ''}
            </span>
          </ClayPanel>
        </div>
      )}

      {showRide && (
        <div className="absolute right-4 bottom-4 z-40 pointer-events-auto">
          <ClayPanel depth="deep" className="h-11 px-2.5 rounded-2xl flex items-center gap-2">
            <span className="text-[11px] font-heading font-semibold text-clay-text whitespace-nowrap">G{buggyGear}</span>
            {visitRole !== 'guest' && (
              <div className="flex gap-0.5">
                {[0, 1, 2, 3].map((g) => (
                  <ClayButton
                    key={g}
                    variant={buggyGear === g ? 'primary' : 'ghost'}
                    className="w-7 h-7 rounded-lg text-[10px]"
                    onClick={() => bumpBuggyGear(g - buggyGear)}
                  >
                    {g === 0 ? 'P' : g}
                  </ClayButton>
                ))}
              </div>
            )}
            {visitRole !== 'guest' && !visitSession && (
              <ClayButton variant="success" className="h-7 px-2 rounded-lg text-[10px]" onClick={openRideInvite}>
                Invite
              </ClayButton>
            )}
          </ClayPanel>
        </div>
      )}
    </>
  );
}
