import React from 'react';
import { useGameState } from '../../state/GameStateContext.jsx';

export default function TopResourceBar() {
  const { userId, coins, inkEnergy, chips, camoColor, activePlotId } = useGameState();

  return (
    <div className="flex items-center gap-2 pointer-events-auto">
      {/* User ID */}
      <div className="glass-panel px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold text-slate-300">
        <span className="text-slate-400 font-semibold uppercase tracking-wider">User</span>
        <strong className="text-amber-400 font-heading">#{userId}</strong>
      </div>

      {/* Coins */}
      <div className="glass-panel px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-slate-300">
        <span className="text-slate-400 font-semibold uppercase tracking-wider">Coins</span>
        <strong className="text-amber-400 font-heading text-sm">{coins}</strong>
        <span>🪙</span>
      </div>

      {/* Ink */}
      <div className="glass-panel px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-slate-300">
        <span className="text-slate-400 font-semibold uppercase tracking-wider">Ink</span>
        <strong className="text-sky-400 font-heading text-sm">{inkEnergy}</strong>
        <span>✒️</span>
      </div>

      {/* Chips */}
      <div className="glass-panel px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-slate-300">
        <span className="text-slate-400 font-semibold uppercase tracking-wider">Chips</span>
        <strong className="text-emerald-400 font-heading text-sm">{chips}</strong>
        <span>💎</span>
      </div>

      {/* Camo Strategy */}
      <div className="glass-panel px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-slate-300 hidden md:flex">
        <span className="text-slate-400 font-semibold uppercase tracking-wider">Camo</span>
        <strong className="text-cyan-400 font-heading">{camoColor}</strong>
      </div>

      {/* Active Base Plot */}
      <div className="glass-panel px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-slate-300">
        <span className="text-slate-400 font-semibold uppercase tracking-wider">Base</span>
        <strong className="text-amber-400 font-heading">#{activePlotId}</strong>
      </div>
    </div>
  );
}
