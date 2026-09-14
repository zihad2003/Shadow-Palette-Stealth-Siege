import React from 'react';
import { MAP_COLS, MAP_ROWS } from '../../gamemap/mapConfig.js';
import { useGameState, SEARCHLIGHT_UPGRADE_COSTS } from '../../state/GameStateContext.jsx';
import { searchlightSpec } from '../../raid/stealthConstants.js';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

const TOTAL = MAP_COLS * MAP_ROWS;

export default function BaseStatusPanel({ selectedTile, onBuildClick }) {
  const { paintedTiles, inkEnergy, buildings, defenses, selectedTool, searchlightLevel, upgradeSearchlight } =
    useGameState();
  const sl = searchlightSpec(searchlightLevel);
  const slCost = SEARCHLIGHT_UPGRADE_COSTS[sl.level];
  const painted = Object.keys(paintedTiles).length;
  const houseCount = buildings.length;
  const hasPatrol = defenses.some((d) => (d.type || d.defenseType) === 'PATROL_ROBOT');

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
        <p className="text-[10px] text-clay-muted uppercase tracking-wider">Structures</p>
        <p className="font-heading font-bold text-xs text-clay-text">
          {houseCount} houses · {hasPatrol ? 'Patrol on' : 'No patrol'}
        </p>
      </div>

      <div>
        <p className="text-[10px] text-clay-muted uppercase tracking-wider">Selected tile</p>
        <p className="font-heading font-bold text-xs text-clay-text">
          {selectedTile ? `R${selectedTile.row + 1} · C${selectedTile.column + 1}` : 'None'}
        </p>
      </div>

      <div>
        <p className="text-[10px] text-clay-muted uppercase tracking-wider">Searchlight</p>
        <p className="font-heading font-bold text-xs text-clay-text">
          L{sl.level} · {Math.round(sl.cover * 100)}% to walls ({Math.round(sl.rangeTiles)} tiles)
        </p>
        <ClayButton
          variant={slCost ? 'primary' : 'ghost'}
          disabled={!slCost}
          onClick={upgradeSearchlight}
          className="w-full mt-1.5 py-1.5 rounded-2xl text-[10px]"
        >
          {slCost ? `Upgrade L${sl.level + 1} · ${slCost.coins}c` : 'Max cover'}
        </ClayButton>
      </div>

      <div>
        <p className="text-[10px] text-clay-muted uppercase tracking-wider">Tool</p>
        <p className="font-heading font-bold text-xs text-clay-text">{selectedTool.replace(/_/g, ' ')}</p>
      </div>

      <ClayButton variant="primary" onClick={onBuildClick} className="w-full py-2 rounded-2xl text-[10px]">
        Build
      </ClayButton>
    </ClayPanel>
  );
}
