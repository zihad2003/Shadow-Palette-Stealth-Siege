import React from 'react';
import { Coins, Droplet, Gem, User, Palette, Home } from 'lucide-react';
import { useGameState } from '../../state/GameStateContext.jsx';
import ClayChip from '../ui/ClayChip.jsx';

export default function TopResourceBar() {
  const { userId, coins, inkEnergy, chips, camoColor, activePlotId } = useGameState();

  return (
    <div className="flex items-center gap-2 pointer-events-auto flex-nowrap justify-end overflow-x-auto max-w-[48vw]">
      <ClayChip
        icon={<User size={13} className="text-clay-accent" />}
        label="User"
        value={`#${userId}`}
      />
      <ClayChip
        icon={<Coins size={13} className="text-clay-yellow" />}
        label="Coins"
        value={coins}
        valueClass="text-clay-yellow"
      />
      <ClayChip
        icon={<Droplet size={13} className="text-clay-success" />}
        label="Ink"
        value={inkEnergy}
        valueClass="text-clay-success"
      />
      <ClayChip
        icon={<Gem size={13} className="text-clay-accent" />}
        label="Chips"
        value={chips}
        valueClass="text-clay-accent"
      />
      <ClayChip
        icon={<Palette size={13} className="text-clay-success" />}
        label="Camo"
        value={camoColor}
        valueClass="text-clay-success"
        className="hidden md:flex"
      />
      <ClayChip
        icon={<Home size={13} className="text-clay-accent" />}
        label="Base"
        value={`#${activePlotId}`}
      />
    </div>
  );
}
