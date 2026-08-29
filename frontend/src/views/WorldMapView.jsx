import React, { useState } from 'react';
import IslandBackground from '../components/map/IslandBackground.jsx';
import SVGPlotOverlay from '../components/map/SVGPlotOverlay.jsx';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import SideProfilePanel from '../components/hud/SideProfilePanel.jsx';
import RTSCommandPanel from '../components/hud/RTSCommandPanel.jsx';
import RTSMinimapPanel from '../components/hud/RTSMinimapPanel.jsx';
import { useGameState } from '../state/GameStateContext.jsx';

export default function WorldMapView() {
  const { transitionTo } = useGameState();
  const [zoomScale, setZoomScale] = useState(1.0);

  const handlePlotClick = (plot) => {
    if (plot.status === 'CLAIMED_SELF') {
      transitionTo('BASE_BUILDER', { plotId: plot.id });
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05070a] flex flex-col">
      {/* ─── Top Floating Game Header HUD ─── */}
      <header className="absolute top-4 left-5 right-5 z-50 flex items-center justify-between pointer-events-none">
        {/* Logo Banner */}
        <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-3 pointer-events-auto shadow-glass">
          <span className="text-xl p-1.5 rounded-xl bg-amber-400/20 border border-amber-400/30 shadow-inner">
            🛡️
          </span>
          <div>
            <h1 className="font-heading font-extrabold text-sm md:text-base leading-tight bg-gradient-to-r from-white via-amber-300 to-sky-300 bg-clip-text text-transparent">
              SHADOW PALETTE
            </h1>
            <p className="text-[10px] font-heading font-bold text-sky-400 uppercase tracking-widest">
              Stealth &amp; Siege
            </p>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <NavigationTabs />

        {/* Right Resource Bar */}
        <TopResourceBar />
      </header>

      {/* ─── Subtitle Guide Badge ─── */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <span className="glass-panel px-5 py-1.5 rounded-full text-xs font-bold text-sky-300 border border-sky-400/30 tracking-wide shadow-neonCyan flex items-center gap-2">
          <span>✨</span> Click any Sector Plot to Inspect or Claim Territory
        </span>
      </div>

      {/* ─── Main Island Diorama Viewport Stage ─── */}
      <main className="w-full h-full flex items-center justify-center relative overflow-hidden bg-radial-vignette">
        {/* Ambient Diorama Halo Glow behind Island */}
        <div className="absolute w-[800px] h-[600px] rounded-full bg-emerald-500/10 filter blur-[100px] pointer-events-none" />

        {/* 1024x819 Aspect-Ratio Locked Container (100% Pixel Aligned) */}
        <div
          style={{ transform: `scale(${zoomScale})` }}
          className="relative w-full max-w-[1400px] max-h-[85vh] aspect-[1024/819] transition-transform duration-200 ease-out select-none flex items-center justify-center"
        >
          {/* Layer 0: Static High-Resolution Island Terrain Image */}
          <IslandBackground />

          {/* Layer 1: Interactive SVG Vector Plot Overlay */}
          <SVGPlotOverlay onPlotClick={handlePlotClick} />
        </div>
      </main>

      {/* ─── Floating Zoom Controls ─── */}
      <div className="absolute top-24 left-5 z-40 glass-panel p-1.5 rounded-xl flex flex-col gap-1.5 shadow-glass pointer-events-auto">
        <button
          onClick={() => setZoomScale((z) => Math.min(1.4, z + 0.1))}
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center font-bold text-sm"
          title="Zoom In"
        >
          ➕
        </button>
        <button
          onClick={() => setZoomScale(1.0)}
          className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center justify-center font-bold text-xs"
          title="Reset Zoom"
        >
          1x
        </button>
        <button
          onClick={() => setZoomScale((z) => Math.max(0.7, z - 0.1))}
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center font-bold text-sm"
          title="Zoom Out"
        >
          ➖
        </button>
      </div>

      {/* ─── Floating Tactical HUD Overlays ─── */}
      <SideProfilePanel />
      <RTSCommandPanel />
      <RTSMinimapPanel />
    </div>
  );
}
