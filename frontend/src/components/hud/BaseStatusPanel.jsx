import React from 'react';
import { MAP_ROWS, MAP_COLS } from '../../gamemap/mapConfig.js';
import { useGameState } from '../../state/GameStateContext.jsx';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

const TOTAL = MAP_ROWS * MAP_COLS;

export default function BaseStatusPanel({ selectedTile }) {
  const { paintedTiles, inkEnergy } = useGameState();
  const painted = Object.keys(paintedTiles).length;

  return (
    <ClayPanel enter delay={0.06} depth="deep" className="w-[188px] p-4 rounded-[26px] flex flex-col gap-3 pointer-events-auto">
      <p className="text-[10px] font-heading font-bold uppercase tracking-[0.22em] text-clay-accent">
        Base Status
      </p>

      <div>
        <p className="text-[10px] text-clay-muted uppercase tracking-wider">Tiles painted</p>
        <p className="font-heading font-extrabold text-lg text-clay-text">
          {painted} <span className="text-sm text-clay-muted font-bold">/ {TOTAL}</span>
        </p>
      </div>

      <div>
        <p className="text-[10px] text-clay-muted uppercase tracking-wider">Ink available</p>
        <p className="font-heading font-extrabold text-lg text-clay-text">{inkEnergy}</p>
      </div>

      <div>
        <p className="text-[10px] text-clay-muted uppercase tracking-wider">Selected tile</p>
        <p className="font-heading font-bold text-xs text-clay-text">
          {selectedTile ? `R${selectedTile.row + 1} · C${selectedTile.column + 1}` : 'None'}
        </p>
      </div>

      <div>
        <p className="text-[10px] text-clay-muted uppercase tracking-wider">Searchlight</p>
        <p className="font-heading font-bold text-xs text-clay-text">Center · Level 1</p>
      </div>

      <ClayButton variant="ghost" disabled className="w-full py-2 rounded-2xl text-[10px]">
        Build
      </ClayButton>
    </ClayPanel>
  );
}
