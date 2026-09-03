import React from 'react';
import { motion } from 'framer-motion';
import { Paintbrush } from 'lucide-react';
import { GAME_COLOR_KEYS, GAME_COLORS, COLOR_NAMES } from '../../colors.js';
import { PAINT_TILE_INK } from '../../state/GameStateContext.jsx';
import { useGameState } from '../../state/GameStateContext.jsx';
import { soundEngine } from '../../soundEngine.js';
import ClayPanel from '../ui/ClayPanel.jsx';

export default function BuildBasePanel() {
  const { selectedColor, setSelectedColor, inkEnergy, quotaFor } = useGameState();
  const usagePct = Math.round(quotaFor(selectedColor) * 100);
  const quotaTone = usagePct >= 35 ? 'bg-clay-danger' : usagePct >= 30 ? 'bg-clay-accent' : 'bg-clay-success';

  return (
    <ClayPanel enter depth="deep" className="w-[188px] p-4 rounded-[26px] flex flex-col gap-3 pointer-events-auto">
      <div>
        <p className="text-[10px] font-heading font-bold uppercase tracking-[0.22em] text-clay-accent">
          Build Base
        </p>
        <h2 className="font-heading font-extrabold text-sm text-clay-text flex items-center gap-1.5 mt-0.5">
          <Paintbrush size={13} /> Paint
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {GAME_COLOR_KEYS.map((key) => {
          const selected = selectedColor === key;
          return (
            <motion.button
              key={key}
              type="button"
              onClick={() => {
                soundEngine.playPaintSound();
                setSelectedColor(key);
              }}
              className="w-11 h-11 rounded-full clay-blob mx-auto"
              style={{ backgroundColor: GAME_COLORS[key] }}
              animate={{ scale: selected ? 1.14 : 1, y: selected ? -2 : 0 }}
              whileTap={{ y: 3, scale: 0.94 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              aria-label={COLOR_NAMES[key]}
              title={COLOR_NAMES[key]}
            >
              <span
                className={`block w-full h-full rounded-full ${selected ? 'ring-2 ring-clay-text ring-offset-2 ring-offset-clay-surface' : ''}`}
              />
            </motion.button>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between text-[10px] font-bold text-clay-muted mb-1">
          <span>Quota</span>
          <span>{usagePct}/35%</span>
        </div>
        <div className="h-2 rounded-full clay-inset overflow-hidden">
          <div
            className={`h-full rounded-full ${quotaTone}`}
            style={{ width: `${Math.min(100, (usagePct / 35) * 100)}%` }}
          />
        </div>
      </div>

      <p className="text-[11px] text-clay-muted leading-snug">
        Ink <strong className="text-clay-text">{inkEnergy}</strong> · {PAINT_TILE_INK} per tile
      </p>
      <p className="text-[10px] text-clay-muted/80 leading-snug">Select a tile to paint</p>
    </ClayPanel>
  );
}
