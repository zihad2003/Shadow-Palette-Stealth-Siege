import React, { Suspense, lazy, useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, X } from 'lucide-react';
import { GAME_COLOR_KEYS, GAME_COLORS, COLOR_NAMES } from '../../colors.js';
import { MAKEUP_RECOLOR_INK } from '../../data/raidTargets.js';
import { useGameState } from '../../state/GameStateContext.jsx';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

const CharacterPreview = lazy(() => import('../three/CharacterPreview.jsx'));

export default function MakeupHousePanel({ onClose, onReady }) {
  const { camoColor, changeCamoColor, inkEnergy, camoReady, setCamoReady, raidSession } = useGameState();
  const [draft, setDraft] = useState(camoColor);
  const locked = !!(raidSession && raidSession.isActive);

  const paint = () => {
    if (locked) return;
    changeCamoColor(draft);
  };

  const ready = () => {
    if (locked) return;
    if (draft !== camoColor) changeCamoColor(draft);
    setCamoReady(true);
    if (onReady) onReady(draft);
    if (onClose) onClose();
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-end md:items-center justify-center bg-[#0d1b1e]/70 pointer-events-auto">
      <ClayPanel depth="deep" className="w-[440px] max-w-[92vw] mb-8 md:mb-0 p-5 rounded-[28px] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-sm text-clay-accent uppercase tracking-wider flex items-center gap-2">
            <Palette size={15} /> Makeup House
          </h3>
          <ClayButton
            variant="ghost"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            aria-label="Close makeup house"
          >
            <X size={14} />
          </ClayButton>
        </div>

        <p className="text-[11px] text-clay-muted">
          Choose one camouflage color. It locks the moment a raid starts. Recolor costs {MAKEUP_RECOLOR_INK} Ink.
        </p>

        <div className="h-[200px] clay-inset rounded-3xl overflow-hidden">
          <Suspense fallback={<div className="w-full h-full" />}>
            <CharacterPreview camoColor={draft} />
          </Suspense>
        </div>

        <p className="text-center text-[11px] font-bold text-clay-text uppercase tracking-widest">Choose your color</p>
        <div className="flex items-center justify-center gap-3">
          {GAME_COLOR_KEYS.map((key) => (
            <motion.button
              key={key}
              type="button"
              disabled={locked}
              onClick={() => setDraft(key)}
              className="w-11 h-11 rounded-full clay-blob"
              style={{ background: GAME_COLORS[key] }}
              animate={{ scale: draft === key ? 1.16 : 1, y: draft === key ? -3 : 0 }}
              whileTap={{ scale: 0.94, y: 2 }}
              title={COLOR_NAMES[key]}
              aria-label={COLOR_NAMES[key]}
            >
              <span className={`block w-full h-full rounded-full ${draft === key ? 'ring-2 ring-clay-text ring-offset-2 ring-offset-clay-surface' : ''}`} />
            </motion.button>
          ))}
        </div>

        <ClayButton variant="primary" disabled={locked} onClick={paint} className="w-full py-2.5 rounded-2xl text-xs">
          Paint my character
        </ClayButton>
        <ClayButton variant="success" disabled={locked} onClick={ready} className="w-full py-2.5 rounded-2xl text-xs">
          Ready
        </ClayButton>

        <p className="text-center text-[11px] text-clay-muted">
          Current: <strong className="text-clay-accent">{camoColor}</strong>
          {camoReady ? ' · Ready for raid' : ''} · Ink {inkEnergy}
          {locked ? ' · LOCKED IN RAID' : ''}
        </p>
      </ClayPanel>
    </div>
  );
}
