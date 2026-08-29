import React from 'react';
import { useGameState } from '../../state/GameStateContext.jsx';

export default function NavigationTabs() {
  const { gameState, transitionTo, setIsOptionsOpen } = useGameState();

  const tabs = [
    { key: 'WORLD_MAP', label: '🗺️ World Map' },
    { key: 'BASE_BUILDER', label: '🏗️ Base Builder' },
    { key: 'STEALTH_RAID', label: '⚔️ Stealth Raid' },
  ];

  return (
    <nav className="glass-panel p-1 rounded-2xl flex items-center gap-1 pointer-events-auto">
      {tabs.map((tab) => {
        const isActive = gameState === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => transitionTo(tab.key)}
            className={`px-4 py-2 rounded-xl font-heading text-xs md:text-sm font-bold transition-all duration-300 flex items-center gap-1.5 ${
              isActive
                ? 'bg-gradient-to-r from-sky-500/40 to-sky-600/30 text-white border border-sky-400/50 shadow-neonCyan'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        );
      })}

      {/* Options Tab */}
      <button
        onClick={() => setIsOptionsOpen(true)}
        className="px-3 py-2 rounded-xl font-heading text-xs md:text-sm font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 transition-all duration-300"
      >
        ⚙️
      </button>
    </nav>
  );
}
