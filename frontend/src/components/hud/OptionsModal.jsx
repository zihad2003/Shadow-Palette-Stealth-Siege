import React, { useState } from 'react';
import { useGameState } from '../../state/GameStateContext.jsx';
import { soundEngine } from '../../soundEngine.js';

export default function OptionsModal() {
  const { isOptionsOpen, setIsOptionsOpen, transitionTo } = useGameState();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(50);

  if (!isOptionsOpen) return null;

  const handleToggleSound = () => {
    const muted = soundEngine.toggleMute();
    setSoundEnabled(!muted);
    if (!muted) soundEngine.playClickSound();
  };

  const handleVolume = (e) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    soundEngine.setVolume(val / 100);
  };

  const handleFullscreen = () => {
    soundEngine.playClickSound();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-[440px] max-w-[92vw] glass-panel-deep p-6 rounded-3xl flex flex-col gap-5 shadow-glassDeep border border-white/10 relative overflow-hidden">
        {/* Shimmer Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h2 className="font-heading font-bold text-base text-amber-400 tracking-wider">
            ⚙️ GAME OPTIONS & SETTINGS
          </h2>
          <button
            onClick={() => setIsOptionsOpen(false)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-all flex items-center justify-center font-bold"
          >
            ✖
          </button>
        </div>

        {/* Audio Section */}
        <div className="bg-black/30 p-3.5 rounded-xl flex flex-col gap-2.5 border border-white/5">
          <span className="text-[11px] font-heading font-bold text-sky-400 uppercase tracking-wider">
            🔊 Audio & Sound FX
          </span>
          <div className="flex items-center justify-between text-xs text-slate-200">
            <span>Sound Effects (SFX)</span>
            <button
              onClick={handleToggleSound}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-neonEmerald'
                  : 'bg-white/5 text-slate-500 border border-white/10'
              }`}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-200">
            <span>Master Volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolume}
              className="w-32 accent-sky-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Display Section */}
        <div className="bg-black/30 p-3.5 rounded-xl flex flex-col gap-2.5 border border-white/5">
          <span className="text-[11px] font-heading font-bold text-sky-400 uppercase tracking-wider">
            🖥️ Display & Fullscreen
          </span>
          <div className="flex items-center justify-between text-xs text-slate-200">
            <span>Fullscreen Mode</span>
            <button
              onClick={handleFullscreen}
              className="px-3 py-1 rounded-lg font-bold text-xs bg-sky-500/20 text-sky-300 border border-sky-400/30 hover:bg-sky-500/30 transition-all"
            >
              📺 Toggle Fullscreen
            </button>
          </div>
        </div>

        {/* Quick Profile Setup */}
        <button
          onClick={() => {
            setIsOptionsOpen(false);
            transitionTo('MAIN_MENU');
          }}
          className="w-full py-2.5 rounded-xl font-heading font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30 transition-all text-center shadow-neonGold"
        >
          👤 Change Character & Camo Setup
        </button>
      </div>
    </div>
  );
}
