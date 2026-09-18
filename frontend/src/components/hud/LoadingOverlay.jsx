import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameState } from '../../state/GameStateContext.jsx';

export default function LoadingOverlay() {
  const { loadingScreen } = useGameState();
  const title = loadingScreen.title || 'Loading';

  return (
    <AnimatePresence>
      {loadingScreen.active && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0d1b1e]/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
        >
          <p className="font-heading font-semibold text-sm text-clay-text mb-3">{title}</p>
          <div className="w-32 h-1 rounded-full clay-inset overflow-hidden">
            <div className="h-full w-full rounded-full bg-clay-accent origin-left animate-loadBar" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
