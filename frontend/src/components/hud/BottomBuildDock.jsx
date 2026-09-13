import React from 'react';
import { Paintbrush, Lock, Bot, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { GAME_COLOR_KEYS, GAME_COLORS, COLOR_NAMES } from '../../colors.js';
import { UPGRADE_COSTS } from '../../data/raidTargets.js';
import {
  useGameState,
  REPAIR_BUILDING_COST,
  PATROL_UNLOCK_RAIDS,
  PATROL_UNLOCK_COINS,
} from '../../state/GameStateContext.jsx';
import { soundEngine } from '../../soundEngine.js';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

const REPAIR_COST_LABEL = `${REPAIR_BUILDING_COST.coins}c / ${REPAIR_BUILDING_COST.ink} ink`;

export default function BottomBuildDock() {
  const {
    selectedColor,
    setSelectedColor,
    selectedTool,
    setSelectedTool,
    selectedBuildingId,
    buildings,
    handleUpgradeSelected,
    quotaFor,
    patrolUnlocked,
    successfulRaids,
    unlockPatrolRobot,
    defenses,
    coins,
  } = useGameState();

  const selected = buildings.find((b) => b.id === selectedBuildingId);
  const nextCost = selected && selected.level < 3 ? UPGRADE_COSTS[selected.level] : null;
  const hasPatrol = defenses.some((d) => (d.type || d.defenseType) === 'PATROL_ROBOT');

  const usagePct = Math.round(quotaFor(selectedColor) * 100);
  const quotaTone = usagePct >= 35 ? 'bg-clay-danger' : usagePct >= 30 ? 'bg-clay-accent' : 'bg-clay-success';
  const raidProgress = Math.min(1, successfulRaids / PATROL_UNLOCK_RAIDS);
  const canAffordUnlock = coins >= PATROL_UNLOCK_COINS;
  const ruinedLeft = buildings.filter((b) => b.ruined).length;

  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-50 flex items-end gap-2 max-w-[96vw] pointer-events-auto opacity-95">
      <ClayPanel depth="deep" className="px-3 py-2 rounded-2xl flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          {GAME_COLOR_KEYS.map((key) => {
            const isSelected = selectedColor === key;
            return (
              <ClayButton
                key={key}
                variant="ghost"
                style={{ background: GAME_COLORS[key] }}
                onClick={() => {
                  soundEngine.playPaintSound();
                  setSelectedColor(key);
                  setSelectedTool('PAINT');
                }}
                className={`w-7 h-7 rounded-full clay-blob p-0 ${isSelected ? 'ring-2 ring-clay-text' : ''}`}
                title={`${COLOR_NAMES[key]} — 35% quota`}
                aria-label={COLOR_NAMES[key]}
              />
            );
          })}
          <div className="w-16 h-1.5 rounded-full clay-inset overflow-hidden">
            <div
              className={`h-full rounded-full ${quotaTone} transition-[width] duration-300`}
              style={{ width: `${Math.min(100, (usagePct / 35) * 100)}%` }}
            />
          </div>
          <ClayButton
            variant={selectedTool === 'PAINT' ? 'primary' : 'ghost'}
            onClick={() => {
              soundEngine.playClickSound();
              setSelectedTool('PAINT');
            }}
            className="px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1"
          >
            <Paintbrush size={11} /> E
          </ClayButton>
        </div>
      </ClayPanel>

      <ClayPanel depth="deep" className="px-3 py-2 rounded-2xl flex items-center gap-2">
        <span className="text-[10px] font-heading uppercase font-bold text-clay-accent tracking-wider whitespace-nowrap">
          Ruins {ruinedLeft}
        </span>
        <span className="text-[10px] text-clay-muted whitespace-nowrap">F · {REPAIR_COST_LABEL}</span>
      </ClayPanel>

      <ClayPanel
        depth="deep"
        className={`px-3 py-2 rounded-2xl flex items-center gap-2 min-w-0 ${
          selectedTool === 'PATROL_ROBOT' ? 'ring-2 ring-clay-accent/70' : ''
        }`}
      >
        <div className="relative w-9 h-9 shrink-0">
          <svg viewBox="0 0 56 56" className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <motion.circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke={hasPatrol ? '#2ecc71' : '#f4a261'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={150.8}
              animate={{ strokeDashoffset: 150.8 * (1 - (hasPatrol ? 1 : raidProgress)) }}
              transition={{ duration: 0.4 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Bot size={14} className={hasPatrol ? 'text-clay-danger' : 'text-clay-accent'} />
          </div>
        </div>
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
          className="px-2 py-1 rounded-xl text-[10px] font-bold"
        >
          {hasPatrol ? 'Online' : patrolUnlocked ? 'Place' : (
            <span className="flex items-center gap-1">
              <Lock size={10} /> {PATROL_UNLOCK_COINS}c
              {!canAffordUnlock ? '' : ''}
            </span>
          )}
        </ClayButton>
        {!patrolUnlocked && (
          <span className="text-[9px] text-clay-muted flex items-center gap-0.5">
            <Shield size={9} /> {successfulRaids}/{PATROL_UNLOCK_RAIDS}
          </span>
        )}
      </ClayPanel>

      <ClayPanel depth="deep" className="px-3 py-2 rounded-2xl flex items-center gap-2">
        <span className="text-[10px] text-clay-muted max-w-[110px] truncate">
          {selected ? `${selected.buildingType.replace(/_/g, ' ')} L${selected.level}` : 'Upgrade'}
        </span>
        <ClayButton
          variant="primary"
          disabled={!nextCost}
          onClick={handleUpgradeSelected}
          className="px-2 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap"
        >
          {nextCost ? `${nextCost.coins}c` : 'Max'}
        </ClayButton>
      </ClayPanel>
    </div>
  );
}
