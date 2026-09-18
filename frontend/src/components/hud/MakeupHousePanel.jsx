import React, { Suspense, lazy, useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, X } from 'lucide-react';
import { GAME_COLOR_KEYS, GAME_COLORS, COLOR_NAMES } from '../../colors.js';
import { useGameState } from '../../state/GameStateContext.jsx';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

const CharacterPreview = lazy(() => import('../three/CharacterPreview.jsx'));

export default function MakeupHousePanel({ onClose, onReady }) {
  const { camoColor, changeCamoColor, setCamoReady, raidSession } = useGameState();
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

        <p className="text-[11px] text-clay-muted">One camo. Locks in raid.</p>

        <div className="h-[200px] clay-inset rounded-3xl overflow-hidden">
          <Suspense fallback={<div className="w-full h-full" />}>
            <CharacterPreview camoColor={draft} />
          </Suspense>
        </div>

        <p className="text-center text-[11px] font-semibold text-clay-text">Camo</p>
        <div className="flex items-center justify-center gap-3">
          {GAME_COLOR_KEYS.map((key) => (
            <motion.button
              key={key}
              type="button"
              disabled={locked}
              onClick={() => setDraft(key)}
              className="w-9 h-9 rounded-full clay-blob"
              style={{ background: GAME_COLORS[key] }}
              animate={{ scale: draft === key ? 1.08 : 1 }}
              whileTap={{ scale: 0.96 }}
              title={COLOR_NAMES[key]}
              aria-label={COLOR_NAMES[key]}
            >
              <span className={`block w-full h-full rounded-full ${draft === key ? 'ring-2 ring-clay-text' : ''}`} />
            </motion.button>
          ))}
        </div>

        <ClayButton variant="primary" disabled={locked} onClick={paint} className="w-full py-2 rounded-xl text-xs">
          Paint
        </ClayButton>
        <ClayButton variant="success" disabled={locked} onClick={ready} className="w-full py-2 rounded-xl text-xs">
          Ready
        </ClayButton>

        <p className="text-center text-[11px] text-clay-muted">
          {camoColor}{locked ? ' · Locked' : ''}
        </p>
      </ClayPanel>
    </div>
  );
}
