import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { useGameState } from '../state/GameStateContext.jsx';
import { GAME_COLOR_KEYS, GAME_COLORS } from '../colors.js';
import OnboardShell from '../components/ui/OnboardShell.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import { soundEngine } from '../soundEngine.js';

export default function SplashView() {
  const { transitionTo, isFirstRun, username, userId, loginOrRegister, provisionHomeBase } = useGameState();
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchName, setSwitchName] = useState('');

  useEffect(() => {
    // Only auto-advance for first-time onboarding if user does not click
    if (isFirstRun) {
      const t = window.setTimeout(() => transitionTo('STORY'), 2800);
      return () => window.clearTimeout(t);
    }
  }, [isFirstRun, transitionTo]);

  const handleResume = (e) => {
    e?.stopPropagation?.();
    soundEngine.playClickSound();
    provisionHomeBase();
    transitionTo('BASE_BUILDER');
  };

  const handleStartNew = (e) => {
    e?.stopPropagation?.();
    soundEngine.playClickSound();
    transitionTo('STORY');
  };

  const handleSwitchSubmit = async (e) => {
    e?.preventDefault?.();
    if (!switchName.trim()) return;
    await loginOrRegister(switchName.trim());
    setShowSwitchModal(false);
    setSwitchName('');
  };

  return (
    <div
      className="w-full h-full"
      onClick={isFirstRun ? () => transitionTo('STORY') : undefined}
    >
      <OnboardShell step={0}>
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-2.5">
            {GAME_COLOR_KEYS.map((key, i) => (
              <motion.span
                key={key}
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: GAME_COLORS[key] }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12 + i * 0.06, duration: 0.2 }}
              />
            ))}
          </div>
          <motion.h1
            className="font-heading font-semibold text-4xl md:text-6xl tracking-[0.14em] text-clay-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28, duration: 0.35 }}
          >
            SHADOW PALETTE
          </motion.h1>
          <motion.p
            className="text-[11px] tracking-[0.42em] uppercase text-clay-muted -mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.48, duration: 0.3 }}
          >
            Stealth &amp; Siege
          </motion.p>

          {!isFirstRun ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.3 }}
              className="flex flex-col items-center gap-3 mt-4"
            >
              <div className="px-4 py-2 rounded-2xl bg-black/20 border border-white/5 flex items-center gap-2 text-[12px] text-clay-muted">
                <span>Agent:</span>
                <span className="text-clay-text font-semibold">{username || `Player ${userId}`}</span>
                <span className="text-[10px] text-clay-muted/70 font-mono">#{userId}</span>
              </div>

              <ClayButton
                variant="success"
                onClick={handleResume}
                className="h-12 px-8 rounded-2xl text-[14px] font-semibold flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
              >
                <Play size={16} fill="currentColor" /> Resume Game
              </ClayButton>

              <div className="flex items-center gap-4 mt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playClickSound();
                    setShowSwitchModal(true);
                  }}
                  className="text-[11px] text-clay-muted/70 hover:text-clay-accent transition-colors"
                >
                  Switch / Login by Username
                </button>
                <span className="text-clay-muted/30">·</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playClickSound();
                    transitionTo('MAIN_MENU');
                  }}
                  className="text-[11px] text-clay-muted/70 hover:text-clay-text transition-colors"
                >
                  Customize Agent
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.3 }}
              className="flex flex-col items-center gap-2 mt-4"
            >
              <ClayButton
                variant="primary"
                onClick={handleStartNew}
                className="h-11 px-8 rounded-2xl text-[13px] font-semibold flex items-center gap-2"
              >
                Begin Journey <ArrowRight size={15} />
              </ClayButton>
            </motion.div>
          )}

          {showSwitchModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={(e) => {
                e.stopPropagation();
                setShowSwitchModal(false);
              }}
            >
              <div
                className="w-full max-w-sm p-6 rounded-3xl bg-[#141b22] border border-clay-border/60 shadow-2xl flex flex-col gap-4 text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <h3 className="text-[16px] font-heading font-semibold text-clay-text">Switch Agent / Login</h3>
                  <p className="text-[11px] text-clay-muted mt-0.5">
                    Enter your username to resume your account, or enter a new name to register a new player ID.
                  </p>
                </div>
                <form onSubmit={handleSwitchSubmit} className="flex flex-col gap-3">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Enter username (e.g. ShadowHunter)"
                    value={switchName}
                    onChange={(e) => setSwitchName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-black/40 border border-white/10 text-[13px] text-clay-text placeholder:text-clay-muted/50 focus:outline-none focus:border-clay-accent"
                    maxLength={20}
                  />
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <ClayButton
                      type="button"
                      variant="ghost"
                      onClick={() => setShowSwitchModal(false)}
                      className="h-9 px-4 rounded-xl text-[12px]"
                    >
                      Cancel
                    </ClayButton>
                    <ClayButton
                      type="submit"
                      variant="success"
                      className="h-9 px-5 rounded-xl text-[12px] font-semibold"
                    >
                      Confirm
                    </ClayButton>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </OnboardShell>
    </div>
  );
}
