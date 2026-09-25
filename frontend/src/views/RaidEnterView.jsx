import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameState } from '../state/GameStateContext.jsx';
import { soundEngine } from '../soundEngine.js';

/** Full enter cinematic length — keep in sync with the timeout below. */
export const RAID_ENTER_SCREEN_MS = 5600;

const EASE = [0.16, 1, 0.3, 1];

/**
 * Dedicated full-screen animation after "Raid this base".
 * Replaces the finder entirely, then hands off to STEALTH_RAID.
 */
export default function RaidEnterView() {
  const { transitionTo, raidTargetId, raidLoot, showToast } = useGameState();
  const [phase, setPhase] = useState(0); // 0 prepare → 1 approach → 2 breach
  const started = React.useRef(false);

  useEffect(() => {
    try {
      soundEngine.playRaidEnterSound();
    } catch {
      /* gesture */
    }

    const p1 = window.setTimeout(() => setPhase(1), 1200);
    const p2 = window.setTimeout(() => setPhase(2), 3200);
    const go = window.setTimeout(() => {
      if (started.current) return;
      started.current = true;
      const defender = raidTargetId || raidLoot?.ownerId || raidLoot?.id;
      if (!defender) {
        showToast('No target', 'error');
        transitionTo('RAID_FINDER');
        return;
      }
      transitionTo('STEALTH_RAID', {
        defenderId: defender,
        raidLoot: raidLoot || undefined,
        skipEnterCinematic: true,
      });
    }, RAID_ENTER_SCREEN_MS);

    return () => {
      window.clearTimeout(p1);
      window.clearTimeout(p2);
      window.clearTimeout(go);
    };
  }, [raidTargetId, raidLoot, transitionTo, showToast]);

  const targetName = raidLoot?.name || 'Enemy fortress';

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a1214]">
      {/* Living background */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 40%, #1a3038 0%, #0d1b1e 55%, #070e10 100%)',
        }}
        animate={{ scale: [1, 1.04, 1.02] }}
        transition={{ duration: 4.2, ease: EASE }}
      />

      {/* Slow rotating searchlight */}
      <motion.div
        className="absolute left-1/2 top-[28%] w-[120vmax] h-[120vmax] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0deg, rgba(244,194,69,0.12) 18deg, transparent 40deg, transparent 180deg, rgba(244,162,97,0.08) 200deg, transparent 230deg)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
      />

      {/* Grayscale fortress grid — fades in */}
      <motion.div
        className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 w-[min(70vw,340px)] aspect-[4/3] rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #3a3a3a, #1a1a1a 60%, #0e0e0e)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.55)',
        }}
        initial={{ opacity: 0, y: 30, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.2, ease: EASE, delay: 0.15 }}
      >
        <div className="absolute inset-3 grid grid-cols-6 grid-rows-4 gap-1.5 opacity-70">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              className="rounded-sm"
              style={{
                background: i % 4 === 0 ? '#c8c8c8' : i % 3 === 0 ? '#7a7a7a' : '#3f3f3f',
              }}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.35, 0.9, 0.45] }}
              transition={{ duration: 2.8, delay: 0.4 + (i % 6) * 0.08, repeat: Infinity, repeatType: 'mirror' }}
            />
          ))}
        </div>
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
          }}
          animate={{ x: ['-60%', '120%'] }}
          transition={{ duration: 2.4, delay: 0.8, ease: EASE }}
        />
        <span className="absolute bottom-3 left-4 text-[10px] font-heading tracking-[0.25em] text-white/70 uppercase">
          Grayscale
        </span>
      </motion.div>

      {/* Copy block */}
      <div className="absolute inset-x-0 bottom-[18%] flex flex-col items-center px-8 text-center">
        <motion.p
          className="font-heading text-[11px] uppercase tracking-[0.4em] text-clay-accent mb-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
        >
          {phase === 0 ? 'Preparing' : phase === 1 ? 'Approaching' : 'Breaching'}
        </motion.p>

        <motion.h1
          className="font-heading font-semibold text-clay-text leading-tight"
          style={{ fontSize: 'clamp(1.85rem, 6.5vw, 3rem)', letterSpacing: '-0.03em' }}
          initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.15, delay: 0.45, ease: EASE }}
        >
          Raid this base
        </motion.h1>

        <motion.p
          className="mt-3 text-[13px] text-clay-muted max-w-[28ch]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.85, ease: EASE }}
        >
          {targetName} · match camo · stay out of the beam
        </motion.p>

        {/* Long progress */}
        <motion.div
          className="mt-8 w-[min(70vw,280px)] h-1 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="h-full rounded-full origin-left"
            style={{
              background: 'linear-gradient(90deg, #f4a261, #e63946)',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 5.2, ease: [0.1, 0.7, 0.2, 1] }}
          />
        </motion.div>
      </div>
    </div>
  );
}
