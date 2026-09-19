import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useGameState } from '../state/GameStateContext.jsx';
import { GAME_COLOR_KEYS, GAME_COLORS, COLOR_NAMES } from '../colors.js';
import OnboardShell from '../components/ui/OnboardShell.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import { soundEngine } from '../soundEngine.js';

const RULES = [
  { n: '01', text: '5 ink per tile' },
  { n: '02', text: 'No color over 35%' },
  { n: '03', text: 'Match tiles to hide' },
];

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
    <OnboardShell
      step={6}
      footer={
        <ClayButton
          variant="success"
          onClick={enterBase}
          className="h-11 px-8 rounded-2xl text-[12px] flex items-center gap-2"
        >
          Enter base <ArrowRight size={14} />
        </ClayButton>
      }
    >
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-[1fr_11rem] gap-10 items-center">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            {GAME_COLOR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  soundEngine.playClickSound();
                  setDemoColor(key);
                }}
                className={`w-7 h-7 rounded-full clay-blob ${demoColor === key ? 'ring-2 ring-clay-text' : 'opacity-70'}`}
                style={{ backgroundColor: GAME_COLORS[key] }}
                aria-label={COLOR_NAMES[key]}
              />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5 clay-inset rounded-2xl p-3">
            {Array.from({ length: 16 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => paintDemo(i)}
                className="rounded-lg min-h-[40px]"
                style={{ backgroundColor: demoCells[i] ? GAME_COLORS[demoCells[i]] : 'rgba(241,250,238,0.08)' }}
                aria-label={`tile ${i + 1}`}
              />
            ))}
          </div>
        </div>
        <ul className="flex flex-col gap-5">
          {RULES.map((r) => (
            <li key={r.n} className="flex flex-col gap-0.5">
              <span className="font-heading text-[10px] tracking-[0.18em] text-clay-accent">{r.n}</span>
              <span className="text-[13px] text-clay-text">{r.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </OnboardShell>
  );
}
