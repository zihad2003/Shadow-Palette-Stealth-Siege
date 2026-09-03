import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameState } from '../../state/GameStateContext.jsx';

const TONE = {
  error: 'bg-[#3a1518] text-[#ffc4c8]',
  success: 'bg-[#14332f] text-[#b8efe6]',
  info: 'bg-[#152428] text-clay-text',
};

export default function ToastContainer() {
  const { toasts } = useGameState();

  return (
    <div className="fixed top-20 left-5 z-[150] flex flex-col gap-2 pointer-events-none max-w-sm">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: -24, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className={`clay-panel px-4 py-3 rounded-2xl font-heading font-bold text-xs ${TONE[t.type] || TONE.info}`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
