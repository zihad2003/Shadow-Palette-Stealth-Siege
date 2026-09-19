import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameState } from '../state/GameStateContext.jsx';
import { GAME_COLOR_KEYS, GAME_COLORS } from '../colors.js';
import OnboardShell from '../components/ui/OnboardShell.jsx';

export default function SplashView() {
  const { transitionTo } = useGameState();

  useEffect(() => {
    const t = window.setTimeout(() => transitionTo('STORY'), 2400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full h-full cursor-pointer" onClick={() => transitionTo('STORY')}>
      <OnboardShell step={0}>
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="flex items-center gap-2.5">
            {GAME_COLOR_KEYS.map((key, i) => (
              <motion.span
                key={key}
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: GAME_COLORS[key] }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12 + i * 0.06, duration: 0.2 }}
              />
            ))}
          </div>
          <motion.h1
            className="font-heading font-semibold text-4xl md:text-6xl tracking-[0.14em] text-clay-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28, duration: 0.35 }}
          >
            SHADOW PALETTE
          </motion.h1>
          <motion.p
            className="text-[11px] tracking-[0.42em] uppercase text-clay-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.48, duration: 0.3 }}
          >
            Stealth &amp; Siege
          </motion.p>
        </div>
      </OnboardShell>
    </div>
  );
}
