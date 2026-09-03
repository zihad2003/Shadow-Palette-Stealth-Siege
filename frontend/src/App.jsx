import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GameStateProvider, useGameState } from './state/GameStateContext.jsx';
import SplashView from './views/SplashView.jsx';
import StoryView from './views/StoryView.jsx';
import MainMenuView from './views/MainMenuView.jsx';
import PaintTutorialView from './views/PaintTutorialView.jsx';
import BaseBuilderView from './views/BaseBuilderView.jsx';
import RaidFinderView from './views/RaidFinderView.jsx';
import StealthRaidView from './views/StealthRaidView.jsx';
import OptionsModal from './components/hud/OptionsModal.jsx';
import LoadingOverlay from './components/hud/LoadingOverlay.jsx';
import ToastContainer from './components/hud/ToastContainer.jsx';

function GameViewRouter() {
  const { gameState } = useGameState();

  const view =
    gameState === 'SPLASH' ? (
      <SplashView />
    ) : gameState === 'STORY' ? (
      <StoryView />
    ) : gameState === 'MAIN_MENU' ? (
      <MainMenuView />
    ) : gameState === 'PAINT_TUTORIAL' ? (
      <PaintTutorialView />
    ) : gameState === 'RAID_FINDER' ? (
      <RaidFinderView />
    ) : gameState === 'STEALTH_RAID' ? (
      <StealthRaidView />
    ) : (
      <BaseBuilderView />
    );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={gameState}
        className="w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
      >
        {view}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <GameStateProvider>
      <div className="w-screen h-screen overflow-hidden bg-clay-bg text-clay-text font-body relative select-none">
        <GameViewRouter />
        <OptionsModal />
        <LoadingOverlay />
        <ToastContainer />
      </div>
    </GameStateProvider>
  );
}
