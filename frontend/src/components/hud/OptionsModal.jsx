import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings, Volume2, Maximize2, User, X } from 'lucide-react';
import { useGameState } from '../../state/GameStateContext.jsx';
import { soundEngine } from '../../soundEngine.js';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

export default function OptionsModal() {
  const { isOptionsOpen, setIsOptionsOpen, transitionTo } = useGameState();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(50);

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
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <AnimatePresence>
      {isOptionsOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d1b1e]/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ClayPanel depth="deep" className="w-[440px] max-w-[92vw] p-6 rounded-[28px] flex flex-col gap-5 relative">
            <div className="flex items-center justify-between pb-2">
              <h2 className="font-heading font-bold text-base text-clay-accent tracking-wider flex items-center gap-2">
                <Settings size={16} /> Game Options
              </h2>
              <ClayButton
                variant="ghost"
                onClick={() => setIsOptionsOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                aria-label="Close options"
              >
                <X size={14} />
              </ClayButton>
            </div>

            <div className="clay-inset p-3.5 rounded-2xl flex flex-col gap-2.5">
              <span className="text-[11px] font-heading font-bold text-clay-success uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 size={12} /> Audio
              </span>
              <div className="flex items-center justify-between text-xs text-clay-text">
                <span>Sound Effects</span>
                <ClayButton
                  variant={soundEnabled ? 'success' : 'ghost'}
                  onClick={handleToggleSound}
                  className="px-3 py-1 rounded-xl text-xs"
                >
                  {soundEnabled ? 'ON' : 'OFF'}
                </ClayButton>
              </div>
              <div className="flex items-center justify-between text-xs text-clay-text">
                <span>Master Volume</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolume}
                  className="w-32 cursor-pointer"
                />
              </div>
            </div>

            <div className="clay-inset p-3.5 rounded-2xl flex flex-col gap-2.5">
              <span className="text-[11px] font-heading font-bold text-clay-success uppercase tracking-wider flex items-center gap-1.5">
                <Maximize2 size={12} /> Display
              </span>
              <div className="flex items-center justify-between text-xs text-clay-text">
                <span>Fullscreen Mode</span>
                <ClayButton variant="ghost" onClick={handleFullscreen} className="px-3 py-1 rounded-xl text-xs">
                  Toggle
                </ClayButton>
              </div>
            </div>

            <ClayButton
              variant="primary"
              onClick={() => {
                setIsOptionsOpen(false);
                transitionTo('MAIN_MENU');
              }}
              className="w-full py-2.5 rounded-2xl text-xs flex items-center justify-center gap-2"
            >
              <User size={14} /> Change Character & Camo
            </ClayButton>
          </ClayPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
