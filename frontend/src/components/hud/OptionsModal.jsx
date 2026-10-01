import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings, Volume2, Maximize2, User, X } from 'lucide-react';
import { useGameState } from '../../state/GameStateContext.jsx';
import { soundEngine } from '../../soundEngine.js';
import ClayPanel from '../ui/ClayPanel.jsx';
import ClayButton from '../ui/ClayButton.jsx';

function loginErrorText(code) {
  if (code === 'INVALID_PASSWORD') return 'That PIN does not match this player.';
  if (code === 'UNKNOWN_PLAYER') return 'No player uses that name. Create one instead.';
  if (code === 'USERNAME_TAKEN') return 'That name already has a player. Sign in instead.';
  if (code === 'WEAK_PIN') return 'PIN needs 4 to 20 characters.';
  if (code === 'INVALID_USERNAME') return 'Use 3–16 letters or numbers, starting with a letter.';
  if (code === 'PIN_NOT_SET') return 'This player has no PIN yet. Add one on the character screen.';
  if (code === 'OFFLINE') return 'The account server is not reachable yet.';
  return 'Could not open that player.';
}

export default function OptionsModal() {
  const {
    isOptionsOpen,
    setIsOptionsOpen,
    transitionTo,
    username,
    userId,
    hasPin,
    coins,
    successfulRaids,
    loginOrRegister,
    sessionStatus,
  } = useGameState();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(50);
  const [switching, setSwitching] = useState(false);
  const [mode, setMode] = useState('login');
  const [switchName, setSwitchName] = useState('');
  const [switchPass, setSwitchPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSwitchSubmit = async (e) => {
    e?.preventDefault?.();
    setLoginError('');
    if (busy) return;
    setBusy(true);
    const res = await loginOrRegister(switchName.trim(), switchPass.trim(), mode);
    setBusy(false);
    if (!res?.success || !res.userId) {
      setLoginError(loginErrorText(res?.error));
      return;
    }
    setSwitching(false);
    setSwitchName('');
    setSwitchPass('');
  };

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
          <ClayPanel depth="deep" className="w-[440px] max-w-[92vw] max-h-[88vh] overflow-y-auto p-6 rounded-[28px] flex flex-col gap-5 relative">
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

            {userId && (
              <div className="clay-inset p-3.5 rounded-2xl flex flex-col gap-2.5">
                <span className="text-[11px] font-heading font-bold text-clay-success uppercase tracking-wider flex items-center gap-1.5">
                  <User size={12} /> Player
                </span>
                <div className="flex items-center justify-between gap-3 text-xs text-clay-text">
                  <span className="font-semibold truncate">{username || `Player ${userId}`}</span>
                  <span className="text-[10px] text-clay-muted font-mono shrink-0">#{userId}</span>
                </div>
                <p className="text-[11px] text-clay-muted">
                  {`${coins} coins · ${successfulRaids} ${Number(successfulRaids) === 1 ? 'raid' : 'raids'}`}
                </p>
                {!hasPin && sessionStatus === 'ready' && (
                  <p className="text-[10px] text-clay-muted">
                    Add a PIN on the character screen so this progress can be opened on another device.
                  </p>
                )}
                {!switching ? (
                  <ClayButton
                    variant="ghost"
                    onClick={() => {
                      soundEngine.playClickSound();
                      setMode('login');
                      setLoginError('');
                      setSwitching(true);
                    }}
                    className="h-8 rounded-xl text-[11px]"
                  >
                    Different player
                  </ClayButton>
                ) : (
                  <form onSubmit={handleSwitchSubmit} className="flex flex-col gap-2">
                    <div className="flex gap-3 text-[11px]">
                      <button type="button" onClick={() => { setMode('login'); setLoginError(''); }} className={mode === 'login' ? 'text-clay-accent' : 'text-clay-muted'}>
                        Sign in
                      </button>
                      <button type="button" onClick={() => { setMode('register'); setLoginError(''); }} className={mode === 'register' ? 'text-clay-accent' : 'text-clay-muted'}>
                        New player
                      </button>
                    </div>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Player name"
                      value={switchName}
                      onChange={(e) => setSwitchName(e.target.value)}
                      maxLength={16}
                      className="w-full h-9 px-3 rounded-xl bg-black/40 border border-white/10 text-[12px] text-clay-text placeholder:text-clay-muted/50 focus:outline-none focus:border-clay-accent"
                    />
                    <input
                      type="password"
                      placeholder="PIN, 4 or more characters"
                      value={switchPass}
                      onChange={(e) => setSwitchPass(e.target.value)}
                      maxLength={20}
                      className="w-full h-9 px-3 rounded-xl bg-black/40 border border-white/10 text-[12px] text-clay-text placeholder:text-clay-muted/50 focus:outline-none focus:border-clay-accent"
                    />
                    {loginError && <p className="text-[11px] text-rose-400">{loginError}</p>}
                    <div className="flex justify-end gap-2">
                      <ClayButton type="button" variant="ghost" onClick={() => setSwitching(false)} className="h-8 px-3 rounded-xl text-[11px]">
                        Cancel
                      </ClayButton>
                      <ClayButton type="submit" variant="success" disabled={busy} className="h-8 px-3 rounded-xl text-[11px]">
                        {busy ? 'Opening…' : mode === 'register' ? 'Create' : 'Sign in'}
                      </ClayButton>
                    </div>
                  </form>
                )}
              </div>
            )}

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
