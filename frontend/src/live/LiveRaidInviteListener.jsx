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
            attackerName: msg.attackerName || `Player${String(msg.attackerUserId).padStart(5, '0')}`,
            joinDeadline: msg.joinDeadline,
            joinSeconds: msg.joinSeconds || 15,
            receivedAt: Date.now(),
          });
          // Silent raid: do not inform the base owner with toasts or popups
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
  }, [userId, gameState, setLiveRaidInvite]);

  // Silent stealth raid: owner is present in base and catches intruder with their own character
  return null;
}
