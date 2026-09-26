import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ArrowRight } from 'lucide-react';
import { useGameState } from '../state/GameStateContext.jsx';
import { GAME_COLOR_KEYS, GAME_COLORS, COLOR_NAMES } from '../colors.js';
import { setupPlayer } from '../api.js';
import { soundEngine } from '../soundEngine.js';
import OnboardShell from '../components/ui/OnboardShell.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';

const CharacterPreview = lazy(() => import('../components/three/CharacterPreview.jsx'));

export default function MainMenuView() {
  const {
    userId,
    characterModel,
    setCharacterModel,
    camoColor,
    setCamoColor,
    transitionTo,
    isFirstRun,
    provisionHomeBase,
  } = useGameState();
  const [selectedChar, setSelectedChar] = useState(Number(characterModel) === 2 ? 2 : 1);
  const [selectedCamo, setSelectedCamo] = useState(camoColor || 'BLUE');

  useEffect(() => {
    soundEngine.playAmbient('menu');
  }, []);

  const handleStartGame = () => {
    soundEngine.playClickSound();
    setCharacterModel(selectedChar);
    setCamoColor(selectedCamo);
    provisionHomeBase();
    setupPlayer(userId, selectedChar, selectedCamo)
      .then((res) => {
        if (res?.plotId) provisionHomeBase(res.plotId);
      })
      .catch(() => {});
    transitionTo(isFirstRun ? 'PAINT_TUTORIAL' : 'BASE_BUILDER');
  };

  return (
    <OnboardShell
      step={5}
      footer={
        <div className="w-full max-w-3xl flex flex-col items-center gap-3">
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
          <button
            type="button"
            onClick={() => {
              soundEngine.playClickSound();
              transitionTo('ADMIN');
            }}
            className="text-[10px] text-clay-muted/70 hover:text-clay-accent"
          >
            Dashboard
          </button>
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
