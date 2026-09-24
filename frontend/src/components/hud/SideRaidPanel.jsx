import React, { useState } from 'react';
import { DoorOpen } from 'lucide-react';
import { useGameState } from '../../state/GameStateContext.jsx';
import { completeRaid } from '../../api.js';
import { soundEngine } from '../../soundEngine.js';
import ClayButton from '../ui/ClayButton.jsx';

export default function SideRaidPanel({
  lockedCamo,
  remaining,
  isAlarmTriggered,
  sessionLog,
  paintedTiles,
  searchlightLevel = 1,
  onExtract,
}) {
  const { raidTargetId, userId, raidSession, showToast } = useGameState();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitRaid = async () => {
    soundEngine.playClickSound();
    setIsSubmitting(true);
    try {
      const payload = {
        attackerId: userId,
        defenderId: raidTargetId,
        durationSeconds: Math.round(120 - (remaining || 0)),
        lockedCamoColor: raidSession?.camoColor || lockedCamo,
        tileColors: paintedTiles,
        searchlightLevel,
        sessionLog: sessionLog?.current || [],
        clientReportedOutcome: {
          isDetected: !!isAlarmTriggered,
          outcome: isAlarmTriggered ? 'ESCAPED' : 'SILENT',
        },
      };
      await completeRaid(payload);
    } catch (e) {
      showToast('Saved locally', 'info');
    } finally {
      setIsSubmitting(false);
      if (onExtract) onExtract();
    }
  };

  return (
    <div className="absolute right-4 bottom-4 z-50 pointer-events-auto">
      <ClayButton
        variant="success"
        disabled={isSubmitting}
        onClick={handleSubmitRaid}
        className="h-11 px-4 rounded-2xl text-[11px] flex items-center gap-1.5"
      >
        <DoorOpen size={14} /> Extract
      </ClayButton>
    </div>
  );
}
