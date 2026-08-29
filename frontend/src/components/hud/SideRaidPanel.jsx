import React, { useState } from 'react';
import { useGameState } from '../../state/GameStateContext.jsx';
import { completeRaid } from '../../api.js';
import { soundEngine } from '../../soundEngine.js';

export default function SideRaidPanel({ onHitWall, wallHits, isEscaped }) {
  const { raidTargetId, setRaidTargetId, transitionTo, userId, showToast, chips, setChips } = useGameState();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitRaid = async () => {
    soundEngine.playClickSound();
    setIsSubmitting(true);
    try {
      const payload = {
        attackerId: userId,
        defenderId: raidTargetId,
        durationSeconds: 45,
        wallBreakEvents: [{ wallBlockId: 9, hits: wallHits || 4, gateWasLocked: true }],
        sessionLog: [{ tick: 0, xPos: 10, yPos: 19 }],
        clientReportedOutcome: {
          isDetected: true,
          outcome: isEscaped ? 'ESCAPED' : 'CAUGHT',
          chipsRequested: isEscaped ? 300 : 0,
        },
      };

      const res = await completeRaid(payload);
      if (res.success && res.validatedOutcome) {
        soundEngine.playSuccessSound();
        showToast(
          `Raid Validated! Outcome: ${res.validatedOutcome.outcome} | Chips Awarded: +${res.validatedOutcome.chipsAwarded} 💎`,
          'success'
        );
        setChips((prev) => prev + (res.validatedOutcome.chipsAwarded || 0));
        transitionTo('WORLD_MAP');
      }
    } catch (e) {
      showToast(`Raid Submission Failed: ${e.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="absolute top-20 right-5 z-50 w-64 flex flex-col gap-3 pointer-events-auto">
      <div className="glass-panel-deep p-4 rounded-2xl flex flex-col gap-3 shadow-glassDeep">
        <h3 className="text-xs font-heading font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <span>⚔️</span> Stealth Raid Controls
        </h3>

        {/* Defender ID input */}
        <div className="flex items-center justify-between text-xs text-slate-300">
          <label className="text-slate-400">Target User ID:</label>
          <input
            type="number"
            value={raidTargetId}
            onChange={(e) => setRaidTargetId(parseInt(e.target.value, 10) || 1)}
            min="1"
            className="w-16 px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-white text-center font-bold"
          />
        </div>

        {/* Hit Gate Wall Button */}
        <button
          onClick={onHitWall}
          className="w-full py-2.5 px-3 rounded-xl font-heading font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2 shadow-neonGold"
        >
          <span>🔨</span> Hit Gate Wall ({wallHits || 0}/4)
        </button>

        {/* Submit & Complete Raid */}
        <button
          disabled={isSubmitting}
          onClick={handleSubmitRaid}
          className="w-full py-2.5 px-3 rounded-xl font-heading font-bold text-xs bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 transition-all flex items-center justify-center gap-2 shadow-neonEmerald disabled:opacity-50"
        >
          <span>✅</span> Extract & Complete Raid
        </button>
      </div>
    </aside>
  );
}
