import React, { useState } from 'react';
import { User, Swords } from 'lucide-react';
import { useGameState } from '../../state/GameStateContext.jsx';
import { soundEngine } from '../../soundEngine.js';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

export default function SideProfilePanel() {
  const { userId, setUserId, showToast, transitionTo } = useGameState();
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
      <ClayPanel depth="deep" className="p-3.5 rounded-[24px] flex flex-col gap-2.5">
        <h3 className="text-xs font-heading font-bold text-clay-accent uppercase tracking-wider flex items-center gap-1.5">
          <User size={13} /> Operative Profile
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={tempUserId}
            onChange={(e) => setTempUserId(parseInt(e.target.value, 10) || 1)}
            min="1"
            className="w-16 px-2 py-1.5 rounded-xl clay-inset text-clay-text text-center font-bold text-xs"
          />
          <ClayButton variant="ghost" onClick={handleSwitchUser} className="flex-1 py-1.5 px-3 rounded-xl text-xs">
            Switch ID
          </ClayButton>
        </div>
      </ClayPanel>

      <ClayPanel depth="deep" delay={0.08} className="p-3.5 rounded-[24px] flex flex-col gap-2.5">
        <h3 className="text-xs font-heading font-bold text-clay-danger uppercase tracking-wider flex items-center gap-1.5">
          <Swords size={13} /> Sector Infiltration
        </h3>
        <p className="text-[11px] text-clay-muted">
          Infiltrate a neighboring fortress in grayscale stealth mode.
        </p>
        <ClayButton
          variant="danger"
          onClick={() => transitionTo('STEALTH_RAID', { defenderId: 34 })}
          className="w-full py-2.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-2"
        >
          <Swords size={14} /> Launch Raid
        </ClayButton>
      </ClayPanel>
    </aside>
  );
}
