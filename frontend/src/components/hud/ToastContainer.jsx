import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameState } from '../../state/GameStateContext.jsx';

const TONE = {
  error: 'text-[#ffc4c8]',
  success: 'text-[#b8efe6]',
  info: 'text-clay-text',
};

export default function ToastContainer() {
  const { toasts } = useGameState();

  return (
    <div className="fixed top-[4.75rem] left-4 z-[150] flex flex-col items-start gap-1.5 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className={`clay-panel h-9 px-3.5 rounded-2xl flex items-center font-heading font-semibold text-[11px] ${TONE[t.type] || TONE.info}`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
