import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../../soundEngine.js';

/** Leave wipe after raid — keep in sync with finishRaid. */
export const RAID_CINEMATIC_MS = 900;
/** @deprecated Prefer RaidEnterView / RAID_ENTER_SCREEN_MS for enter. */
export const RAID_ENTER_MS = 5600;

const EASE = [0.16, 1, 0.3, 1];

/**
 * Leave / caught overlay only. Enter uses dedicated RaidEnterView screen.
 * mode: 'exit' | 'caught' | 'enter' (enter kept for compat, prefer RaidEnterView)
 */
export default function RaidTransitionOverlay({ mode, title, subtitle }) {
  useEffect(() => {
    if (!mode) return;
    try {
      if (mode === 'caught') soundEngine.playRaidCaughtSound();
      else if (mode === 'exit') soundEngine.playRaidExitSound();
      else soundEngine.playRaidEnterSound();
    } catch {
      /* needs gesture */
    }
  }, [mode]);

  if (!mode) return null;

  const isEnter = mode === 'enter';
  const isCaught = mode === 'caught';
  const banner =
    title || (isEnter ? 'Raid this base' : isCaught ? 'Caught' : 'Extracted');
  const tip =
    subtitle ||
    (isEnter ? 'Entering enemy fortress' : isCaught ? 'Cooldown applied' : 'Returning to base');

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      style={{
        background: isCaught
          ? 'radial-gradient(ellipse at center, #3a181c 0%, #0d1b1e 72%)'
          : 'radial-gradient(ellipse at center, #1c3238 0%, #0d1b1e 72%)',
      }}
      aria-live="polite"
    >
      <motion.div
        className="flex flex-col items-center gap-3 px-6 text-center"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <h2
          className="font-heading font-semibold text-clay-text"
          style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', letterSpacing: '-0.02em' }}
        >
          {banner}
        </h2>
        <p className="text-[12px] text-clay-muted">{tip}</p>
      </motion.div>
    </motion.div>
  );
}
