import React from 'react';
import { useGameState } from '../../state/GameStateContext.jsx';
import { COLORS } from '../../colors.js';
import { soundEngine } from '../../soundEngine.js';

export default function BottomBuildDock() {
  const { selectedColor, setSelectedColor, selectedTool, setSelectedTool } = useGameState();

  const colorList = [
    { hex: COLORS.WHITE, label: 'White (35% Quota)' },
    { hex: COLORS.YELLOW, label: 'Yellow (35% Quota)' },
    { hex: COLORS.GREEN, label: 'Green (35% Quota)' },
    { hex: COLORS.RED, label: 'Red (35% Quota)' },
    { hex: COLORS.BLUE, label: 'Blue (35% Quota)' },
  ];

  const tools = [
    { id: 'CRAFT_HOUSE', label: '🏠 Craft House', footprint: '4×4 (16 Tiles)' },
    { id: 'INK_HOUSE', label: '✒️ Ink House', footprint: '3×3 (9 Tiles)' },
    { id: 'SLEEP_HOUSE', label: '🛏️ Sleep House', footprint: '3×3 (9 Tiles)' },
    { id: 'COIN_GENERATOR', label: '💰 Coin Mint', footprint: '4×3 (12 Tiles)' },
    { id: 'LIGHTHOUSE', label: '💡 Lighthouse', footprint: 'Spotlight Defense' },
    { id: 'PATROL_ROBOT', label: '🤖 PatrolRobot', footprint: 'Guard AI Bot' },
  ];

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-end gap-3 max-w-[95vw] pointer-events-auto">
      {/* Palette Color Swatches */}
      <div className="glass-panel-deep px-4 py-3 rounded-2xl flex flex-col gap-2 shadow-glassDeep">
        <span className="text-[11px] font-heading uppercase font-bold text-amber-400 text-center tracking-wider">
          Camo Palette
        </span>
        <div className="flex items-center gap-2">
          {colorList.map((c) => {
            const isSelected = selectedColor === c.hex;
            return (
              <button
                key={c.hex}
                style={{ backgroundColor: c.hex }}
                onClick={() => {
                  soundEngine.playPaintSound();
                  setSelectedColor(c.hex);
                }}
                className={`w-7 h-7 rounded-full border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-white scale-125 shadow-[0_0_12px_rgba(255,255,255,0.8)]'
                    : 'border-white/20 hover:scale-110 hover:border-white/50'
                }`}
                title={c.label}
              />
            );
          })}
        </div>
      </div>

      {/* Building & Defense Dock */}
      <div className="glass-panel-deep px-4 py-3 rounded-2xl flex flex-col gap-2 shadow-glassDeep">
        <span className="text-[11px] font-heading uppercase font-bold text-amber-400 text-center tracking-wider">
          Structure Placement Dock
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tools.map((t) => {
            const isActive = selectedTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  soundEngine.playClickSound();
                  setSelectedTool(t.id);
                }}
                className={`px-3 py-2 rounded-xl flex flex-col items-center gap-0.5 min-w-[90px] transition-all duration-200 ${
                  isActive
                    ? 'bg-sky-500/25 border border-sky-400/50 text-sky-300 shadow-neonCyan'
                    : 'bg-white/5 border border-white/10 text-slate-200 hover:border-sky-400/30 hover:bg-sky-500/10'
                }`}
              >
                <span className="font-heading font-bold text-xs">{t.label}</span>
                <small className="text-[10px] text-slate-400">{t.footprint}</small>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
