import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useGameState } from '../../state/GameStateContext.jsx';
import OnboardShell from './OnboardShell.jsx';
import ClayButton from './ClayButton.jsx';

export default function OnboardSlide({ step, title, lines, next, nextLabel = 'Next', extra = null }) {
  const { transitionTo } = useGameState();

  return (
    <OnboardShell
      step={step}
      footer={
        <ClayButton
          variant="success"
          onClick={() => transitionTo(next)}
          className="h-11 px-6 rounded-2xl text-[12px] flex items-center gap-2"
        >
          {nextLabel} <ArrowRight size={14} />
        </ClayButton>
      }
    >
      <div className="w-full max-w-lg flex flex-col gap-8">
        {title ? <h1 className="font-heading font-semibold text-2xl text-clay-text">{title}</h1> : null}
        {extra}
        <ul className="flex flex-col gap-7">
          {lines.map((line) => (
            <li key={line.n} className="grid grid-cols-[2.5rem_1fr] gap-4 items-baseline">
              <span className="font-heading text-[11px] tracking-[0.18em] text-clay-accent">{line.n}</span>
              <div>
                <h2 className="font-heading font-semibold text-lg text-clay-text">{line.title}</h2>
                {line.body ? <p className="mt-1 text-[13px] text-clay-muted">{line.body}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </OnboardShell>
  );
}
