import React from 'react';
import { Paintbrush } from 'lucide-react';
import { GAME_COLOR_KEYS, GAME_COLORS, COLOR_NAMES } from '../../colors.js';
import { UPGRADE_COSTS } from '../../data/raidTargets.js';
import { useGameState } from '../../state/GameStateContext.jsx';
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
    buildings,
    handleUpgradeSelected,
    quotaFor,
  } = useGameState();

  const selected = buildings.find((b) => b.id === selectedBuildingId);
  const nextCost = selected && selected.level < 3 ? UPGRADE_COSTS[selected.level] : null;

  const colorList = GAME_COLOR_KEYS;
  const usagePct = Math.round(quotaFor(selectedColor) * 100);
  const quotaTone = usagePct >= 35 ? 'bg-clay-danger' : usagePct >= 30 ? 'bg-clay-accent' : 'bg-clay-success';

  // Lighthouse is not buildable — it stands at the center of every base
  const tools = [
    { id: 'PAINT', label: 'Paint', footprint: '5 ink' },
    { id: 'MAKEUP_HOUSE', label: 'Makeup House', footprint: '3×3 recamo' },
    { id: 'SLEEP_HOUSE', label: 'Sleep House', footprint: '3×3' },
    { id: 'INK_HOUSE', label: 'Ink House', footprint: '3×3' },
    { id: 'CRAFT_HOUSE', label: 'Craft House', footprint: '4×4' },
    { id: 'COIN_GENERATOR', label: 'Coin Mint', footprint: '4×3' },
    { id: 'PATROL_ROBOT', label: 'Patrol Robot', footprint: 'Guard' },
  ];

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-end gap-3 max-w-[95vw] pointer-events-auto">
      <ClayPanel depth="deep" className="px-4 py-3 rounded-[24px] flex flex-col gap-2">
        <span className="text-[11px] font-heading uppercase font-bold text-clay-accent text-center tracking-wider">
          Paint Palette
        </span>
        <div className="flex items-center gap-2">
          {colorList.map((key) => {
            const isSelected = selectedColor === key;
            return (
              <ClayButton
                key={key}
                variant="ghost"
                style={{ background: GAME_COLORS[key] }}
                onClick={() => {
                  soundEngine.playPaintSound();
                  setSelectedColor(key);
                }}
                className={`w-8 h-8 rounded-full clay-blob p-0 ${
                  isSelected ? 'ring-2 ring-clay-text' : ''
                }`}
                title={`${COLOR_NAMES[key]} — 35% quota`}
                aria-label={COLOR_NAMES[key]}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full clay-inset overflow-hidden">
            <div
              className={`h-full rounded-full ${quotaTone} transition-[width] duration-300`}
              style={{ width: `${Math.min(100, (usagePct / 35) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-clay-muted whitespace-nowrap">{usagePct}/35%</span>
        </div>
      </ClayPanel>

      <ClayPanel depth="deep" className="px-4 py-3 rounded-[24px] flex flex-col gap-2">
        <span className="text-[11px] font-heading uppercase font-bold text-clay-accent text-center tracking-wider">
          Structure Dock
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[58vw]">
          {tools.map((t) => {
            const isActive = selectedTool === t.id;
            return (
              <ClayButton
                key={t.id}
                variant={isActive ? 'primary' : 'ghost'}
                onClick={() => {
                  soundEngine.playClickSound();
                  setSelectedTool(t.id);
                }}
                className="px-3 py-2 rounded-2xl flex flex-col items-center gap-0.5 min-w-[92px]"
              >
                <span className="font-heading font-bold text-xs flex items-center gap-1">
                  {t.id === 'PAINT' && <Paintbrush size={12} />}
                  {t.label}
                </span>
                <small className="text-[10px] opacity-70">{t.footprint}</small>
              </ClayButton>
            );
          })}
        </div>
      </ClayPanel>

      <ClayPanel depth="deep" className="px-4 py-3 rounded-[24px] flex flex-col gap-2 min-w-[140px]">
        <span className="text-[11px] font-heading uppercase font-bold text-clay-accent text-center tracking-wider">
          Upgrade
        </span>
        <p className="text-[10px] text-clay-muted text-center max-w-[140px]">
          {selected
            ? `${selected.buildingType.replace(/_/g, ' ')} Lvl ${selected.level}`
            : 'Tap a building'}
        </p>
        <ClayButton
          variant="primary"
          disabled={!nextCost}
          onClick={handleUpgradeSelected}
          className="px-3 py-2 rounded-2xl text-xs"
        >
          {nextCost ? `${nextCost.coins}c / ${nextCost.ink} ink` : 'Maxed'}
        </ClayButton>
      </ClayPanel>
    </div>
  );
}
