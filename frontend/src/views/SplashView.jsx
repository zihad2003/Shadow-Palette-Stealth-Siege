import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameState } from '../state/GameStateContext.jsx';
import { COLORS } from '../colors.js';

const BLOBS = [COLORS.RED, COLORS.GREEN, COLORS.BLUE, COLORS.YELLOW, COLORS.PURPLE];

export default function SplashView() {
  const { transitionTo } = useGameState();

  useEffect(() => {
    const t = window.setTimeout(() => transitionTo('STORY'), 2600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center bg-clay-bg cursor-pointer"
      onClick={() => transitionTo('STORY')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(244,162,97,0.14)_0%,transparent_55%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1.2, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        <div className="flex items-center gap-3">
          {BLOBS.map((hex, i) => (
            <motion.span
              key={hex}
              className="w-9 h-9 rounded-full clay-blob"
              style={{ backgroundColor: hex }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.09, duration: 0.4, ease: 'easeOut' }}
            />
          ))}
        </div>

        <motion.h1
          className="font-heading font-extrabold text-4xl md:text-5xl tracking-[0.18em] text-clay-text text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5, ease: 'easeOut' }}
        >
          SHADOW PALETTE
        </motion.h1>

        <motion.p
          className="text-xs tracking-[0.35em] uppercase text-clay-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          Stealth &amp; Siege
        </motion.p>

        <motion.p
          className="text-[10px] text-clay-muted/70 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0.4] }}
          transition={{ delay: 1.4, duration: 1.4, times: [0, 0.4, 0.8, 1] }}
        >
          tap anywhere
        </motion.p>
      </motion.div>
    </div>
  );
}
