import React from 'react';
import { Paintbrush, Lock, Bot, Grid3x3, Eraser, Move } from 'lucide-react';
import { GAME_COLOR_KEYS, GAME_COLORS, COLOR_NAMES } from '../../colors.js';
import { UPGRADE_COSTS } from '../../data/raidTargets.js';
import {
  useGameState,
  REPAIR_BUILDING_COST,
  STARTER_HOUSE_COUNT,
  PATROL_UNLOCK_RAIDS,
  PATROL_UNLOCK_COINS,
} from '../../state/GameStateContext.jsx';
import { soundEngine } from '../../soundEngine.js';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

export default function BottomBuildDock() {
  const {
    selectedColor,
    setSelectedColor,
    selectedTool,
    setSelectedTool,
    selectedBuildingId,
    movingBuildingId,
    buildings,
    repairedCount,
    beginMoveBuilding,
    cancelMoveBuilding,
    handleUpgradeSelected,
    quotaFor,
    patrolUnlocked,
    successfulRaids,
    unlockPatrolRobot,
    defenses,
    coins,
    brush,
    toggleBrush,
    cycleBrushSize,
    toggleEraser,
  } = useGameState();

  const selected = buildings.find((b) => b.id === selectedBuildingId);
  const nextCost = selected && selected.level < 3 ? UPGRADE_COSTS[selected.level] : null;
  const hasPatrol = defenses.some((d) => (d.type || d.defenseType) === 'PATROL_ROBOT');
  const usagePct = Math.round(quotaFor(selectedColor) * 100);
  const quotaTone = usagePct >= 35 ? 'bg-clay-danger' : usagePct >= 30 ? 'bg-clay-accent' : 'bg-clay-success';

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 pointer-events-auto">
      <ClayPanel depth="deep" className="h-11 px-2.5 rounded-2xl flex items-center gap-2">
        {GAME_COLOR_KEYS.map((key, i) => {
          const isSelected = selectedColor === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                soundEngine.playPaintSound();
                setSelectedColor(key);
                setSelectedTool('PAINT');
              }}
              className={`relative w-6 h-6 rounded-full clay-blob p-0 border-0 ${
                isSelected ? 'ring-2 ring-clay-text' : 'opacity-75 hover:opacity-100'
              }`}
              style={{ background: GAME_COLORS[key] }}
              title={`${COLOR_NAMES[key]} · ${Math.round(quotaFor(key) * 100)}%`}
              aria-label={COLOR_NAMES[key]}
            >
              <span className="sr-only">{i + 1}</span>
            </button>
          );
        })}
        <div className="w-12 h-1.5 rounded-full clay-inset overflow-hidden">
          <div className={`h-full rounded-full ${quotaTone}`} style={{ width: `${Math.min(100, (usagePct / 35) * 100)}%` }} />
        </div>
        <ClayButton
          variant={brush.on ? 'primary' : 'ghost'}
          onClick={() => {
            soundEngine.playClickSound();
            setSelectedTool('PAINT');
            toggleBrush();
          }}
          className="h-8 px-2 rounded-lg text-[10px] flex items-center gap-1"
          title="E"
        >
          <Paintbrush size={11} />
        </ClayButton>
        <ClayButton
          variant="ghost"
          onClick={() => {
            soundEngine.playClickSound();
            cycleBrushSize();
          }}
          className="h-8 px-2 rounded-lg text-[10px] flex items-center gap-1"
          title="Q"
        >
          <Grid3x3 size={11} /> {brush.size}
        </ClayButton>
        <ClayButton
          variant={brush.erase ? 'danger' : 'ghost'}
          onClick={() => {
            soundEngine.playClickSound();
            toggleEraser();
          }}
          className="h-8 px-2 rounded-lg text-[10px]"
          title="R"
        >
          <Eraser size={11} />
        </ClayButton>
      </ClayPanel>

      <ClayPanel depth="deep" className="h-11 px-3 rounded-2xl flex items-center gap-2">
        <span className="text-[11px] font-heading font-semibold text-clay-text whitespace-nowrap">
          {repairedCount}/{STARTER_HOUSE_COUNT}
        </span>
        <span className="text-[10px] text-clay-muted whitespace-nowrap">F · {REPAIR_BUILDING_COST.coins}c</span>
      </ClayPanel>

      <ClayPanel depth="deep" className="h-11 px-2.5 rounded-2xl flex items-center gap-2">
        <Bot size={14} className={hasPatrol ? 'text-clay-success' : 'text-clay-accent'} />
        <ClayButton
          variant={hasPatrol ? 'ghost' : 'primary'}
          disabled={hasPatrol}
          onClick={() => {
            soundEngine.playClickSound();
            if (!patrolUnlocked) {
              unlockPatrolRobot();
              return;
            }
            setSelectedTool('PATROL_ROBOT');
          }}
          className="h-8 px-2 rounded-lg text-[10px] font-bold"
        >
          {hasPatrol ? 'On' : patrolUnlocked ? 'Place' : (
            <span className="flex items-center gap-1">
              <Lock size={10} /> {PATROL_UNLOCK_COINS}c
            </span>
          )}
        </ClayButton>
        {!patrolUnlocked && (
          <span className="text-[10px] text-clay-muted">{successfulRaids}/{PATROL_UNLOCK_RAIDS}</span>
        )}
      </ClayPanel>

      <ClayPanel depth="deep" className="h-11 px-2.5 rounded-2xl flex items-center gap-1.5">
        <ClayButton
          variant={movingBuildingId ? 'primary' : 'ghost'}
          disabled={!selected || selected.ruined}
          onClick={() => {
            soundEngine.playClickSound();
            if (movingBuildingId) cancelMoveBuilding();
            else beginMoveBuilding(selected.id);
          }}
          className="h-8 px-2 rounded-lg text-[10px] flex items-center gap-1"
        >
          <Move size={11} /> {movingBuildingId ? 'Drop' : 'Move'}
        </ClayButton>
        <ClayButton
          variant="primary"
          disabled={!nextCost || !!movingBuildingId}
          onClick={handleUpgradeSelected}
          className="h-8 px-2.5 rounded-lg text-[10px] font-bold"
        >
          {nextCost ? `${nextCost.coins}c` : 'Max'}
        </ClayButton>
      </ClayPanel>
    </div>
  );
}
