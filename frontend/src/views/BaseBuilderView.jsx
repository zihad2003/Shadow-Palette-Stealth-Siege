import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Minus, Eye, Map } from 'lucide-react';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import BottomBuildDock from '../components/hud/BottomBuildDock.jsx';
import BaseStatusPanel from '../components/hud/BaseStatusPanel.jsx';
import MakeupHousePanel from '../components/hud/MakeupHousePanel.jsx';
import HudBanner from '../components/ui/HudBanner.jsx';
import HudHeader from '../components/ui/HudHeader.jsx';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import GameMap from '../gamemap/GameMap.jsx';
import { useGameState, GUIDE_STEPS } from '../state/GameStateContext.jsx';
import { GATE_SPAWN_TILE, WALK_TILE_SECONDS } from '../gamemap/mapConfig.js';
import { collectSolidTiles } from '../gamemap/occupancy.js';
import { isNearGarage } from '../gamemap/paletteBuggy.js';
import { stepDirection, attemptStep, TURN_RATE } from '../character/gridMover.js';
import { soundEngine } from '../soundEngine.js';
import { listDecorOccupiedTiles } from '../gamemap/MapDecor.js';
import { findRuinNear, findRepairedNear } from '../gamemap/starterRuins.js';
import { canPlaceOnGameMap } from '../gamemap/placeUtils.js';
import { createSprintMeter, SPRINT_SPEED_MULT } from '../character/sprint.js';
import StaminaBar from '../components/hud/StaminaBar.jsx';
import BuildQuestHud from '../components/hud/BuildQuestHud.jsx';
import { GAME_COLORS, GAME_COLOR_KEYS } from '../colors.js';

const BASE_DECOR_SEED = 7;

/** Tiles covered by the walk-brush around the character. */
function brushFootprint(column, row, size) {
  if (size <= 1) return [{ x: column, y: row }];
  const half = Math.floor(size / 2);
  const out = [];
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) out.push({ x: column + dx, y: row + dy });
  }
  return out;
}

export default function BaseBuilderView() {
  const {
    buildings,
    defenses,
    paintedTiles,
    selectedBuildingId,
    movingBuildingId,
    handlePlaceAt,
    handleBuildingSelect,
    beginMoveBuilding,
    cancelMoveBuilding,
    moveBuildingTo,
    setSelectedTool,
    setSelectedColor,
    selectedColor,
    characterModel,
    camoColor,
    repairBuilding,
    showToast,
    brush,
    setBrush,
    toggleBrush,
    cycleBrushSize,
    toggleEraser,
    paintTiles,
    eraseTiles,
    searchlightLevel,
    guideStep,
    guideActive,
    activeRuinId,
    activeRuin,
    repairedCount,
    rebuildProgress,
    rebuildingId,
    dismissWelcome,
    dismissMoveTip,
    tickRebuildHold,
    mountedParts,
    partSpawns,
    carriedPart,
    garageComplete,
    pickUpPartAt,
    tickPickupAnim,
    pickupAnim,
    tickMountHold,
    mountCarriedPart,
    sitInBuggy,
    standFromBuggy,
    bumpBuggyGear,
    advanceBuggyTrack,
    buggySeated,
    buggyGear,
    buggyTrackT,
    visitSession,
    visitRole,
    isVisitGuest,
    visitSpawnToken,
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
  const brushKeysRef = useRef({ toggleBrush, cycleBrushSize, toggleEraser, setSelectedColor, setSelectedTool });
  brushKeysRef.current = { toggleBrush, cycleBrushSize, toggleEraser, setSelectedColor, setSelectedTool };
  const moveKeysRef = useRef({
    beginMoveBuilding,
    cancelMoveBuilding,
    moveBuildingTo,
    movingBuildingId,
    selectedBuildingId,
    buildings,
  });
  moveKeysRef.current = {
    beginMoveBuilding,
    cancelMoveBuilding,
    moveBuildingTo,
    movingBuildingId,
    selectedBuildingId,
    buildings,
  };
  const rebuildKeysRef = useRef({
    tickRebuildHold,
    repairBuilding,
    guideStep,
    activeRuinId,
    dismissWelcome,
    buildings,
    pickUpPartAt,
    tickPickupAnim,
    tickMountHold,
    mountCarriedPart,
    sitInBuggy,
    standFromBuggy,
    bumpBuggyGear,
    advanceBuggyTrack,
    buggySeated,
    buggyGear,
    garageComplete,
    carriedPart,
    isVisitGuest,
    visitRole,
  });
  rebuildKeysRef.current = {
    tickRebuildHold,
    repairBuilding,
    guideStep,
    activeRuinId,
    dismissWelcome,
    buildings,
    pickUpPartAt,
    tickPickupAnim,
    tickMountHold,
    mountCarriedPart,
    sitInBuggy,
    standFromBuggy,
    bumpBuggyGear,
    advanceBuggyTrack,
    buggySeated,
    buggyGear,
    garageComplete,
    carriedPart,
    isVisitGuest,
    visitRole,
  };
  const sprintMeter = useRef(createSprintMeter());
  const [stamina, setStamina] = useState({ stamina: 1, sprinting: false, exhausted: false });
  const [compass, setCompass] = useState(null);

  const solidTiles = useMemo(
    () =>
      collectSolidTiles({
        buildings,
        decorTiles: listDecorOccupiedTiles(BASE_DECOR_SEED, buildings),
        blockGarage: !buggySeated,
      }),
    [buildings, buggySeated]
  );
  const solidRef = useRef(solidTiles);
  solidRef.current = solidTiles;

  const nearRuin = findRuinNear(buildings, walker.column, walker.row);
  const nearActive = !!(activeRuin && nearRuin && nearRuin.id === activeRuin.id);
  const nearGarage = isNearGarage(walker.column, walker.row);
  const movingBuilding = buildings.find((b) => b.id === movingBuildingId) || null;
  const isPov = cameraMode === 'chase';
  const localRideRole = visitRole === 'guest' ? 'passenger' : 'driver';
  const garageUnlocked = true;
  const buggyRide = {
    seated: buggySeated,
    role: localRideRole,
    gear: buggyGear,
    trackT: buggyTrackT,
    otherSeated: !!(visitRole === 'guest' ? visitSession?.hostSeated : visitSession?.guestSeated),
    other: visitSession
      ? visitRole === 'guest'
        ? {
            seated: !!visitSession.hostSeated,
            role: 'driver',
            characterModel: visitSession.hostModel,
            camoColor: visitSession.hostCamo,
          }
        : {
            seated: !!visitSession.guestSeated,
            role: 'passenger',
            characterModel: visitSession.guestModel,
            camoColor: visitSession.guestCamo,
          }
      : null,
  };

  const dropOrigin = () => {
    const yaw = sceneApi.current?.getFacingYaw?.() ?? Math.PI;
    const dir = stepDirection(yaw, 1, 0) || { dCol: 0, dRow: -1 };
    return {
      x: walkerRef.current.column + dir.dCol,
      y: walkerRef.current.row + dir.dRow,
    };
  };

  // Walk-brush: paints/erases the footprint whenever you step, flip ON, change
  // size/color, or switch to eraser. Stops itself on ink/quota so toasts don't spam.
  const brushFnRef = useRef({ paintTiles, eraseTiles, setBrush });
  brushFnRef.current = { paintTiles, eraseTiles, setBrush };
  useEffect(() => {
    if (!brush.on) return;
    const tiles = brushFootprint(walker.column, walker.row, brush.size);
    if (brush.erase) {
      brushFnRef.current.eraseTiles(tiles);
      return;
    }
    const res = brushFnRef.current.paintTiles(tiles);
    if (res.stop) {
      brushFnRef.current.setBrush((b) => ({ ...b, on: false }));
      showToast('Brush off', 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walker.column, walker.row, brush.on, brush.size, brush.erase, selectedColor]);

  // Move ghost: tile hover in map view, tile in front while in POV
  useEffect(() => {
    const api = sceneApi.current;
    if (!api?.setMoveGhost) return;
    if (!movingBuilding) {
      api.setMoveGhost(null);
      return;
    }
    const w = movingBuilding.footprintWidth || 2;
    const h = movingBuilding.footprintHeight || 2;
    if (!isPov) return;
    const { x, y } = dropOrigin();
    const ok = canPlaceOnGameMap(buildings, x, y, w, h, movingBuilding.id);
    api.setMoveGhost({
      x,
      y,
      w,
      h,
      ok,
      type: movingBuilding.buildingType,
      hex: movingBuilding.hexColor,
      level: movingBuilding.level,
    });
  }, [movingBuilding, walker.column, walker.row, buildings, isPov, cameraMode]);

  // 3D preview rings under the brush footprint
  useEffect(() => {
    const api = sceneApi.current;
    if (!api?.setBrushPreview) return;
    if (!brush.on) {
      api.setBrushPreview(null);
      return;
    }
    const tiles = brushFootprint(walker.column, walker.row, brush.size);
    api.setBrushPreview(tiles, brush.erase ? '#FFFFFF' : GAME_COLORS[selectedColor] || '#FFFFFF');
  }, [walker.column, walker.row, brush.on, brush.size, brush.erase, selectedColor, cameraMode]);

  useEffect(() => {
    setWalker((prev) => ({
      ...prev,
      camoColor: camoColor || prev.camoColor,
      characterModel: characterModel || prev.characterModel,
    }));
  }, [camoColor, characterModel]);

  useEffect(() => {
    if (guideStep === GUIDE_STEPS.WELCOME || guideStep === GUIDE_STEPS.REBUILD) return;
    if (carriedPart) return;
    pickUpPartAt(walker.column, walker.row);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walker.column, walker.row, guideStep, carriedPart]);

  useEffect(() => {
    if (!visitSpawnToken) return;
    setWalker((prev) => ({
      ...prev,
      column: GATE_SPAWN_TILE.column,
      row: GATE_SPAWN_TILE.row,
    }));
    const api = sceneApi.current;
    if (api?.resetCamera) api.resetCamera();
  }, [visitSpawnToken]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let moveCooldown = 0;
    let gearCooldown = 0;
    let lastSprintMul = 1;
    let lastHud = { stamina: 1, sprinting: false, exhausted: false };
    let lastCompass = null;

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      moveCooldown = Math.max(0, moveCooldown - dt);
      gearCooldown = Math.max(0, gearCooldown - dt);

      const rk = rebuildKeysRef.current;
      const picking = !!rk.tickPickupAnim?.(dt);
      let forward = 0;
      let turn = 0;
      if (!picking) {
        if (keys.current.has('ArrowUp') || keys.current.has('w') || keys.current.has('W')) forward += 1;
        if (keys.current.has('ArrowDown') || keys.current.has('s') || keys.current.has('S')) forward -= 1;
        if (keys.current.has('ArrowLeft') || keys.current.has('a') || keys.current.has('A')) turn += 1;
        if (keys.current.has('ArrowRight') || keys.current.has('d') || keys.current.has('D')) turn -= 1;
      }

      if (rk.buggySeated) {
        rk.advanceBuggyTrack(dt);
        if (rk.visitRole !== 'guest' && gearCooldown <= 0 && forward !== 0) {
          rk.bumpBuggyGear(forward > 0 ? 1 : -1);
          gearCooldown = 0.28;
        }
        const mouseLocked = sceneApi.current?.isMouseLocked?.() ?? false;
        if (!mouseLocked && turn !== 0) sceneApi.current?.addLookYaw?.(turn * TURN_RATE * dt);
        const screen = sceneApi.current?.getGuideScreen?.();
        if (screen) {
          const same =
            lastCompass &&
            Math.abs(lastCompass.nx - screen.nx) < 0.016 &&
            Math.abs(lastCompass.ny - screen.ny) < 0.016 &&
            lastCompass.onScreen === screen.onScreen;
          if (!same) {
            lastCompass = screen;
            setCompass(screen);
          }
        } else if (lastCompass) {
          lastCompass = null;
          setCompass(null);
        }
        raf = requestAnimationFrame(loop);
        return;
      }

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

      // Mouse locked → A/D strafe (mouse steers); otherwise A/D turns smoothly every frame
      const mouseLocked = sceneApi.current?.isMouseLocked?.() ?? false;
      const strafe = mouseLocked ? -turn : 0;
      if (!mouseLocked && turn !== 0) sceneApi.current?.addLookYaw?.(turn * TURN_RATE * dt);

      if (moveCooldown <= 0 && (forward !== 0 || strafe !== 0)) {
        const yaw = sceneApi.current?.getFacingYaw?.() ?? Math.PI;
        const dir = stepDirection(yaw, forward, strafe);
        const step = attemptStep(walkerRef.current, dir, solidRef.current);
        if (step.ok) {
          moveCooldown = WALK_TILE_SECONDS * (step.diagonal ? Math.SQRT2 : 1) / sprintMul;
          soundEngine.playFootstepSound(sp.sprinting);
          setWalker((prev) => ({ ...prev, column: step.column, row: step.row }));
        } else if (step.blocked) {
          moveCooldown = 0.1;
          sceneApi.current?.playBump?.();
        }
      }

      if (rk.guideStep === GUIDE_STEPS.WELCOME && (forward !== 0 || strafe !== 0)) {
        rk.dismissWelcome();
      }
      const holdingF = keys.current.has('f') || keys.current.has('F');
      const pos = walkerRef.current;
      const canMount =
        holdingF &&
        !!rk.carriedPart &&
        !rk.isVisitGuest &&
        isNearGarage(pos.column, pos.row);
      const mountedId = rk.tickMountHold(dt, canMount);
      if (mountedId) {
        soundEngine.stopRebuildHum();
        rk.mountCarriedPart();
      } else if (canMount) soundEngine.startRebuildHum();

      const ruin = findRuinNear(rk.buildings, pos.column, pos.row);
      const target =
        rk.guideStep === GUIDE_STEPS.DONE || rk.guideStep === GUIDE_STEPS.MOVE_TIP
          ? ruin
          : ruin && ruin.id === rk.activeRuinId
            ? ruin
            : null;
      const canHold =
        !canMount &&
        holdingF &&
        !!target &&
        rk.guideStep !== GUIDE_STEPS.WELCOME &&
        rk.guideStep !== GUIDE_STEPS.MOVE_TIP;
      const doneId = rk.tickRebuildHold(dt, canHold, target?.id || null);
      if (doneId) {
        soundEngine.stopRebuildHum();
        rk.repairBuilding(doneId);
      } else if (canHold) soundEngine.startRebuildHum();
      else if (!canMount) soundEngine.stopRebuildHum();

      const screen = sceneApi.current?.getGuideScreen?.();
      if (screen) {
        const same =
          lastCompass &&
          Math.abs(lastCompass.nx - screen.nx) < 0.016 &&
          Math.abs(lastCompass.ny - screen.ny) < 0.016 &&
          lastCompass.onScreen === screen.onScreen;
        if (!same) {
          lastCompass = screen;
          setCompass(screen);
        }
      } else if (lastCompass) {
        lastCompass = null;
        setCompass(null);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      soundEngine.stopRebuildHum();
    };
  }, []);

  useEffect(() => {
    const down = (e) => {
      keys.current.add(e.key);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'Shift'].includes(e.key)) {
        e.preventDefault();
      }
      if ((e.key === 'f' || e.key === 'F') && !e.repeat) {
        e.preventDefault();
        if (rebuildKeysRef.current.guideStep === GUIDE_STEPS.WELCOME) {
          rebuildKeysRef.current.dismissWelcome();
        }
      }
      if ((e.key === 'e' || e.key === 'E') && !e.repeat) {
        e.preventDefault();
        const rk = rebuildKeysRef.current;
        const pos = walkerRef.current;
        if (rk.buggySeated) {
          rk.standFromBuggy();
          return;
        }
        if (rk.pickUpPartAt(pos.column, pos.row)) return;
        if (rk.carriedPart) return;
        if (rk.garageComplete && isNearGarage(pos.column, pos.row)) {
          rk.sitInBuggy(rk.visitRole === 'guest' ? 'passenger' : 'driver');
          return;
        }
        if (!rk.isVisitGuest) {
          brushKeysRef.current.setSelectedTool('PAINT');
          brushKeysRef.current.toggleBrush();
        }
      }
      if ((e.key === 'q' || e.key === 'Q') && !e.repeat) {
        e.preventDefault();
        brushKeysRef.current.cycleBrushSize();
      }
      if ((e.key === 'r' || e.key === 'R') && !e.repeat) {
        e.preventDefault();
        brushKeysRef.current.toggleEraser();
      }
      if (e.key >= '1' && e.key <= '5' && !e.repeat) {
        const key = GAME_COLOR_KEYS[Number(e.key) - 1];
        if (key) {
          brushKeysRef.current.setSelectedColor(key);
          brushKeysRef.current.setSelectedTool('PAINT');
          soundEngine.playClickSound();
        }
      }
      if ((e.key === 'v' || e.key === 'V') && !e.repeat) {
        e.preventDefault();
        setCameraMode((m) => (m === 'chase' ? 'iso' : 'chase'));
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        const rk = rebuildKeysRef.current;
        if (rk.buggySeated) {
          rk.standFromBuggy();
          return;
        }
        moveKeysRef.current.cancelMoveBuilding();
      }
      if ((e.key === 'm' || e.key === 'M') && !e.repeat) {
        e.preventDefault();
        const mv = moveKeysRef.current;
        if (mv.movingBuildingId) {
          const yaw = sceneApi.current?.getFacingYaw?.() ?? Math.PI;
          const dir = stepDirection(yaw, 1, 0) || { dCol: 0, dRow: -1 };
          const pos = walkerRef.current;
          mv.moveBuildingTo(pos.column + dir.dCol, pos.row + dir.dRow, { occupant: pos });
          return;
        }
        const here = walkerRef.current;
        const nearby = findRepairedNear(mv.buildings, here.column, here.row);
        const targetId = nearby?.id || mv.selectedBuildingId;
        if (targetId) mv.beginMoveBuilding(targetId);
        else showToast('Stand by a house · M', 'info');
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
  }, []);

  const handleTileClick = (data) => {
    setSelectedTile(data);
    handlePlaceAt(data.column, data.row, { occupant: walkerRef.current });
  };

  const handleTileHover = (data) => {
    const api = sceneApi.current;
    if (!api?.setMoveGhost || !movingBuilding || isPov) return;
    if (!data) {
      api.setMoveGhost(null);
      return;
    }
    const w = movingBuilding.footprintWidth || 2;
    const h = movingBuilding.footprintHeight || 2;
    const ok = canPlaceOnGameMap(buildings, data.column, data.row, w, h, movingBuilding.id);
    api.setMoveGhost({
      x: data.column,
      y: data.row,
      w,
      h,
      ok,
      type: movingBuilding.buildingType,
      hex: movingBuilding.hexColor,
      level: movingBuilding.level,
    });
  };

  const handleBuildingClick = (buildingId) => {
    const building = buildings.find((b) => b.id === buildingId);
    if (building?.ruined) {
      if (guideActive && activeRuinId && building.id !== activeRuinId) {
        showToast('Follow the marker', 'info');
      } else {
        showToast('Hold F to rebuild', 'info');
      }
      handleBuildingSelect(buildingId);
      return;
    }
    handleBuildingSelect(buildingId);
  };

  const hint = movingBuilding
    ? 'Click a tile to drop'
    : buggySeated
      ? visitRole === 'guest'
        ? 'E leave'
        : `Gear ${buggyGear} · E stand`
      : nearGarage && garageComplete
        ? 'E sit'
        : nearGarage && carriedPart
          ? 'Hold F to mount'
          : carriedPart
            ? 'Carry to garage'
            : nearActive
              ? 'Hold F'
              : nearRuin && guideActive
                ? 'Follow marker'
                : brush.on
                  ? `Brush ${brush.size}×${brush.size}`
                  : null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-clay-bg">
      <GameMap
        apiRef={sceneApi}
        paintedTiles={paintedTiles}
        buildings={buildings}
        defenses={defenses}
        selectedBuildingId={selectedBuildingId}
        movingBuildingId={movingBuildingId}
        activeRuinId={guideStep === GUIDE_STEPS.REBUILD ? activeRuinId : null}
        rebuildingId={rebuildingId}
        rebuildProgress={rebuildProgress}
        onTileHover={handleTileHover}
        showSearchlight
        searchlightLevel={searchlightLevel}
        showMakeupHouse
        attacker={walker}
        cameraMode={cameraMode}
        onTileClick={handleTileClick}
        onMakeupHouseClick={() => setMakeupOpen(true)}
        onBuildingClick={handleBuildingClick}
        garageUnlocked={garageUnlocked}
        mountedParts={mountedParts}
        partSpawns={partSpawns}
        buggyRide={buggyRide}
        carriedPart={carriedPart}
        pickupAnim={pickupAnim}
      />

      <HudHeader
        left={
          <HudBanner
            title="Base"
            subtitle={
              movingBuilding
                ? 'Drop on a tile'
                : guideActive
                  ? `${repairedCount}/6`
                  : brush.on
                    ? `Brush ${brush.size}×${brush.size}`
                    : isPov
                      ? 'POV'
                      : null
            }
          />
        }
        right={
          <>
            <NavigationTabs />
            <TopResourceBar />
          </>
        }
      />

      <BuildQuestHud
        guideStep={guideStep}
        activeRuin={activeRuin}
        repairedCount={repairedCount}
        rebuildProgress={rebuildProgress}
        nearActive={nearActive}
        compass={compass}
        onDismissWelcome={dismissWelcome}
        onDismissMoveTip={dismissMoveTip}
      />

      {hint && guideStep !== GUIDE_STEPS.REBUILD && guideStep !== GUIDE_STEPS.WELCOME && (
        <div className="absolute top-[4.75rem] left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <ClayPanel className="h-11 px-3.5 rounded-2xl text-[11px] font-semibold text-clay-text flex items-center">
            {hint}
          </ClayPanel>
        </div>
      )}

      <aside className="absolute right-4 top-[4.75rem] z-40 hidden md:flex flex-col items-end gap-2">
        <BaseStatusPanel />
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <ClayButton
            variant="ghost"
            onClick={() => setCameraMode((m) => (m === 'chase' ? 'iso' : 'chase'))}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            aria-label={isPov ? 'Map view' : 'POV'}
            title={isPov ? 'Map (V)' : 'POV (V)'}
          >
            {isPov ? <Map size={15} /> : <Eye size={15} />}
          </ClayButton>
          <ClayButton
            variant="ghost"
            onClick={() => sceneApi.current && sceneApi.current.zoomIn()}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            aria-label="Zoom in"
          >
            <Plus size={15} />
          </ClayButton>
          <ClayButton
            variant="ghost"
            onClick={() => sceneApi.current && sceneApi.current.zoomOut()}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            aria-label="Zoom out"
          >
            <Minus size={15} />
          </ClayButton>
        </div>
      </aside>

      <StaminaBar
        stamina={stamina.stamina}
        sprinting={stamina.sprinting}
        exhausted={stamina.exhausted}
        className="absolute left-4 bottom-4 z-40"
      />

      {!isVisitGuest && <BottomBuildDock />}

      {makeupOpen && <MakeupHousePanel onClose={() => setMakeupOpen(false)} />}
    </div>
  );
}
