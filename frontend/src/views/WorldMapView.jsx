import React, { useState, Suspense, lazy } from 'react';
import { Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import SideProfilePanel from '../components/hud/SideProfilePanel.jsx';
import RTSCommandPanel from '../components/hud/RTSCommandPanel.jsx';
import RTSMinimapPanel from '../components/hud/RTSMinimapPanel.jsx';
import HudBanner from '../components/ui/HudBanner.jsx';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import { useGameState } from '../state/GameStateContext.jsx';

const WorldMapScene = lazy(() => import('../components/worldmap/WorldMapScene.jsx'));

export default function WorldMapView() {
  const { plots, selectedPlot, setSelectedPlot, hoveredPlotId, setHoveredPlotId, transitionTo } =
    useGameState();
  const [zoomScale, setZoomScale] = useState(1.0);

  const handlePlotClick = (plot) => {
    setSelectedPlot(plot);
    if (plot.status === 'CLAIMED_SELF') {
      transitionTo('BASE_BUILDER', { plotId: plot.id });
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-clay-bg flex flex-col">
      <header className="absolute top-4 left-5 right-5 z-50 flex items-center justify-between pointer-events-none gap-3 flex-nowrap">
        <HudBanner icon="🛡️" title="Shadow Palette" subtitle="Stealth & Siege" />
        <NavigationTabs />
        <TopResourceBar />
      </header>

      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <ClayPanel className="px-5 py-1.5 rounded-full text-xs font-bold text-clay-accent tracking-wide">
          Drag to orbit · click a sector to inspect or claim
        </ClayPanel>
      </div>

      <main className="w-full h-full relative overflow-hidden">
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Suspense fallback={<div className="absolute inset-0 bg-clay-bg" />}>
            <WorldMapScene
              plots={plots}
              selectedPlot={selectedPlot}
              hoveredPlotId={hoveredPlotId}
              onHoverPlot={setHoveredPlotId}
              onSelectPlot={handlePlotClick}
              zoomScale={zoomScale}
            />
          </Suspense>
        </motion.div>
      </main>

      <ClayPanel className="absolute top-24 left-5 z-40 p-1.5 rounded-2xl flex flex-col gap-1.5 pointer-events-auto">
        <ClayButton
          variant="ghost"
          onClick={() => setZoomScale((z) => Math.min(1.4, z + 0.1))}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          title="Zoom In"
        >
          <Plus size={14} />
        </ClayButton>
        <ClayButton
          variant="primary"
          onClick={() => setZoomScale(1.0)}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px]"
          title="Reset Zoom"
        >
          1x
        </ClayButton>
        <ClayButton
          variant="ghost"
          onClick={() => setZoomScale((z) => Math.max(0.7, z - 0.1))}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          title="Zoom Out"
        >
          <Minus size={14} />
        </ClayButton>
      </ClayPanel>

      <SideProfilePanel />
      <RTSCommandPanel />
      <RTSMinimapPanel />
    </div>
  );
}
