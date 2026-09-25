import React, { useEffect, useRef, useState } from 'react';
import { useGameState } from '../state/GameStateContext.jsx';
import { ensureStompConnected, stompSubscribe, stompUnsubscribe } from './stompClient.js';
import ClayPanel from '../components/ui/ClayPanel.jsx';

/**
 * App-shell listener: keeps STOMP subscribed to /topic/raid-invite/{userId}
 * so defenders get notified on any authenticated screen.
 */
export default function LiveRaidInviteListener() {
  const {
    userId,
    gameState,
    liveRaidInvite,
    setLiveRaidInvite,
    acceptLiveRaidDefense,
    dismissLiveRaidInvite,
    showToast,
  } = useGameState();

  const [secondsLeft, setSecondsLeft] = useState(0);
  const subRef = useRef(null);

  useEffect(() => {
    if (!userId) return undefined;
    if (gameState === 'SPLASH' || gameState === 'STORY' || gameState === 'MAIN_MENU') return undefined;

    let cancelled = false;
    (async () => {
      try {
        await ensureStompConnected();
        if (cancelled) return;
        subRef.current = await stompSubscribe(`/topic/raid-invite/${userId}`, (msg) => {
          if (!msg || msg.type !== 'RAID_INVITE') return;
          if (Number(msg.defenderUserId) !== Number(userId)) return;
          setLiveRaidInvite({
            raidId: msg.raidId,
            attackerUserId: msg.attackerUserId,
            attackerName: msg.attackerName || `Player${msg.attackerUserId}`,
            joinDeadline: msg.joinDeadline,
            joinSeconds: msg.joinSeconds || 15,
            receivedAt: Date.now(),
          });
          showToast?.('Your base is under raid!', 'error');
        });
      } catch {
        // Backend offline — async raids still work without live invites.
      }
    })();

    return () => {
      cancelled = true;
      stompUnsubscribe(`/topic/raid-invite/${userId}`);
      subRef.current = null;
    };
  }, [userId, gameState, setLiveRaidInvite, showToast]);

  useEffect(() => {
    if (!liveRaidInvite?.joinDeadline && !liveRaidInvite?.receivedAt) {
      setSecondsLeft(0);
      return undefined;
    }
    const tick = () => {
      let end = liveRaidInvite.receivedAt
        ? liveRaidInvite.receivedAt + (liveRaidInvite.joinSeconds || 15) * 1000
        : Date.parse(liveRaidInvite.joinDeadline);
      if (!Number.isFinite(end)) end = Date.now() + 15000;
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) dismissLiveRaidInvite?.();
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [liveRaidInvite, dismissLiveRaidInvite]);

  if (!liveRaidInvite || gameState === 'LIVE_DEFENSE' || gameState === 'STEALTH_RAID') return null;

  return (
    <div className="absolute inset-x-0 top-20 z-[80] flex justify-center pointer-events-none px-4">
      <ClayPanel depth="deep" className="pointer-events-auto px-4 py-3 rounded-2xl max-w-md w-full flex flex-col gap-2">
        <p className="text-[12px] font-heading font-semibold text-clay-text">
          {liveRaidInvite.attackerName} is raiding your base
        </p>
        <p className="text-[11px] text-clay-muted">Join to control the patrol robot · {secondsLeft}s</p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="px-3 py-1.5 text-[11px] rounded-xl clay-inset text-clay-muted"
            onClick={() => dismissLiveRaidInvite?.()}
          >
            Ignore
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-[11px] rounded-xl bg-clay-accent text-white font-semibold"
            onClick={() => acceptLiveRaidDefense?.(liveRaidInvite)}
          >
            Join
          </button>
        </div>
      </ClayPanel>
    </div>
  );
}
