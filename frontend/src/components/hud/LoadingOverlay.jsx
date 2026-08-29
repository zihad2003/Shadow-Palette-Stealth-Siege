import React from 'react';
import { useGameState } from '../../state/GameStateContext.jsx';

export default function LoadingOverlay() {
  const { loadingScreen } = useGameState();

  if (!loadingScreen.active) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
      <div className="glass-panel-deep p-8 rounded-3xl flex flex-col items-center gap-4 shadow-glassDeep max-w-sm text-center border border-sky-400/30">
        {/* Radar Spinner */}
        <div className="w-20 h-20 rounded-full border-2 border-sky-400/30 relative flex items-center justify-center bg-sky-500/5 shadow-[0_0_30px_rgba(56,189,248,0.2)]">
          <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg,rgba(56,189,248,0.7)_0deg,transparent_90deg)] animate-radar-sweep" />
          <div className="w-2 h-2 rounded-full bg-sky-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_#38bdf8]" />
        </div>

        {/* Text */}
        <h2 className="font-heading font-bold text-sm text-sky-400 tracking-widest uppercase text-shadow">
          {loadingScreen.title || 'INITIALIZING LINK...'}
        </h2>
        <p className="text-xs text-slate-400">
          {loadingScreen.subtitle || 'Syncing 2.5D Isometric Diorama Data'}
        </p>

        {/* Progress Bar */}
        <div className="w-56 h-1.5 rounded-full bg-white/10 overflow-hidden border border-sky-400/20">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all duration-150 shadow-[0_0_10px_#38bdf8]"
            style={{ width: `${loadingScreen.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
