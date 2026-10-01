import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameState } from '../state/GameStateContext.jsx';
import { soundEngine } from '../soundEngine.js';
import { ShieldAlert, Crosshair } from 'lucide-react';

/** Minimal fast enter cinematic length */
export const RAID_ENTER_SCREEN_MS = 1400;

export default function RaidEnterView() {
  const { transitionTo, raidTargetId, raidLoot, showToast } = useGameState();
  const nav = React.useRef({ transitionTo, raidLoot, showToast });
  nav.current = { transitionTo, raidLoot, showToast };

  useEffect(() => {
    try {
      soundEngine.playRaidEnterSound();
    } catch {
      /* user gesture */
    }

    const go = window.setTimeout(() => {
      const loot = nav.current.raidLoot;
      const defender = raidTargetId || loot?.ownerId || loot?.id;
      if (!defender) {
        nav.current.showToast('No target', 'error');
        nav.current.transitionTo('RAID_FINDER');
        return;
      }
      nav.current.transitionTo('STEALTH_RAID', {
        defenderId: defender,
        raidLoot: loot || undefined,
        skipEnterCinematic: true,
      });
    }, RAID_ENTER_SCREEN_MS);

    return () => window.clearTimeout(go);
  }, [raidTargetId]);

  const targetName = raidLoot?.name || 'Target Fortress';

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#070b0c] flex flex-col items-center justify-center select-none">
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(244,162,97,0.12) 0%, transparent 65%)',
        }}
      />

      {/* Minimalist central card */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-6"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {/* Animated Sonar / Target Icon */}
        <div className="relative mb-5 flex items-center justify-center">
          <motion.div
            className="absolute h-16 w-16 rounded-full border border-clay-accent/30"
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
          />
          <div className="h-12 w-12 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center text-clay-accent shadow-xl">
            <Crosshair size={22} className="animate-spin" style={{ animationDuration: '6s' }} />
          </div>
        </div>

        {/* Tactical status */}
        <span className="font-heading text-[10px] tracking-[0.3em] uppercase text-clay-accent font-semibold mb-1">
          Infiltration Protocol Active
        </span>

        {/* Target Name */}
        <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-white tracking-tight">
          {targetName}
        </h1>

        <p className="mt-1 text-[11px] text-clay-muted">
          Match camouflage · avoid searchlights · extract vault
        </p>

        {/* Sleek Minimal Progress Line */}
        <div className="mt-6 w-48 sm:w-60 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-clay-accent to-emerald-400 rounded-full origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.25, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </div>
  );
}
