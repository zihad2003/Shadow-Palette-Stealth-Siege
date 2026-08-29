import React from 'react';
import { useGameState } from '../../state/GameStateContext.jsx';

export default function ToastContainer() {
  const { toasts } = useGameState();

  return (
    <div className="fixed top-20 left-5 z-[150] flex flex-col gap-2 pointer-events-none max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-2xl font-heading font-bold text-xs shadow-glass backdrop-blur-xl border animate-slideIn ${
            t.type === 'error'
              ? 'bg-rose-950/70 border-rose-500/50 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
              : (t.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : 'bg-slate-900/80 border-sky-500/40 text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.2)]')
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
