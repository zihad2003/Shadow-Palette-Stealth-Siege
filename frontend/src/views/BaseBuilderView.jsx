import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Minus, Eye, Map } from 'lucide-react';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import BottomBuildDock from '../components/hud/BottomBuildDock.jsx';
import BaseStatusPanel from '../components/hud/BaseStatusPanel.jsx';
import MakeupHousePanel from '../components/hud/MakeupHousePanel.jsx';
import HudBanner from '../components/ui/HudBanner.jsx';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import GameMap from '../gamemap/GameMap.jsx';
import { useGameState, REPAIR_BUILDING_COST } from '../state/GameStateContext.jsx';
import { GATE_SPAWN_TILE, MAP_COLS, MAP_ROWS, WALK_TILE_SECONDS } from '../gamemap/mapConfig.js';
import { collectSolidTiles, canEnterTile } from '../gamemap/occupancy.js';
import { listDecorOccupiedTiles } from '../gamemap/MapDecor.js';
import { findRuinNear } from '../gamemap/starterRuins.js';
import { createSprintMeter, SPRINT_SPEED_MULT } from '../character/sprint.js';
import StaminaBar from '../components/hud/StaminaBar.jsx';

const BASE_DECOR_SEED = 7;

export default function BaseBuilderView() {
  const {
    buildings,
    defenses,
    paintedTiles,
    selectedBuildingId,
    handlePlaceAt,
    handleBuildingSelect,
    setSelectedTool,
    characterModel,
    camoColor,
    repairRuinNear,
    showToast,
  } = useGameState();
  const sceneApi = useRef(null);
  const [selectedTile, setSelectedTile] = useState(null);
  const [makeupOpen, setMakeupOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState('chase');
  const [walker, setWalker] = useState({
    column: GATE_SPAWN_TILE.column,
    row: GATE_SPAWN_TILE.row,
    camoColor: camoColor || 'BLUE',
    characterModel: characterModel || 1,
  });
  const walkerRef = useRef(walker);
  walkerRef.current = walker;
  const keys = useRef(new Set());
  const actionRef = useRef(null);
  const paintRef = useRef(null);
  const placeRef = useRef(handlePlaceAt);
  placeRef.current = handlePlaceAt;
  const sprintMeter = useRef(createSprintMeter());
  const [stamina, setStamina] = useState({ stamina: 1, sprinting: false, exhausted: false });

  const solidTiles = useMemo(
    () =>
      collectSolidTiles({
        buildings,
        decorTiles: listDecorOccupiedTiles(BASE_DECOR_SEED, buildings),
      }),
    [buildings]
  );
  const solidRef = useRef(solidTiles);
  solidRef.current = solidTiles;

  const nearRuin = findRuinNear(buildings, walker.column, walker.row);
  const isPov = cameraMode === 'chase';

  useEffect(() => {
    setWalker((prev) => ({
      ...prev,
      camoColor: camoColor || prev.camoColor,
      characterModel: characterModel || prev.characterModel,
    }));
  }, [camoColor, characterModel]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let moveCooldown = 0;
    let lastSprintMul = 1;
    let lastHud = { stamina: 1, sprinting: false, exhausted: false };

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      moveCooldown = Math.max(0, moveCooldown - dt);

      let forward = 0;
      let turn = 0;
      if (keys.current.has('ArrowUp') || keys.current.has('w') || keys.current.has('W')) forward += 1;
      if (keys.current.has('ArrowDown') || keys.current.has('s') || keys.current.has('S')) forward -= 1;
      if (keys.current.has('ArrowLeft') || keys.current.has('a') || keys.current.has('A')) turn += 1;
      if (keys.current.has('ArrowRight') || keys.current.has('d') || keys.current.has('D')) turn -= 1;

      // Shift = limited sprint; meter drains while moving, refills after a short pause
      const sp = sprintMeter.current.tick(dt, keys.current.has('Shift'), forward !== 0);
      const sprintMul = sp.sprinting ? SPRINT_SPEED_MULT : 1;
      if (sprintMul !== lastSprintMul) {
        lastSprintMul = sprintMul;
        sceneApi.current?.setSprint?.(sprintMul);
      }
      if (
        Math.abs(sp.stamina - lastHud.stamina) > 0.01 ||
        sp.sprinting !== lastHud.sprinting ||
        sp.exhausted !== lastHud.exhausted
      ) {
        lastHud = { stamina: sp.stamina, sprinting: sp.sprinting, exhausted: sp.exhausted };
        setStamina(lastHud);
      }

      if (moveCooldown <= 0) {
        if (turn !== 0) sceneApi.current?.addLookYaw?.(turn * 0.12);

        if (forward !== 0) {
          const yaw = sceneApi.current?.getFacingYaw?.() ?? Math.PI;
          let dCol = Math.round(Math.sin(yaw) * forward);
          let dRow = Math.round(Math.cos(yaw) * forward);
          if (Math.abs(dCol) >= Math.abs(dRow)) {
            dCol = Math.sign(dCol);
            dRow = 0;
          } else {
            dRow = Math.sign(dRow);
            dCol = 0;
          }
          if (dCol !== 0 || dRow !== 0) {
            const column = Math.max(0, Math.min(MAP_COLS - 1, walkerRef.current.column + dCol));
            const row = Math.max(0, Math.min(MAP_ROWS - 1, walkerRef.current.row + dRow));
            if (column !== walkerRef.current.column || row !== walkerRef.current.row) {
              if (!canEnterTile(column, row, solidRef.current)) {
                moveCooldown = 0.1;
                sceneApi.current?.playBump?.();
              } else {
                moveCooldown = (WALK_TILE_SECONDS / sprintMul) * 0.92;
                setWalker((prev) => ({ ...prev, column, row }));
              }
            }
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const tryRepair = () => {
      const { column, row } = walkerRef.current;
      repairRuinNear(column, row);
    };
    const tryPaintHere = () => {
      const { column, row } = walkerRef.current;
      setSelectedTile({ column, row });
      placeRef.current(column, row);
    };
    actionRef.current = tryRepair;
    paintRef.current = tryPaintHere;

    const down = (e) => {
      keys.current.add(e.key);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'Shift'].includes(e.key)) {
        e.preventDefault();
      }
      if ((e.key === 'f' || e.key === 'F') && !e.repeat) {
        e.preventDefault();
        actionRef.current?.();
      }
      if ((e.key === 'e' || e.key === 'E') && !e.repeat) {
        e.preventDefault();
        paintRef.current?.();
      }
      if ((e.key === 'v' || e.key === 'V') && !e.repeat) {
        e.preventDefault();
        setCameraMode((m) => (m === 'chase' ? 'iso' : 'chase'));
      }
    };
    const up = (e) => keys.current.delete(e.key);
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [repairRuinNear]);

  const handleTileClick = (data) => {
    setSelectedTile(data);
    handlePlaceAt(data.column, data.row);
  };

  const handleBuildingClick = (buildingId) => {
    const building = buildings.find((b) => b.id === buildingId);
    if (building?.ruined) {
      showToast('Walk to this ruin and press F to repair', 'info');
      handleBuildingSelect(buildingId);
      return;
    }
    handleBuildingSelect(buildingId);
  };

  const hint = nearRuin
    ? `Ruin: ${nearRuin.buildingType.replace(/_/g, ' ')} · F repair (${REPAIR_BUILDING_COST.coins}c / ${REPAIR_BUILDING_COST.ink} ink)`
    : isPov
      ? 'Click lock mouse · WASD · Shift sprint · E paint · F repair · V map'
      : 'WASD walk · Shift sprint · click tiles to paint · V for character POV';

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
        attacker={walker}
        cameraMode={cameraMode}
        onTileClick={handleTileClick}
        onMakeupHouseClick={() => setMakeupOpen(true)}
        onBuildingClick={handleBuildingClick}
      />

      <header className="absolute top-3 left-4 right-4 z-50 flex items-start justify-between pointer-events-none gap-3">
        <HudBanner
          icon="🏠"
          title="Your Base"
          subtitle={isPov ? 'Character POV · Walk · Repair · Paint' : 'Map view · Click paint · V for POV'}
        />
        <NavigationTabs />
        <TopResourceBar />
      </header>

      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <ClayPanel className="px-4 py-1.5 rounded-full text-[11px] font-bold text-clay-text">
          {hint}
        </ClayPanel>
      </div>

      <aside className="absolute right-4 top-28 z-40 hidden md:flex flex-col items-end gap-3">
        <BaseStatusPanel
          selectedTile={selectedTile}
          onBuildClick={() => setSelectedTool('PAINT')}
        />
        <div className="flex flex-col gap-2 pointer-events-auto">
          <ClayButton
            variant="ghost"
            onClick={() => setCameraMode((m) => (m === 'chase' ? 'iso' : 'chase'))}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            aria-label={isPov ? 'Switch to map view' : 'Switch to character POV'}
            title={isPov ? 'Map view (V)' : 'Character POV (V)'}
          >
            {isPov ? <Map size={16} /> : <Eye size={16} />}
          </ClayButton>
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

      <StaminaBar
        stamina={stamina.stamina}
        sprinting={stamina.sprinting}
        exhausted={stamina.exhausted}
        className="absolute left-4 bottom-3 z-40"
      />

      <BottomBuildDock />

      {makeupOpen && <MakeupHousePanel onClose={() => setMakeupOpen(false)} />}
    </div>
  );
}
