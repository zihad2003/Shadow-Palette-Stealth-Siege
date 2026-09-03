import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameState } from '../../state/GameStateContext.jsx';
import ClayPanel from '../ui/ClayPanel.jsx';

export default function LoadingOverlay() {
  const { loadingScreen } = useGameState();

  return (
    <AnimatePresence>
      {loadingScreen.active && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0d1b1e]/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ClayPanel depth="deep" className="p-8 rounded-[28px] flex flex-col items-center gap-4 max-w-sm text-center">
            <div className="w-20 h-20 rounded-full clay-inset relative flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg,rgba(244,162,97,0.85)_0deg,transparent_90deg)] animate-radar-sweep" />
              <div className="w-2.5 h-2.5 rounded-full bg-clay-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>

            <h2 className="font-heading font-bold text-sm text-clay-accent tracking-widest uppercase">
              {loadingScreen.title || 'INITIALIZING LINK...'}
            </h2>
            <p className="text-xs text-clay-muted">
              {loadingScreen.subtitle || 'Syncing 2.5D Isometric Diorama Data'}
            </p>

            <div className="w-56 h-2.5 rounded-full clay-inset overflow-hidden">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-clay-success to-clay-accent origin-left animate-loadBar" />
            </div>
          </ClayPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
