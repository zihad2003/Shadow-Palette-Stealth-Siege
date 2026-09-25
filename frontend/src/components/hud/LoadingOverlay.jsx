import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameState } from '../../state/GameStateContext.jsx';
import RaidTransitionOverlay from '../raid/RaidTransitionOverlay.jsx';

/** Only exit/caught use the wipe — enter must not black out the raid scene. */
function raidModeFromLoading(title, subtitle) {
  const t = `${title} ${subtitle}`.toLowerCase();
  if (t.includes('defeated') || t.includes('caught')) return 'caught';
  if (
    t.includes('victory') ||
    t.includes('extracted') ||
    t.includes('leaving raid') ||
    t.includes('returning')
  )
    return 'exit';
  return null;
}

export default function LoadingOverlay() {
  const { loadingScreen } = useGameState();
  const title = loadingScreen.title || 'Loading';
  const subtitle = loadingScreen.subtitle || '';
  const raidMode = raidModeFromLoading(title, subtitle);

  if (loadingScreen.active && raidMode) {
    return (
      <div className="fixed inset-0 z-[200]">
        <RaidTransitionOverlay mode={raidMode} title={title} subtitle={subtitle} />
      </div>
    );
  }

  return (
    <AnimatePresence>
      {loadingScreen.active && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0d1b1e]/55"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <p className="font-heading font-semibold text-sm text-clay-text mb-3">{title}</p>
          {subtitle ? <p className="text-[11px] text-clay-muted mb-3">{subtitle}</p> : null}
          <div className="w-32 h-1 rounded-full clay-inset overflow-hidden">
            <div className="h-full w-full rounded-full bg-clay-accent origin-left animate-loadBar" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
