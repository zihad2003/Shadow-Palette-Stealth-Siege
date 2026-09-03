import React, { useRef, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import BuildBasePanel from '../components/hud/BuildBasePanel.jsx';
import BaseStatusPanel from '../components/hud/BaseStatusPanel.jsx';
import MakeupHousePanel from '../components/hud/MakeupHousePanel.jsx';
import HudBanner from '../components/ui/HudBanner.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import GameMap from '../gamemap/GameMap.jsx';
import { useGameState } from '../state/GameStateContext.jsx';

export default function BaseBuilderView() {
  const { paintTile, paintedTiles } = useGameState();
  const sceneApi = useRef(null);
  const [selectedTile, setSelectedTile] = useState(null);
  const [makeupOpen, setMakeupOpen] = useState(false);

  const handleTileClick = (data) => {
    setSelectedTile(data);
    paintTile(data.column, data.row);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-clay-bg">
      <GameMap
        apiRef={sceneApi}
        paintedTiles={paintedTiles}
        onTileClick={handleTileClick}
        showSearchlight
        showMakeupHouse
        onMakeupHouseClick={() => setMakeupOpen(true)}
      />

      <header className="absolute top-3 left-4 right-4 z-50 flex items-start justify-between pointer-events-none gap-3">
        <HudBanner icon="🏠" title="Your Base" subtitle="Paint tiles · Makeup House · Searchlight" />
        <NavigationTabs />
        <TopResourceBar />
      </header>

      <aside className="absolute left-4 top-28 z-40 hidden md:block">
        <BuildBasePanel />
      </aside>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 md:hidden pointer-events-auto">
        <BuildBasePanel />
      </div>

      <aside className="absolute right-4 top-28 z-40 hidden md:flex flex-col items-end gap-3">
        <BaseStatusPanel selectedTile={selectedTile} />
        <div className="flex flex-col gap-2 pointer-events-auto">
          <ClayButton
            variant="ghost"
            onClick={() => sceneApi.current && sceneApi.current.zoomIn()}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            aria-label="Zoom in"
          >
            <Plus size={16} />
          </ClayButton>
          <ClayButton
            variant="ghost"
            onClick={() => sceneApi.current && sceneApi.current.zoomOut()}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            aria-label="Zoom out"
          >
            <Minus size={16} />
          </ClayButton>
        </div>
      </aside>

      {makeupOpen && <MakeupHousePanel onClose={() => setMakeupOpen(false)} />}
    </div>
  );
}
