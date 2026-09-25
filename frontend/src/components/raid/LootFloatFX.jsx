import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, Droplet } from 'lucide-react';

/**
 * Floating +N burst when stealing coins/ink from an enemy house.
 * items: { id, kind: 'coin'|'ink', amount, x?, y? }[]
 */
export default function LootFloatFX({ items = [], onDone }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[80] overflow-hidden">
      <AnimatePresence>
        {items.map((item) => {
          const isCoin = item.kind === 'coin';
          const left = item.x != null ? `${item.x * 100}%` : '50%';
          const top = item.y != null ? `${item.y * 100}%` : '58%';
          return (
            <motion.div
              key={item.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
              style={{
                left,
                top,
                background: isCoin
                  ? 'linear-gradient(180deg, #ffd56a, #f0a020)'
                  : 'linear-gradient(180deg, #4ecdc0, #2a9d8f)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
                color: isCoin ? '#4a2200' : '#f1faee',
              }}
              initial={{ opacity: 0, scale: 0.6, y: 18 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.12, 1, 0.95], y: [18, -8, -40, -70] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
              onAnimationComplete={() => onDone?.(item.id)}
            >
              {isCoin ? <Coins size={14} /> : <Droplet size={14} />}
              <span className="font-heading font-black text-sm tracking-wide">+{item.amount}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
