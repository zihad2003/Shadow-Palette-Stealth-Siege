import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ArrowRight, User, Lock, CheckSquare, Square } from 'lucide-react';
import { useGameState } from '../state/GameStateContext.jsx';
import { GAME_COLOR_KEYS, GAME_COLORS, COLOR_NAMES } from '../colors.js';
import { setupPlayer, startSession } from '../api.js';
import { soundEngine } from '../soundEngine.js';
import OnboardShell from '../components/ui/OnboardShell.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';

const CharacterPreview = lazy(() => import('../components/three/CharacterPreview.jsx'));

export default function MainMenuView() {
  const {
    userId,
    setUserId,
    username,
    setUsername,
    characterModel,
    setCharacterModel,
    camoColor,
    setCamoColor,
    transitionTo,
    isFirstRun,
    markIntroDone,
    provisionHomeBase,
    showToast,
  } = useGameState();
  const [selectedChar, setSelectedChar] = useState(Number(characterModel) === 2 ? 2 : 1);
  const [selectedCamo, setSelectedCamo] = useState(camoColor || 'BLUE');
  const [inputName, setInputName] = useState(username || `Player${userId || ''}`);
  const [inputPass, setInputPass] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    soundEngine.playAmbient('menu');
  }, []);

  const handleStartGame = async () => {
    if (!termsAccepted) {
      showToast('Please check the Island Protocol agreement to enter', 'error');
      return;
    }
    soundEngine.playClickSound();
    const finalName = inputName.trim() || `Player${userId || 20161}`;
    setUsername(finalName);
    setCharacterModel(selectedChar);
    setCamoColor(selectedCamo);
    provisionHomeBase();
    markIntroDone();

    try {
      const sessionRes = await startSession(userId, finalName, inputPass.trim() || undefined);
      const activeId = sessionRes?.userId || userId;
      if (sessionRes?.userId) {
        setUserId(sessionRes.userId);
        if (sessionRes.username) setUsername(sessionRes.username);
      }
      const setupRes = await setupPlayer(activeId, selectedChar, selectedCamo, finalName);
      if (setupRes?.plotId) provisionHomeBase(setupRes.plotId);
    } catch {
      // offline / saved locally
    }

    transitionTo(isFirstRun ? 'PAINT_TUTORIAL' : 'BASE_BUILDER');
  };

  return (
    <OnboardShell
      step={5}
      footer={
        <div className="w-full max-w-3xl flex flex-col items-center gap-3">
          <div className="w-full max-w-md flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-black/20 border border-white/10 rounded-2xl px-3 py-1.5 shadow-inner">
              <User size={14} className="text-clay-muted shrink-0" />
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="Agent Username"
                maxLength={20}
                className="w-full bg-transparent text-[13px] text-clay-text font-medium outline-none placeholder:text-clay-muted/40"
              />
            </div>
            <div className="w-40 flex items-center gap-2 bg-black/20 border border-white/10 rounded-2xl px-3 py-1.5 shadow-inner">
              <Lock size={14} className="text-clay-muted shrink-0" />
              <input
                type="password"
                value={inputPass}
                onChange={(e) => setInputPass(e.target.value)}
                placeholder="PIN / Pass (opt)"
                maxLength={20}
                className="w-full bg-transparent text-[13px] text-clay-text font-medium outline-none placeholder:text-clay-muted/40"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[
              { id: 1, label: 'Male' },
              { id: 2, label: 'Female' },
            ].map((c) => (
              <ClayButton
                key={c.id}
                variant={selectedChar === c.id ? 'primary' : 'ghost'}
                onClick={() => {
                  soundEngine.playClickSound();
                  setSelectedChar(c.id);
                }}
                className="h-11 px-5 rounded-2xl text-[12px]"
              >
                {c.label}
              </ClayButton>
            ))}
            <span className="w-px h-6 bg-clay-muted/25 mx-1" />
            {GAME_COLOR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  soundEngine.playPaintSound();
                  setSelectedCamo(key);
                }}
                className={`w-8 h-8 rounded-full clay-blob ${selectedCamo === key ? 'ring-2 ring-clay-text' : 'opacity-70'}`}
                style={{ backgroundColor: GAME_COLORS[key] }}
                title={COLOR_NAMES[key]}
                aria-label={COLOR_NAMES[key]}
              />
            ))}
          </div>

          {/* Game-related Terms and Conditions Checkbox */}
          <div
            onClick={() => setTermsAccepted(!termsAccepted)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-black/15 border border-white/5 cursor-pointer select-none max-w-md hover:bg-black/25 transition-colors"
          >
            {termsAccepted ? (
              <CheckSquare size={16} className="text-clay-accent shrink-0" />
            ) : (
              <Square size={16} className="text-clay-muted shrink-0" />
            )}
            <p className="text-[11px] text-clay-muted leading-tight">
              I accept the <span className="text-clay-text font-semibold">Island Code</span>: 5 ink per tile, max 35% single color quota, and protect my fortress during live raids.
            </p>
          </div>

          <ClayButton
            variant={termsAccepted ? 'success' : 'ghost'}
            onClick={handleStartGame}
            className={`h-11 px-8 rounded-2xl text-[12px] flex items-center gap-2 ${!termsAccepted ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isFirstRun ? 'Train' : 'Enter base'} <ArrowRight size={14} />
          </ClayButton>
        </div>
      }
    >
      <div className="w-full max-w-md h-full max-h-[min(52vh,380px)] clay-inset rounded-[28px] overflow-hidden">
        <Suspense fallback={<div className="w-full h-full" />}>
          <CharacterPreview characterModel={selectedChar} camoColor={selectedCamo} />
        </Suspense>
      </div>
    </OnboardShell>
  );
}
