import React from 'react';
import { useGameState, SEARCHLIGHT_UPGRADE_COSTS } from '../../state/GameStateContext.jsx';
import { searchlightSpec } from '../../raid/stealthConstants.js';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

export default function BaseStatusPanel() {
  const { searchlightLevel, upgradeSearchlight } = useGameState();
  const sl = searchlightSpec(searchlightLevel);
  const slCost = SEARCHLIGHT_UPGRADE_COSTS[sl.level];

  return (
    <ClayPanel depth="deep" className="h-11 px-3 rounded-2xl flex items-center gap-2 pointer-events-auto">
      <span className="text-[11px] font-heading font-semibold text-clay-text whitespace-nowrap">Light L{sl.level}</span>
      <ClayButton
        variant={slCost ? 'primary' : 'ghost'}
        disabled={!slCost}
        onClick={upgradeSearchlight}
        className="h-8 px-2.5 rounded-lg text-[10px]"
      >
        {slCost ? `${slCost.coins}c` : 'Max'}
      </ClayButton>
    </ClayPanel>
  );
}
