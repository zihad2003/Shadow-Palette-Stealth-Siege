import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { useGameState } from '../state/GameStateContext.jsx';
import { GAME_COLOR_KEYS, GAME_COLORS } from '../colors.js';
import OnboardShell from '../components/ui/OnboardShell.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import { soundEngine } from '../soundEngine.js';

function loginErrorText(code) {
  if (code === 'INVALID_PASSWORD') return 'That PIN does not match this player.';
  if (code === 'UNKNOWN_PLAYER') return 'No player uses that name. Create one instead.';
  if (code === 'USERNAME_TAKEN') return 'That name already has a player. Sign in instead.';
  if (code === 'WEAK_PIN') return 'PIN needs 4 to 20 characters.';
  if (code === 'INVALID_USERNAME') return 'Use 3–16 letters or numbers, starting with a letter.';
  if (code === 'PIN_NOT_SET') return 'This player has no PIN yet. Open them on the device that created them, then add a PIN.';
  if (code === 'OFFLINE') return 'The account server is not reachable yet.';
  return 'Could not open that player.';
}

export default function SplashView() {
  const {
    transitionTo,
    isFirstRun,
    userId,
    loginOrRegister,
    provisionHomeBase,
    sessionStatus,
    retrySession,
  } = useGameState();
  const [mode, setMode] = useState('register');
  const [switchName, setSwitchName] = useState('');
  const [switchPass, setSwitchPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [busy, setBusy] = useState(false);
  const identified = !!userId && (sessionStatus === 'ready' || sessionStatus === 'offline');
  const showForm = sessionStatus === 'login' || (!userId && sessionStatus !== 'connecting');

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
    e?.stopPropagation?.();
    setLoginError('');
    if (busy) return;
    setBusy(true);
    const res = await loginOrRegister(switchName.trim(), switchPass.trim(), mode);
    setBusy(false);
    if (!res?.success || !res.userId) {
      setLoginError(loginErrorText(res?.error));
      return;
    }
    setSwitchName('');
    setSwitchPass('');
    provisionHomeBase();
  };

  return (
    <div
      className="w-full h-full"
      onClick={isFirstRun && identified && !showForm ? () => transitionTo('STORY') : undefined}
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

          {sessionStatus === 'connecting' && (
            <p className="text-[12px] text-clay-muted mt-4">Checking your player…</p>
          )}

          {sessionStatus === 'offline' && (
            <div className="mt-3 flex flex-col items-center gap-2">
              <p className="text-[12px] text-clay-muted">The account server is still waking up.</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  retrySession();
                }}
                className="text-[11px] text-clay-accent"
              >
                Try again
              </button>
            </div>
          )}

          {identified && !showForm && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.3 }}
              className="flex flex-col items-center gap-3 mt-4"
            >
              {isFirstRun ? (
                <ClayButton
                  variant="primary"
                  onClick={handleStartNew}
                  className="h-11 px-8 rounded-2xl text-[13px] font-semibold flex items-center gap-2"
                >
                  Begin Journey <ArrowRight size={15} />
                </ClayButton>
              ) : (
                <ClayButton
                  variant="success"
                  onClick={handleResume}
                  className="h-12 px-8 rounded-2xl text-[14px] font-semibold flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
                >
                  <Play size={16} fill="currentColor" /> Resume Game
                </ClayButton>
              )}

            </motion.div>
          )}

          {showForm && (
            <div
              className="mt-4 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="w-full max-w-sm p-6 rounded-3xl bg-[#141b22] border border-clay-border/60 shadow-2xl flex flex-col gap-4 text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <h3 className="text-[16px] font-heading font-semibold text-clay-text">
                    {mode === 'register' ? 'Create your player' : 'Sign in'}
                  </h3>
                  <p className="text-[11px] text-clay-muted mt-0.5">
                    {mode === 'register'
                      ? 'Your name and PIN are how this fortress is found again. Progress stays on that player.'
                      : 'The same name and PIN load that player’s coins, base, and raids.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setLoginError(''); }}
                    className={`text-[11px] ${mode === 'register' ? 'text-clay-accent' : 'text-clay-muted'}`}
                  >
                    New player
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setLoginError(''); }}
                    className={`text-[11px] ${mode === 'login' ? 'text-clay-accent' : 'text-clay-muted'}`}
                  >
                    I already play
                  </button>
                </div>
                <form onSubmit={handleSwitchSubmit} className="flex flex-col gap-3">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Player name"
                    value={switchName}
                    onChange={(e) => setSwitchName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-black/40 border border-white/10 text-[13px] text-clay-text placeholder:text-clay-muted/50 focus:outline-none focus:border-clay-accent"
                    maxLength={16}
                  />
                  <input
                    type="password"
                    placeholder="PIN, 4 or more characters"
                    value={switchPass}
                    onChange={(e) => setSwitchPass(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-black/40 border border-white/10 text-[13px] text-clay-text placeholder:text-clay-muted/50 focus:outline-none focus:border-clay-accent"
                    maxLength={20}
                  />
                  {loginError && (
                    <p className="text-[11px] text-rose-400">{loginError}</p>
                  )}
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <ClayButton
                      type="submit"
                      variant="success"
                      disabled={busy}
                      className="h-9 px-5 rounded-xl text-[12px] font-semibold"
                    >
                      {busy ? 'Saving…' : mode === 'register' ? 'Create player' : 'Sign in'}
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
