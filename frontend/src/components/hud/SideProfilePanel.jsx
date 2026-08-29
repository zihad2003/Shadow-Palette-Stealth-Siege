import React, { useState } from 'react';
import { useGameState } from '../../state/GameStateContext.jsx';
import { soundEngine } from '../../soundEngine.js';

export default function SideProfilePanel() {
  const { userId, setUserId, showToast, transitionTo, activePlotId } = useGameState();
  const [tempUserId, setTempUserId] = useState(userId);

  const handleSwitchUser = () => {
    soundEngine.playClickSound();
    if (tempUserId > 0) {
      setUserId(tempUserId);
      showToast(`Switched Active Operative to #${tempUserId}`, 'info');
    }
  };

  return (
    <aside className="absolute top-20 right-5 z-40 w-64 flex flex-col gap-3 pointer-events-auto">
      {/* Operative Profile Card */}
      <div className="glass-panel-deep p-3.5 rounded-2xl flex flex-col gap-2.5 shadow-glassDeep">
        <h3 className="text-xs font-heading font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>👤</span> Operative Profile
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={tempUserId}
            onChange={(e) => setTempUserId(parseInt(e.target.value, 10) || 1)}
            min="1"
            className="w-16 px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-white text-center font-bold text-xs"
          />
          <button
            onClick={handleSwitchUser}
            className="flex-1 py-1 px-3 rounded-lg font-heading font-bold text-xs bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-all"
          >
            Switch ID
          </button>
        </div>
      </div>

      {/* Quick Launch Raid Card */}
      <div className="glass-panel-deep p-3.5 rounded-2xl flex flex-col gap-2.5 shadow-glassDeep">
        <h3 className="text-xs font-heading font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>⚔️</span> Sector Infiltration
        </h3>
        <p className="text-[11px] text-slate-400">
          Target and infiltrate neighboring sector fortress bases in grayscale stealth mode.
        </p>
        <button
          onClick={() => transitionTo('STEALTH_RAID', { defenderId: 34 })}
          className="w-full py-2 px-3 rounded-xl font-heading font-bold text-xs bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white transition-all shadow-[0_4px_16px_rgba(244,63,94,0.4)]"
        >
          ⚔️ Launch Stealth Raid
        </button>
      </div>
    </aside>
  );
}
