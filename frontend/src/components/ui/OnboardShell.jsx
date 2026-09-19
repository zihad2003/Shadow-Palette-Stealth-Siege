import React from 'react';

const STEP_COUNT = 7;

export default function OnboardShell({ step = 0, children, footer = null }) {
  return (
    <div className="relative w-full h-full bg-clay-bg flex flex-col overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,rgba(244,162,97,0.07)_0%,transparent_42%)]" />

      <header className="relative z-10 h-14 px-6 md:px-10 flex items-center justify-between shrink-0">
        <p className="font-heading text-[11px] font-semibold tracking-[0.32em] uppercase text-clay-text">
          Shadow Palette
        </p>
        <ol className="flex items-center gap-2">
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <li
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${i === step ? 'bg-clay-accent' : 'bg-clay-muted/35'}`}
            />
          ))}
        </ol>
      </header>

      <div className="relative z-10 flex-1 min-h-0 overflow-hidden flex items-center justify-center px-6 md:px-10">
        {children}
      </div>

      {footer ? (
        <div className="relative z-20 shrink-0 px-6 md:px-10 py-4 flex justify-center pointer-events-auto">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
