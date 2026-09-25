import React from 'react';
import { GameStateProvider, useGameState } from './state/GameStateContext.jsx';
import SplashView from './views/SplashView.jsx';
import {
  StoryView,
  FortressIntroView,
  ColorIntroView,
  RaidIntroView,
} from './views/OnboardSlides.jsx';
import MainMenuView from './views/MainMenuView.jsx';
import PaintTutorialView from './views/PaintTutorialView.jsx';
import BaseBuilderView from './views/BaseBuilderView.jsx';
import RaidFinderView from './views/RaidFinderView.jsx';
import RaidEnterView from './views/RaidEnterView.jsx';
import StealthRaidView from './views/StealthRaidView.jsx';
import AdminDashboardView from './views/AdminDashboardView.jsx';
import OptionsModal from './components/hud/OptionsModal.jsx';
import MetaEconomyPanel from './components/hud/MetaEconomyPanel.jsx';
import LoadingOverlay from './components/hud/LoadingOverlay.jsx';
import ToastContainer from './components/hud/ToastContainer.jsx';
import VisitHud from './components/hud/VisitHud.jsx';

class ScreenError extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <p className="text-[13px] text-clay-accent">{String(this.state.err.message || this.state.err)}</p>
      </div>
    );
  }
}

function GameViewRouter() {
  const { gameState } = useGameState();

  const view =
    gameState === 'SPLASH' ? (
      <SplashView />
    ) : gameState === 'STORY' ? (
      <StoryView />
    ) : gameState === 'INTRO_FORTRESS' ? (
      <FortressIntroView />
    ) : gameState === 'INTRO_COLOR' ? (
      <ColorIntroView />
    ) : gameState === 'INTRO_RAID' ? (
      <RaidIntroView />
    ) : gameState === 'MAIN_MENU' ? (
      <MainMenuView />
    ) : gameState === 'PAINT_TUTORIAL' ? (
      <PaintTutorialView />
    ) : gameState === 'RAID_FINDER' ? (
      <RaidFinderView />
    ) : gameState === 'RAID_ENTER' ? (
      <RaidEnterView />
    ) : gameState === 'STEALTH_RAID' ? (
      <StealthRaidView />
    ) : gameState === 'ADMIN' ? (
      <AdminDashboardView />
    ) : (
      <BaseBuilderView />
    );

  return <div className="w-full h-full">{view}</div>;
}

export default function App() {
  return (
    <GameStateProvider>
      <div className="w-screen h-screen overflow-hidden bg-clay-bg text-clay-text font-body relative select-none">
        <ScreenError>
          <GameViewRouter />
          <OptionsModal />
          <MetaEconomyPanel />
          <LoadingOverlay />
          <VisitHud />
          <ToastContainer />
        </ScreenError>
      </div>
    </GameStateProvider>
  );
}

