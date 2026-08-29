import React from 'react';
import { GameStateProvider, useGameState } from './state/GameStateContext.jsx';
import MainMenuView from './views/MainMenuView.jsx';
import WorldMapView from './views/WorldMapView.jsx';
import BaseBuilderView from './views/BaseBuilderView.jsx';
import StealthRaidView from './views/StealthRaidView.jsx';
import OptionsModal from './components/hud/OptionsModal.jsx';
import LoadingOverlay from './components/hud/LoadingOverlay.jsx';
import ToastContainer from './components/hud/ToastContainer.jsx';

function GameViewRouter() {
  const { gameState } = useGameState();

  switch (gameState) {
    case 'MAIN_MENU':
      return <MainMenuView />;
    case 'BASE_BUILDER':
      return <BaseBuilderView />;
    case 'STEALTH_RAID':
      return <StealthRaidView />;
    case 'WORLD_MAP':
    default:
      return <WorldMapView />;
  }
}

export default function App() {
  return (
    <GameStateProvider>
      <div className="w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-body relative select-none">
        {/* Active Finite State View */}
        <GameViewRouter />

        {/* Global Floating Modals & Overlays */}
        <OptionsModal />
        <LoadingOverlay />
        <ToastContainer />
      </div>
    </GameStateProvider>
  );
}
