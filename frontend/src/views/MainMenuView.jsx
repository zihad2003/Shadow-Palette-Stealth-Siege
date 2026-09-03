import React, { useState, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useGameState } from '../state/GameStateContext.jsx';
import { COLORS } from '../colors.js';
import { setupPlayer } from '../api.js';
import { soundEngine } from '../soundEngine.js';
import ClayPanel from '../components/ui/ClayPanel.jsx';
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
    showToast,
    isFirstRun,
  } = useGameState();
  const [selectedChar, setSelectedChar] = useState(characterModel || 1);
  const [selectedCamo, setSelectedCamo] = useState(camoColor || 'BLUE');

  const charList = [
    { id: 1, name: 'Shadow Ninja', desc: 'Silent infiltration operative' },
    { id: 2, name: 'Forest Scout', desc: 'Tactical camouflage specialist' },
    { id: 3, name: 'Phantom Ghost', desc: 'High-stealth extraction operative' },
  ];

  const camoList = [
    { key: 'RED', hex: COLORS.RED, label: 'Red' },
    { key: 'GREEN', hex: COLORS.GREEN, label: 'Green' },
    { key: 'BLUE', hex: COLORS.BLUE, label: 'Blue' },
    { key: 'YELLOW', hex: COLORS.YELLOW, label: 'Yellow' },
    { key: 'PURPLE', hex: COLORS.PURPLE, label: 'Purple' },
  ];

  const handleStartGame = async () => {
    soundEngine.playClickSound();
    try {
      await setupPlayer(userId, selectedChar, selectedCamo);
      showToast('Operative setup synchronized!', 'success');
    } catch (e) {
      showToast('Profile saved locally', 'info');
    }
    setCharacterModel(selectedChar);
    setCamoColor(selectedCamo);
    transitionTo(isFirstRun ? 'PAINT_TUTORIAL' : 'BASE_BUILDER');
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-clay-bg p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(244,162,97,0.12)_0%,transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(42,157,143,0.1)_0%,transparent_50%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-stretch">
        <ClayPanel depth="deep" className="p-4 rounded-[28px] flex flex-col min-h-[320px]">
          <p className="text-[10px] font-heading font-bold text-clay-accent uppercase tracking-widest text-center mb-1">
            Operative Preview
          </p>
          <div className="flex-1 clay-inset rounded-3xl overflow-hidden h-[280px] min-h-[280px]">
            <Suspense fallback={<div className="w-full h-full min-h-[240px]" />}>
              <CharacterPreview characterModel={selectedChar} camoColor={selectedCamo} />
            </Suspense>
          </div>
        </ClayPanel>

        <ClayPanel depth="deep" delay={0.06} className="p-7 rounded-[28px] flex flex-col items-center gap-5">
          <div className="text-center flex flex-col gap-1">
            <h1 className="font-heading font-extrabold text-2xl md:text-3xl tracking-wider text-clay-text">
              Shadow Palette
            </h1>
            <p className="text-xs text-clay-muted">
              Pick your operative and a starting camouflage. Change body color later at the Makeup House.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            {charList.map((c) => {
              const isSelected = selectedChar === c.id;
              return (
                <ClayButton
                  key={c.id}
                  variant={isSelected ? 'primary' : 'ghost'}
                  onClick={() => {
                    soundEngine.playClickSound();
                    setSelectedChar(c.id);
                  }}
                  className="p-4 rounded-2xl flex flex-col items-center text-center gap-2"
                >
                  <h3 className="font-heading font-bold text-xs tracking-wide">{c.name}</h3>
                  <p className={`text-[10px] ${isSelected ? 'text-clay-bg/70' : 'text-clay-muted'}`}>{c.desc}</p>
                </ClayButton>
              );
            })}
          </div>

          <div className="w-full clay-inset p-4 rounded-2xl flex flex-col items-center gap-3">
            <h3 className="font-heading font-bold text-xs text-clay-accent uppercase tracking-wider">
              Starting Camo Color
            </h3>
            <p className="text-[11px] text-clay-muted text-center">
              One color. Makeup House can change it later — never during a raid.
            </p>
            <div className="flex items-center gap-3">
              {camoList.map((c) => {
                const isSelected = selectedCamo === c.key;
                return (
                  <motion.button
                    key={c.key}
                    type="button"
                    style={{ backgroundColor: c.hex }}
                    onClick={() => {
                      soundEngine.playPaintSound();
                      setSelectedCamo(c.key);
                    }}
                    className={`w-11 h-11 rounded-full clay-blob ${isSelected ? 'ring-2 ring-clay-text' : ''}`}
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 2 }}
                    title={`${c.key} (${c.label})`}
                    aria-label={c.key}
                  />
                );
              })}
            </div>
          </div>

          <ClayButton
            variant="success"
            onClick={handleStartGame}
            className="w-full max-w-xs py-3 rounded-2xl text-sm flex items-center justify-center gap-2"
          >
            {isFirstRun ? 'Continue to Training' : 'Enter Your Base'} <ArrowRight size={16} />
          </ClayButton>
        </ClayPanel>
      </div>
    </div>
  );
}
