import React from 'react';
import { Coins, Droplet, Gem } from 'lucide-react';
import { useGameState } from '../../state/GameStateContext.jsx';
import { GAME_COLORS } from '../../colors.js';
import ClayChip from '../ui/ClayChip.jsx';

export default function TopResourceBar() {
  const { coins, inkEnergy, chips, camoColor } = useGameState();
  const swatch = GAME_COLORS[camoColor] || '#f4a261';

  return (
    <div className="flex items-center gap-1.5 pointer-events-auto">
      <ClayChip icon={<Coins size={12} className="text-clay-yellow" />} value={coins} valueClass="text-clay-yellow" />
      <ClayChip icon={<Droplet size={12} className="text-clay-success" />} value={inkEnergy} valueClass="text-clay-success" />
      <ClayChip icon={<Gem size={12} className="text-clay-accent" />} value={chips} valueClass="text-clay-accent" />
      <div
        className="h-11 w-11 rounded-2xl clay-chip flex items-center justify-center"
        title={camoColor}
        aria-label={camoColor}
      >
        <span className="w-4 h-4 rounded-full clay-blob" style={{ background: swatch }} />
      </div>
    </div>
  );
}
