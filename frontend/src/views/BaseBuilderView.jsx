import React, { useRef, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import BottomBuildDock from '../components/hud/BottomBuildDock.jsx';
import BaseStatusPanel from '../components/hud/BaseStatusPanel.jsx';
import MakeupHousePanel from '../components/hud/MakeupHousePanel.jsx';
import HudBanner from '../components/ui/HudBanner.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import GameMap from '../gamemap/GameMap.jsx';
import { useGameState } from '../state/GameStateContext.jsx';

export default function BaseBuilderView() {
  const {
    buildings,
    defenses,
    paintedTiles,
    selectedBuildingId,
    handlePlaceAt,
    handleBuildingSelect,
    setSelectedTool,
  } = useGameState();
  const sceneApi = useRef(null);
  const [selectedTile, setSelectedTile] = useState(null);
  const [makeupOpen, setMakeupOpen] = useState(false);

  const handleTileClick = (data) => {
    setSelectedTile(data);
    handlePlaceAt(data.column, data.row);
  };

  const handleBuildingClick = (buildingId) => {
    handleBuildingSelect(buildingId);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-clay-bg">
      <GameMap
        apiRef={sceneApi}
        paintedTiles={paintedTiles}
        buildings={buildings}
        defenses={defenses}
        selectedBuildingId={selectedBuildingId}
        showSearchlight
        showMakeupHouse
        onTileClick={handleTileClick}
        onMakeupHouseClick={() => setMakeupOpen(true)}
        onBuildingClick={handleBuildingClick}
      />

      <header className="absolute top-3 left-4 right-4 z-50 flex items-start justify-between pointer-events-none gap-3">
        <HudBanner icon="🏠" title="Your Base" subtitle="Colored fortress · Paint · Build · Patrol" />
        <NavigationTabs />
        <TopResourceBar />
      </header>

      <aside className="absolute right-4 top-28 z-40 hidden md:flex flex-col items-end gap-3">
        <BaseStatusPanel
          selectedTile={selectedTile}
          onBuildClick={() => setSelectedTool('INK_HOUSE')}
        />
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

      <BottomBuildDock />

      {makeupOpen && <MakeupHousePanel onClose={() => setMakeupOpen(false)} />}
    </div>
  );
}
