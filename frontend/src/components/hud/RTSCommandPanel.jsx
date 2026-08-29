import React from 'react';
import { useGameState } from '../../state/GameStateContext.jsx';

export default function RTSCommandPanel() {
  const { selectedPlot, userId, handleClaimPlot, transitionTo } = useGameState();

  if (!selectedPlot) return null;

  const isSelf = selectedPlot.ownerId === userId;
  const isClaimed = selectedPlot.status === 'CLAIMED_SELF' || selectedPlot.status === 'CLAIMED_ENEMY';

  return (
    <div className="absolute bottom-5 left-5 z-40 w-72 glass-panel-deep p-3.5 rounded-2xl flex items-center gap-3 shadow-glassDeep pointer-events-auto border border-amber-400/20">
      {/* Unit / Plot Portrait */}
      <div className="w-14 h-14 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center relative shadow-inner">
        <span className="text-2xl">{isSelf ? '👑' : (isClaimed ? '🏰' : '🟩')}</span>
        <span className="absolute -bottom-1.5 px-1.5 py-0.5 rounded bg-amber-400 text-black font-heading font-extrabold text-[9px]">
          LVL 1
        </span>
      </div>

      {/* Plot Info & Actions */}
      <div className="flex-1 flex flex-col gap-1">
        <h4 className="font-heading font-bold text-xs text-amber-400 tracking-wide uppercase">
          Sector Plot #{selectedPlot.id}
        </h4>
        <p className="text-[11px] text-slate-300">
          {isSelf
            ? 'Your Operational Fortress Base'
            : (isClaimed ? `Occupied by User #${selectedPlot.ownerId}` : 'Unclaimed Fertile Territory')}
        </p>

        {/* Action Button */}
        {isSelf ? (
          <button
            onClick={() => transitionTo('BASE_BUILDER', { plotId: selectedPlot.id })}
            className="mt-1 py-1 px-2 rounded-lg font-heading font-bold text-[10px] bg-sky-500/20 text-sky-300 border border-sky-400/30 hover:bg-sky-500/30 transition-all text-center"
          >
            🏗️ Open Base Builder
          </button>
        ) : (
          !isClaimed ? (
            <button
              onClick={() => handleClaimPlot(selectedPlot.id)}
              className="mt-1 py-1 px-2 rounded-lg font-heading font-bold text-[10px] bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/35 transition-all text-center"
            >
              🚩 Claim This Plot
            </button>
          ) : (
            <button
              onClick={() => transitionTo('STEALTH_RAID', { defenderId: selectedPlot.ownerId })}
              className="mt-1 py-1 px-2 rounded-lg font-heading font-bold text-[10px] bg-rose-500/20 text-rose-300 border border-rose-400/30 hover:bg-rose-500/30 transition-all text-center"
            >
              ⚔️ Infiltrate Base
            </button>
          )
        )}
      </div>
    </div>
  );
}
