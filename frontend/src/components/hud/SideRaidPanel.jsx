import React, { useEffect, useState } from 'react';
import { useGameState } from '../../state/GameStateContext.jsx';
import { completeRaid } from '../../api.js';

/**
 * Submits the raid log once an outcome is set. No one-click Escape —
 * extraction is channeled at the south gate in StealthRaidView.
 */
export default function SideRaidPanel({
  lockedCamo,
  remaining,
  isAlarmTriggered,
  sessionLog,
  paintedTiles,
  searchlightLevel = 1,
  outcome,
  wallHits = 0,
  elapsedSeconds = 0,
}) {
  const { raidTargetId, userId, raidSession, showToast, setCoins, setInkEnergy } = useGameState();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!outcome || submitted) return;
    let cancelled = false;
    (async () => {
      setSubmitted(true);
      try {
        const payload = {
          attackerId: userId,
          defenderId: raidTargetId,
          durationSeconds: Math.max(1, Math.round(elapsedSeconds || 120 - (remaining || 0))),
          lockedCamoColor: raidSession?.camoColor || lockedCamo,
          tileColors: paintedTiles,
          searchlightLevel,
          sessionLog: sessionLog?.current || [],
          wallBreakEvents:
            wallHits > 0
              ? [{ wallBlockId: null, hits: wallHits, gateWasLocked: !!isAlarmTriggered }]
              : [],
          clientReportedOutcome: {
            isDetected: !!isAlarmTriggered || outcome === 'ESCAPED' || outcome === 'CAUGHT',
            outcome,
          },
        };
        const res = await completeRaid(payload);
        if (cancelled) return;
        const vo = res?.validatedOutcome;
        if (vo) {
          if (typeof res.attackerCoins === 'number') setCoins?.(res.attackerCoins);
          if (typeof res.attackerInk === 'number') setInkEnergy?.(res.attackerInk);
        }
      } catch (e) {
        if (!cancelled) showToast('Saved locally', 'info');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [outcome]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
