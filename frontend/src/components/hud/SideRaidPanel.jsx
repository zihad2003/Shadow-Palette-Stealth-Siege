import React, { useState } from 'react';
import { Swords, DoorOpen } from 'lucide-react';
import { useGameState } from '../../state/GameStateContext.jsx';
import { completeRaid } from '../../api.js';
import { soundEngine } from '../../soundEngine.js';
import { DEFAULT_SEARCHLIGHT_LEVEL } from '../../raid/stealthConstants.js';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

export default function SideRaidPanel({
  lockedCamo,
  detectionState,
  meter,
  remaining,
  isAlarmTriggered,
  sessionLog,
  paintedTiles,
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
        durationSeconds: Math.round(90 - (remaining || 0)),
        lockedCamoColor: raidSession?.camoColor || lockedCamo,
        tileColors: paintedTiles,
        searchlightLevel: DEFAULT_SEARCHLIGHT_LEVEL,
        sessionLog: sessionLog?.current || [],
        clientReportedOutcome: {
          isDetected: !!isAlarmTriggered,
          outcome: isAlarmTriggered ? 'ESCAPED' : 'SILENT',
          chipsRequested: 200,
        },
      };
      const res = await completeRaid(payload);
      if (res.success && res.validatedOutcome) {
        soundEngine.playSuccessSound();
        showToast(`Server validated: ${res.validatedOutcome.outcome}`, 'success');
      }
    } catch (e) {
      showToast('Server offline — using local raid outcome', 'info');
    } finally {
      setIsSubmitting(false);
      if (onExtract) onExtract();
    }
  };

  return (
    <aside className="absolute top-20 right-5 z-50 w-64 flex flex-col gap-3 pointer-events-auto">
      <ClayPanel depth="deep" className="p-4 rounded-[24px] flex flex-col gap-3">
        <h3 className="text-xs font-heading font-bold text-clay-accent uppercase tracking-wider flex items-center gap-2">
          <Swords size={13} /> Stealth Raid
        </h3>

        <div className="clay-inset rounded-2xl p-3 flex flex-col gap-1">
          <p className="text-[10px] text-clay-muted uppercase tracking-wider">Locked camo</p>
          <p className="font-heading font-extrabold text-sm text-clay-text">{lockedCamo}</p>
          <p className="text-[10px] text-clay-muted">No color change in raid</p>
        </div>

        <div>
          <div className="flex items-center justify-between text-[10px] font-bold text-clay-muted mb-1">
            <span>{detectionState}</span>
            <span>{Math.round(meter || 0)}%</span>
          </div>
          <div className="h-2 rounded-full clay-inset overflow-hidden">
            <div
              className={`h-full rounded-full ${isAlarmTriggered ? 'bg-clay-danger' : 'bg-clay-accent'}`}
              style={{ width: `${Math.min(100, meter || 0)}%` }}
            />
          </div>
        </div>

        <ClayButton
          variant="success"
          disabled={isSubmitting}
          onClick={handleSubmitRaid}
          className={`w-full py-2.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-2 ${
            isAlarmTriggered ? 'clay-alarm' : ''
          }`}
        >
          <DoorOpen size={14} /> Extract
        </ClayButton>
      </ClayPanel>
    </aside>
  );
}
