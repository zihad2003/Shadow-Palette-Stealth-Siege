import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ArrowRight, User } from 'lucide-react';
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
  } = useGameState();
  const [selectedChar, setSelectedChar] = useState(Number(characterModel) === 2 ? 2 : 1);
  const [selectedCamo, setSelectedCamo] = useState(camoColor || 'BLUE');
  const [inputName, setInputName] = useState(username || `Player${userId}`);

  useEffect(() => {
    soundEngine.playAmbient('menu');
  }, []);

  const handleStartGame = async () => {
    soundEngine.playClickSound();
    const finalName = inputName.trim() || `Player${userId}`;
    setUsername(finalName);
    setCharacterModel(selectedChar);
    setCamoColor(selectedCamo);
    provisionHomeBase();
    markIntroDone();

    try {
      const sessionRes = await startSession(userId, finalName);
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
          <div className="w-full max-w-xs flex items-center gap-2 bg-black/20 border border-white/10 rounded-2xl px-3 py-1.5 shadow-inner">
            <User size={14} className="text-clay-muted shrink-0" />
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder={`Player${userId}`}
              maxLength={20}
              className="w-full bg-transparent text-[13px] text-clay-text font-medium outline-none placeholder:text-clay-muted/40"
            />
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

          <ClayButton
            variant="success"
            onClick={handleStartGame}
            className="h-11 px-8 rounded-2xl text-[12px] flex items-center gap-2"
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
