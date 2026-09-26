import React, { useEffect, useMemo, useRef, useState } from 'react';
import DailyTasksPanel from '../components/hud/DailyTasksPanel.jsx';
import { Camera, X } from 'lucide-react';
import { Plus, Minus, Eye, Map } from 'lucide-react';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import BottomBuildDock from '../components/hud/BottomBuildDock.jsx';
import BaseStatusPanel from '../components/hud/BaseStatusPanel.jsx';
import MakeupHousePanel from '../components/hud/MakeupHousePanel.jsx';
import HudBanner from '../components/ui/HudBanner.jsx';
import HudHeader from '../components/ui/HudHeader.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import GameMap from '../gamemap/GameMap.jsx';
import { useGameState, GUIDE_STEPS } from '../state/GameStateContext.jsx';
import { GATE_SPAWN_TILE, MAP_ROWS, WALK_TILE_SECONDS } from '../gamemap/mapConfig.js';
import { collectSolidTiles } from '../gamemap/occupancy.js';
import { isNearGarage, findPartNear } from '../gamemap/paletteBuggy.js';
import { stepDirection, attemptStep, nudgeOffSolid, TURN_RATE } from '../character/gridMover.js';
import { noteKeyDown, noteKeyUp, walkAxes, shiftHeld, codeHeld, bindKeyReleaseGuards } from '../character/walkInput.js';
import { soundEngine } from '../soundEngine.js';
import { listDecorOccupiedTiles } from '../gamemap/MapDecor.js';
import { findRuinNear, findRepairedNear, isNearMakeupHouse } from '../gamemap/starterRuins.js';
import { canPlaceOnGameMap } from '../gamemap/placeUtils.js';
import { createSprintMeter, SPRINT_SPEED_MULT } from '../character/sprint.js';
import StaminaBar from '../components/hud/StaminaBar.jsx';
import BuildQuestHud from '../components/hud/BuildQuestHud.jsx';
import ActionPrompt from '../components/hud/ActionPrompt.jsx';
import HouseStation from '../components/hud/HouseStation.jsx';
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
    dropCarriedPart,
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
    saveWorld,
    mountProgress,
    gameDay,
    coinBanks,
    collectHouseCoins,
    sleepAtHouse,
    pickPaintColor,
    cyclePaintColor,
    upgradeHouse,
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
    dropCarriedPart,
    saveWorld,
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
    collectHouseCoins,
    sleepAtHouse,
    cyclePaintColor,
    upgradeHouse,
    showToast,
  });
  rebuildKeysRef.current = {
    tickRebuildHold,
    repairBuilding,
    guideStep,
    activeRuinId,
    dismissWelcome,
    buildings,
    pickUpPartAt,
    dropCarriedPart,
    saveWorld,
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
    collectHouseCoins,
    sleepAtHouse,
    cyclePaintColor,
    upgradeHouse,
    showToast,
  };
  const sprintMeter = useRef(createSprintMeter());
  const pendingDismount = useRef(null);
  const [stamina, setStamina] = useState({ stamina: 1, sprinting: false, exhausted: false });
  const [compass, setCompass] = useState(null);
  const [parkedCar, setParkedCar] = useState(null);

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
  const nearRepaired = findRepairedNear(buildings, walker.column, walker.row);
  const makeupFirst =
    isNearMakeupHouse(walker.column, walker.row) && walker.column <= 2 && walker.row >= MAP_ROWS - 4;
  const makeupStation = makeupFirst ? { id: 'makeup', buildingType: 'MAKEUP_HOUSE', ruined: false } : null;
  const stationHouse = makeupStation || nearRepaired;
  const nearSleep = !makeupStation && nearRepaired?.buildingType === 'SLEEP_HOUSE' ? nearRepaired : null;
  const nearCoin = !makeupStation && nearRepaired?.buildingType === 'COIN_GENERATOR' ? nearRepaired : null;
  const nearInk = !makeupStation && nearRepaired?.buildingType === 'INK_HOUSE' ? nearRepaired : null;
  const nearCraft = !makeupStation && nearRepaired?.buildingType === 'CRAFT_HOUSE' ? nearRepaired : null;
  const nearPart = findPartNear(partSpawns, walker.column, walker.row);
  const peekHouse = nearRuin || stationHouse;
  const nearActive = !!(activeRuin && nearRuin && nearRuin.id === activeRuin.id);
  const nearGarage = isNearGarage(walker.column, walker.row);
  const nearCar = parkedCar
    ? Math.hypot(walker.column - parkedCar.column, walker.row - parkedCar.row) <= 3
    : nearGarage;
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

  const [showcase, setShowcase] = useState(false);

  useEffect(() => {
    soundEngine.playAmbient('base');
  }, []);

  useEffect(() => {
    sceneApi.current?.setShowcase?.(showcase);
  }, [showcase]);

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
    if (res.batch && res.batch.length > 0) {
      sceneApi.current?.spawnPaintSplash?.(res.batch, GAME_COLORS[selectedColor] || '#FFFFFF');
    }
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
    let bumpCooldown = 0;
    let gearCooldown = 0;
    let lastSprintMul = 1;
    let lastHud = { stamina: 1, sprinting: false, exhausted: false };
    let lastCompass = null;
    let lastParkedKey = '';

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      moveCooldown = Math.max(0, moveCooldown - dt);
      bumpCooldown = Math.max(0, bumpCooldown - dt);
      gearCooldown = Math.max(0, gearCooldown - dt);

      const rk = rebuildKeysRef.current;
      const picking = !!rk.tickPickupAnim?.(dt);
      const { forward, turn } = picking ? { forward: 0, turn: 0 } : walkAxes(keys.current);

      if (rk.buggySeated && rk.visitRole === 'guest') {
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
      const sp = sprintMeter.current.tick(dt, shiftHeld(keys.current), forward !== 0);
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

      // In the car, A/D only steers and W/S drives along the nose. On foot, A/D turns or strafes.
      const mouseLocked = sceneApi.current?.isMouseLocked?.() ?? false;
      const inCar = rk.buggySeated && rk.visitRole !== 'guest';
      const steerRate = inCar ? 1.25 : TURN_RATE;
      const strafe = inCar ? 0 : mouseLocked ? -turn : 0;
      if (!mouseLocked && turn !== 0) sceneApi.current?.addLookYaw?.(turn * steerRate * dt);
      sceneApi.current?.setDriveInput?.({
        driving: inCar,
        forward: inCar && rk.buggyGear > 0 ? forward : 0,
        sprintMul,
        solids: solidRef.current,
      });
      if (inCar && !pendingDismount.current) {
        const tile = sceneApi.current?.getCarTile?.();
        if (tile && (tile.column !== walkerRef.current.column || tile.row !== walkerRef.current.row)) {
          const next = { ...walkerRef.current, column: tile.column, row: tile.row };
          walkerRef.current = next;
          setWalker(next);
        }
      } else if (!inCar) {
        pendingDismount.current = null;
      }
      const liveCar = sceneApi.current?.getCarTile?.();
      if (liveCar) {
        const carKey = `${liveCar.column},${liveCar.row}`;
        if (carKey !== lastParkedKey) {
          lastParkedKey = carKey;
          setParkedCar({ column: liveCar.column, row: liveCar.row });
        }
      }

      if (!inCar && moveCooldown <= 0 && (forward !== 0 || strafe !== 0)) {
        const yaw = sceneApi.current?.getFacingYaw?.() ?? Math.PI;
        const dir = stepDirection(yaw, forward, strafe);
        const step = attemptStep(walkerRef.current, dir, solidRef.current);
        if (step.ok) {
          moveCooldown = WALK_TILE_SECONDS * (step.diagonal ? Math.SQRT2 : 1) / sprintMul;
          if (!rk.buggySeated) soundEngine.playFootstepSound(sp.sprinting);
          const next = { ...walkerRef.current, column: step.column, row: step.row };
          walkerRef.current = next;
          setWalker(next);
        } else if (step.blocked && bumpCooldown <= 0) {
          bumpCooldown = 0.2;
          sceneApi.current?.playBump?.();
        }
      } else if (!rk.buggySeated && moveCooldown <= 0) {
        const escape = nudgeOffSolid(walkerRef.current, solidRef.current);
        if (escape?.ok) {
          moveCooldown = WALK_TILE_SECONDS * (escape.diagonal ? Math.SQRT2 : 1);
          const next = { ...walkerRef.current, column: escape.column, row: escape.row };
          walkerRef.current = next;
          setWalker(next);
        }
      }

      if (rk.guideStep === GUIDE_STEPS.WELCOME && (forward !== 0 || strafe !== 0)) {
        rk.dismissWelcome();
      }
      const holdingF = !rk.buggySeated && codeHeld(keys.current, 'KeyF');
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
      noteKeyDown(keys.current, e);
      if (e.code === 'KeyF' && !e.repeat) {
        e.preventDefault();
        const rk = rebuildKeysRef.current;
        if (rk.guideStep === GUIDE_STEPS.WELCOME) {
          rk.dismissWelcome();
        }
        if (rk.buggySeated) {
          const tile = sceneApi.current?.getDismountTile?.(solidRef.current);
          if (tile) {
            pendingDismount.current = tile;
            const next = { ...walkerRef.current, column: tile.column, row: tile.row };
            walkerRef.current = next;
            setWalker(next);
            sceneApi.current?.placeOnTile?.(tile.column, tile.row);
          }
          rk.standFromBuggy();
          return;
        }
        const pos = walkerRef.current;
        const ruin = findRuinNear(rk.buildings, pos.column, pos.row);
        const car = sceneApi.current?.getCarTile?.();
        const besideCar =
          !!car && Math.hypot(pos.column - car.column, pos.row - car.row) <= 3;
        if (
          !rk.carriedPart &&
          !ruin &&
          rk.garageComplete &&
          besideCar
        ) {
          if (rk.visitRole !== 'guest') {
            const tile = sceneApi.current?.getCarTile?.();
            if (tile) {
              const next = { ...walkerRef.current, column: tile.column, row: tile.row };
              walkerRef.current = next;
              setWalker(next);
            }
          }
          rk.sitInBuggy(rk.visitRole === 'guest' ? 'passenger' : 'driver');
        }
      }
      if ((e.key === 'e' || e.key === 'E') && !e.repeat) {
        e.preventDefault();
        const rk = rebuildKeysRef.current;
        const pos = walkerRef.current;
        if (rk.pickUpPartAt(pos.column, pos.row)) return;
        if (rk.carriedPart) {
          rk.dropCarriedPart(pos.column, pos.row);
          return;
        }
        const house = findRepairedNear(rk.buildings, pos.column, pos.row);
        const atMakeup = isNearMakeupHouse(pos.column, pos.row) && pos.column <= 2 && pos.row >= MAP_ROWS - 4;
        if (!rk.isVisitGuest && atMakeup) {
          setMakeupOpen(true);
          return;
        }
        if (!rk.isVisitGuest && house) {
          if (house.buildingType === 'SLEEP_HOUSE') {
            rk.sleepAtHouse();
            return;
          }
          if (house.buildingType === 'COIN_GENERATOR') {
            rk.collectHouseCoins(house.id);
            return;
          }
          if (house.buildingType === 'INK_HOUSE') {
            rk.cyclePaintColor();
            return;
          }
          if (house.buildingType === 'CRAFT_HOUSE') {
            const ups = (rk.buildings || []).filter((b) => !b.ruined && (b.level || 1) < 3);
            const target = ups.find((b) => b.id === house.id) || ups[0];
            if (target) rk.upgradeHouse(target.id);
            else rk.showToast('Workshop max', 'info');
            return;
          }
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
      if ((e.key === 'x' || e.key === 'X') && !e.repeat) {
        e.preventDefault();
        setShowcase((s) => !s);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        const rk = rebuildKeysRef.current;
        if (rk.buggySeated) {
          const tile = sceneApi.current?.getDismountTile?.(solidRef.current);
          if (tile) {
            pendingDismount.current = tile;
            const next = { ...walkerRef.current, column: tile.column, row: tile.row };
            walkerRef.current = next;
            setWalker(next);
            sceneApi.current?.placeOnTile?.(tile.column, tile.row);
          }
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
    const up = (e) => noteKeyUp(keys.current, e);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    const unguard = bindKeyReleaseGuards(keys);
    
    const onReact = (e) => {
      sceneApi.current?.showReaction?.(e.detail.kind);
    };
    window.addEventListener('visit-reaction', onReact);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('visit-reaction', onReact);
      unguard();
    };
  }, []);

  const handleTileClick = async (data) => {
    setSelectedTile(data);
    const res = await handlePlaceAt(data.column, data.row, { occupant: walkerRef.current });
    if (res && res.batch && res.batch.length > 0) {
      sceneApi.current?.spawnPaintSplash?.(res.batch, GAME_COLORS[selectedColor] || '#FFFFFF');
    }
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

  const actionLines = movingBuilding
    ? ['Click tile or M drop · Esc cancel']
    : buggySeated
      ? [visitRole === 'guest' ? 'F leave' : 'W drive · A/D steer · S back · F stand']
      : [
          nearGarage && carriedPart
            ? mountProgress > 0.02
              ? `Hold F · ${Math.round(mountProgress * 100)}%`
              : 'Hold F to mount'
            : null,
          nearPart && !carriedPart ? 'E pick up' : null,
          carriedPart && !nearGarage ? 'E drop · Hold F at garage' : null,
          nearRuin && (nearActive || !guideActive) ? 'Hold F rebuild' : null,
          nearRuin && guideActive && !nearActive ? 'Follow the marker' : null,
          nearSleep && !nearRuin ? 'E sleep · save' : null,
          nearCoin && !nearRuin ? 'E collect coins' : null,
          nearInk && !nearRuin ? 'E next color' : null,
          nearCraft && !nearRuin ? 'E upgrade' : null,
          makeupStation ? 'E change camo' : null,
          nearRepaired && !nearSleep && !nearCoin && !nearInk && !nearCraft && !movingBuilding ? 'M move house' : null,
          nearCar && garageComplete && !carriedPart ? 'F enter' : null,
          brush.on ? `E brush off · ${brush.size}×${brush.size}` : null,
        ].filter(Boolean);
  if (!actionLines.length) actionLines.push('WASD walk · Shift sprint 10s · V camera');

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

      {!showcase && (
        <>
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

      <HouseStation
        building={peekHouse}
        ruined={!!peekHouse?.ruined}
        gameDay={gameDay}
        storedCoins={Math.floor(Number(coinBanks[peekHouse?.id]) || 0)}
        selectedColor={selectedColor}
        buildings={buildings}
        onCollect={() => {
          if (!isVisitGuest) collectHouseCoins(peekHouse?.id);
        }}
        onPickColor={(key) => {
          if (!isVisitGuest) pickPaintColor(key);
        }}
        onSleep={() => {
          if (!isVisitGuest) sleepAtHouse();
        }}
        onUpgrade={(id) => {
          if (!isVisitGuest) upgradeHouse(id);
        }}
        onOpenMakeup={() => {
          if (!isVisitGuest) setMakeupOpen(true);
        }}
      />
      {guideStep !== GUIDE_STEPS.WELCOME && <ActionPrompt lines={actionLines} />}

      <DailyTasksPanel hidden={guideStep !== GUIDE_STEPS.DONE || isVisitGuest} />

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
            onClick={() => setShowcase(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            aria-label="Showcase"
            title="Showcase (X)"
          >
            <Camera size={15} />
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
      </>)}

      {showcase && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50">
          <ClayButton variant="ghost" onClick={() => setShowcase(false)} className="px-4 h-10 rounded-xl bg-clay-surface/50 backdrop-blur-md font-semibold text-[13px] tracking-wide text-clay-text/90 hover:text-clay-text shadow-xl border border-clay-card/30">
            Exit Showcase (X)
          </ClayButton>
        </div>
      )}

      {makeupOpen && <MakeupHousePanel onClose={() => setMakeupOpen(false)} />}
    </div>
  );
}
