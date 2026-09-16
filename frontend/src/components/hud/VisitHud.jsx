import React from 'react';
import { Car, Users, LogOut } from 'lucide-react';
import { useGameState, CART_PARTS, WHEEL_PART_IDS, BODY_PART_IDS } from '../../state/GameStateContext.jsx';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';
import { cartPartById } from '../../gamemap/paletteBuggy.js';
import { GAME_COLORS } from '../../colors.js';

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
    visitSession,
    visitRole,
    isVisitGuest,
    invitePlayer,
    acceptPendingInvite,
    declinePendingInvite,
    endVisit,
    bumpBuggyGear,
  } = useGameState();

  if (gameState === 'STEALTH_RAID' || gameState === 'SPLASH' || gameState === 'STORY') return null;

  const showParts = gameState === 'BASE_BUILDER' && !isVisitGuest;
  const showRide = gameState === 'BASE_BUILDER' && buggySeated;
  const showVisitBanner = gameState === 'BASE_BUILDER' && visitSession;
  const wheelsOn = mountedParts.filter((id) => WHEEL_PART_IDS.includes(id)).length;
  const bodyOn = mountedParts.filter((id) => BODY_PART_IDS.includes(id)).length;
  const wheels = CART_PARTS.filter((p) => p.kind === 'wheel');
  const bodies = CART_PARTS.filter((p) => p.kind === 'body');

  return (
    <>
      {pendingInvite && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[170] pointer-events-auto w-[min(420px,92vw)]">
          <ClayPanel depth="deep" className="p-4 rounded-3xl flex flex-col gap-3">
            <p className="font-heading font-bold text-sm text-clay-text text-center">
              {pendingInvite.hostName || 'A player'} invites you to their fortress
            </p>
            <p className="text-[11px] text-clay-muted text-center">
              Friendly visit · color world · 45s to accept
            </p>
            <div className="flex gap-2">
              <ClayButton variant="success" className="flex-1 rounded-2xl py-2 text-xs" onClick={() => acceptPendingInvite(pendingInvite)}>
                Accept
              </ClayButton>
              <ClayButton variant="ghost" className="flex-1 rounded-2xl py-2 text-xs" onClick={() => declinePendingInvite(pendingInvite)}>
                Decline
              </ClayButton>
            </div>
          </ClayPanel>
        </div>
      )}

      {showVisitBanner && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[120] pointer-events-auto">
          <ClayPanel className="px-4 py-2 rounded-full flex items-center gap-3">
            <Users size={14} className="text-clay-accent" />
            <span className="text-[11px] font-bold">
              {isVisitGuest
                ? `Visiting ${visitSession.hostName} · no paint`
                : `Guest: ${visitSession.guestName}`}
            </span>
            <ClayButton
              variant="danger"
              className="h-7 px-3 rounded-full text-[10px] flex items-center gap-1"
              onClick={() => endVisit()}
            >
              <LogOut size={12} />
              {isVisitGuest ? 'Leave' : 'Kick'}
            </ClayButton>
          </ClayPanel>
        </div>
      )}

      {showParts && (
        <div className="absolute bottom-24 left-4 z-40 pointer-events-none">
          <ClayPanel className="px-3 py-2 rounded-2xl min-w-[188px]">
            <div className="flex items-center gap-2 mb-1">
              <Car size={14} className="text-clay-accent" />
              <span className="text-[11px] font-heading font-bold">
                Wheels {wheelsOn}/4 · Body {bodyOn}/5
                {missingPartLabel ? ` · ${missingPartLabel}` : garageComplete ? ' · Sit (E)' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1 mb-1">
              {wheels.map((p) => {
                const on = mountedParts.includes(p.id);
                const carrying = carriedPart === p.id;
                return (
                  <span
                    key={p.id}
                    title={p.label}
                    className={`block w-3.5 h-3.5 rounded-full ${carrying ? 'ring-2 ring-clay-text' : ''}`}
                    style={{
                      backgroundColor: '#2c2c2c',
                      boxShadow: on || carrying ? 'inset 0 0 0 2px #C0392B' : 'none',
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
                    className={`block w-3.5 h-3.5 rounded-sm ${carrying ? 'ring-2 ring-clay-text' : ''}`}
                    style={{
                      backgroundColor: GAME_COLORS[p.color],
                      opacity: on || carrying ? 1 : 0.28,
                    }}
                  />
                );
              })}
            </div>
            {carriedPart ? (
              <p className="text-[10px] text-clay-muted mt-1">
                Carrying {cartPartById(carriedPart)?.label} · Hold F at garage
                {mountProgress > 0.02 ? ` · ${Math.round(mountProgress * 100)}%` : ''}
              </p>
            ) : !garageComplete ? (
              <p className="text-[10px] text-clay-muted mt-1">
                Hunt 4 wheels + 5 color skins · walk onto one, carry to garage, Hold F
              </p>
            ) : null}
          </ClayPanel>
        </div>
      )}

      {showRide && (
        <div className="absolute bottom-24 right-4 z-40 pointer-events-auto w-[220px]">
          <ClayPanel depth="deep" className="p-3 rounded-3xl flex flex-col gap-2">
            <p className="font-heading font-bold text-[11px] uppercase tracking-wider text-clay-accent">
              Palette buggy · Gear {buggyGear}
            </p>
            {visitRole !== 'guest' && (
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((g) => (
                  <ClayButton
                    key={g}
                    variant={buggyGear === g ? 'primary' : 'ghost'}
                    className="flex-1 h-8 rounded-xl text-[10px]"
                    onClick={() => bumpBuggyGear(g - buggyGear)}
                  >
                    {g === 0 ? 'P' : g}
                  </ClayButton>
                ))}
              </div>
            )}
            {buggySeated && visitRole !== 'guest' && (
              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                <p className="text-[10px] text-clay-muted">Online</p>
                {(onlinePlayers || []).length === 0 && (
                  <p className="text-[10px] text-clay-muted">No other heartbeats yet</p>
                )}
                {(onlinePlayers || []).map((p) => (
                  <div key={p.userId} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold truncate">{p.username}</span>
                    <ClayButton
                      variant="success"
                      className="h-6 px-2 rounded-lg text-[10px]"
                      onClick={() => invitePlayer(p.userId)}
                    >
                      Invite
                    </ClayButton>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-clay-muted">
              {visitRole === 'guest' ? 'E / Leave to stand' : 'W/S gear · E stand at park'}
            </p>
          </ClayPanel>
        </div>
      )}
    </>
  );
}
