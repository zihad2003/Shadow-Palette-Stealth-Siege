import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Droplets, Paintbrush } from 'lucide-react';
import { useGameState } from '../state/GameStateContext.jsx';
import { GAME_COLOR_KEYS, GAME_COLORS, COLOR_NAMES } from '../colors.js';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import { soundEngine } from '../soundEngine.js';

export default function PaintTutorialView() {
  const { transitionTo, markIntroDone } = useGameState();
  const [demoColor, setDemoColor] = useState('GREEN');
  const [demoCells, setDemoCells] = useState({});

  const paintDemo = (i) => {
    soundEngine.playPaintSound();
    setDemoCells((prev) => ({ ...prev, [i]: demoColor }));
  };

  const enterBase = () => {
    markIntroDone();
    transitionTo('BASE_BUILDER');
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-clay-bg p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(42,157,143,0.14)_0%,transparent_55%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-3xl flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="text-center"
        >
          <p className="text-[10px] font-heading font-bold uppercase tracking-[0.3em] text-clay-accent mb-1">
            Field Training
          </p>
          <h1 className="font-heading font-extrabold text-2xl text-clay-text">How to paint your base</h1>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45, ease: 'easeOut' }}
          >
            <ClayPanel depth="deep" className="p-5 rounded-[24px] h-full flex flex-col gap-3">
              <h3 className="font-heading font-bold text-sm text-clay-accent flex items-center gap-2">
                <Paintbrush size={15} /> Try it — pick a color, tap the clay
              </h3>
              <div className="flex items-center gap-2">
                {GAME_COLOR_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      soundEngine.playClickSound();
                      setDemoColor(key);
                    }}
                    className={`w-8 h-8 rounded-full clay-blob ${demoColor === key ? 'ring-2 ring-clay-text' : ''}`}
                    style={{ backgroundColor: GAME_COLORS[key] }}
                    aria-label={COLOR_NAMES[key]}
                  />
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1.5 flex-1 clay-inset rounded-2xl p-3">
                {Array.from({ length: 16 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => paintDemo(i)}
                    className="rounded-lg min-h-[34px] transition-colors duration-150"
                    style={{ backgroundColor: demoCells[i] ? GAME_COLORS[demoCells[i]] : 'rgba(241,250,238,0.08)' }}
                    aria-label={`demo cell ${i + 1}`}
                  />
                ))}
              </div>
            </ClayPanel>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.45, ease: 'easeOut' }}
            className="flex flex-col gap-3"
          >
            <ClayPanel depth="deep" className="p-4 rounded-[24px]">
              <h3 className="font-heading font-bold text-xs text-clay-accent flex items-center gap-2 mb-1">
                <Droplets size={14} /> Ink is the cost
              </h3>
              <p className="text-[11px] text-clay-muted leading-relaxed">
                Every paint stroke on the ground costs <b className="text-clay-text">5 Ink</b>. Repainting a
                building costs 5 Ink too. The Ink House brews more over time.
              </p>
            </ClayPanel>
            <ClayPanel depth="deep" className="p-4 rounded-[24px]">
              <h3 className="font-heading font-bold text-xs text-clay-accent mb-1">The 35% rule</h3>
              <p className="text-[11px] text-clay-muted leading-relaxed">
                No color may cover more than <b className="text-clay-text">35%</b> of your base. Spread your
                palette — a one-color fortress is an easy fortress to read.
              </p>
            </ClayPanel>
            <ClayPanel depth="deep" className="p-4 rounded-[24px]">
              <h3 className="font-heading font-bold text-xs text-clay-accent mb-1">Color is camouflage</h3>
              <p className="text-[11px] text-clay-muted leading-relaxed">
                Paint with five colors. Before a raid, pick one at the Makeup House. Matching tiles hide you
                from the Searchlight.
              </p>
            </ClayPanel>
          </motion.div>
        </div>

        <motion.div
          className="flex justify-center mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          <ClayButton
            variant="success"
            onClick={enterBase}
            className="px-8 py-3 rounded-2xl text-sm flex items-center gap-2"
          >
            Enter Home Base <ArrowRight size={16} />
          </ClayButton>
        </motion.div>
      </div>
    </div>
  );
}
