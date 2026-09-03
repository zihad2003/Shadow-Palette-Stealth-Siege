import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useGameState } from '../state/GameStateContext.jsx';
import { COLORS } from '../colors.js';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';

const LINES = [
  {
    title: 'The island lost its color.',
    body: 'Every operative guards a clay fortress. Yours starts unpainted. Five colors. One Searchlight in the center.',
  },
  {
    title: 'Paint is power.',
    body: 'Ink is fuel. You paint your base with red, green, blue, yellow, and purple. Attackers pick one of those colors at the Makeup House.',
  },
  {
    title: 'Raids are grayscale.',
    body: 'Raids drain the world to grayscale. Your body stays colored. Stand on matching tiles when the Searchlight sweeps, or the siren wakes the robot.',
  },
];

export default function StoryView() {
  const { transitionTo } = useGameState();

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-clay-bg p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(38,70,83,0.35)_0%,transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_75%,rgba(244,162,97,0.1)_0%,transparent_50%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-4">
        <motion.p
          className="text-[10px] font-heading font-bold uppercase tracking-[0.3em] text-clay-accent text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          Mission Briefing
        </motion.p>

        {LINES.map((line, i) => (
          <motion.div
            key={line.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.35, duration: 0.5, ease: 'easeOut' }}
          >
            <ClayPanel depth="deep" className="p-5 rounded-[24px]">
              <h2 className="font-heading font-extrabold text-lg text-clay-text mb-1">{line.title}</h2>
              <p className="text-xs text-clay-muted leading-relaxed">{line.body}</p>
            </ClayPanel>
          </motion.div>
        ))}

        <motion.div
          className="flex items-center justify-center gap-3 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.4 }}
        >
          <div className="flex items-center gap-2">
            {[COLORS.RED, COLORS.GREEN, COLORS.BLUE, COLORS.YELLOW, COLORS.PURPLE].map((hex) => (
              <span key={hex} className="w-4 h-4 rounded-full clay-blob" style={{ backgroundColor: hex }} />
            ))}
          </div>
          <ClayButton
            variant="success"
            onClick={() => transitionTo('MAIN_MENU')}
            className="px-6 py-3 rounded-2xl text-sm flex items-center gap-2"
          >
            Pick Your Operative <ArrowRight size={16} />
          </ClayButton>
        </motion.div>
      </div>
    </div>
  );
}
