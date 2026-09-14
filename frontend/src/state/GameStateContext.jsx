import React, { createContext, useContext, useRef, useState } from 'react';
import { UPGRADE_COSTS, MAKEUP_RECOLOR_INK } from '../data/raidTargets.js';
import { GAME_COLORS, COLOR_NAMES, hexForColor, isGameColor } from '../colors.js';
import { placeBuilding, placeDefense, fetchRaidTarget, upgradeBuilding } from '../api.js';
import { soundEngine } from '../soundEngine.js';
import { createRaidSession, rejectColorChange } from '../raid/RaidSession.js';
import { MAP_COLS, MAP_ROWS } from '../gamemap/mapConfig.js';
import { canPlaceOnGameMap, getGameFootprint } from '../gamemap/placeUtils.js';
import { createStarterRuins, REPAIR_BUILDING_COST, findRuinNear, nextGuideRuin, STARTER_HOUSE_COUNT, REBUILD_SECONDS } from '../gamemap/starterRuins.js';
import { GATE_SPAWN_TILE } from '../gamemap/mapConfig.js';
import {
  DEFAULT_SEARCHLIGHT_LEVEL,
  SEARCHLIGHT_UPGRADE_COSTS,
  clampSearchlightLevel,
  searchlightSpec,
} from '../raid/stealthConstants.js';

const GameStateContext = createContext(null);

export const INTRO_DONE_KEY = 'sp_intro_done_v1';
export const BUILD_GUIDE_KEY = 'sp_base_build_guide_v1';
export const DAILY_LOGIN_KEY = 'sp_daily_login_v1';
export const PAINT_TILE_INK = 5;
export const PLACE_BUILDING_COST = { coins: 100, ink: 15 };
export { REPAIR_BUILDING_COST, SEARCHLIGHT_UPGRADE_COSTS, STARTER_HOUSE_COUNT };
export const GUIDE_STEPS = { WELCOME: 'WELCOME', REBUILD: 'REBUILD', MOVE_TIP: 'MOVE_TIP', DONE: 'DONE' };
export const PATROL_UNLOCK_RAIDS = 3;
export const PATROL_UNLOCK_COINS = 200;
export const DAILY_LOGIN_COINS = 100;
export const RAID_COOLDOWN_MS = 5 * 60 * 1000;
export const COLOR_QUOTA_LIMIT = 0.35;
export const COLOR_QUOTA_WARN = 0.3;
export const GRID_SIZE = MAP_COLS * MAP_ROWS;
export const PLACEABLE_BUILDINGS = ['CRAFT_HOUSE', 'INK_HOUSE', 'SLEEP_HOUSE', 'COIN_GENERATOR'];

export function GameStateProvider({ children }) {
  // FSM: SPLASH | STORY | MAIN_MENU | PAINT_TUTORIAL | BASE_BUILDER | RAID_FINDER | STEALTH_RAID
  const initialView = new URLSearchParams(window.location.search).get('view');
  const allowedViews = [
    'SPLASH',
    'STORY',
    'MAIN_MENU',
    'PAINT_TUTORIAL',
    'BASE_BUILDER',
    'RAID_FINDER',
    'STEALTH_RAID',
  ];
  const introDone = (() => {
    try {
      return window.localStorage.getItem(INTRO_DONE_KEY) === '1';
    } catch (e) {
      return false;
    }
  })();
  const startView = allowedViews.includes(initialView) ? initialView : introDone ? 'MAIN_MENU' : 'SPLASH';
  const [gameState, setGameState] = useState(startView);
  const [isFirstRun] = useState(!introDone);

  const markIntroDone = () => {
    try {
      window.localStorage.setItem(INTRO_DONE_KEY, '1');
    } catch (e) {
      /* private mode — flag just won't persist */
    }
  };
  const [activePlotId, setActivePlotId] = useState(1);

  const [userId, setUserId] = useState(12);
  const [coins, setCoins] = useState(500);
  const [inkEnergy, setInkEnergy] = useState(100);
  const [chips, setChips] = useState(200);
  const [characterModel, setCharacterModel] = useState(1);
  const [camoColor, setCamoColor] = useState('BLUE');
  const [camoReady, setCamoReady] = useState(false);
  const [raidSession, setRaidSession] = useState(null);
  const [prestigeLevel, setPrestigeLevel] = useState(0);
  const [successfulRaids, setSuccessfulRaids] = useState(0);
  const [patrolUnlocked, setPatrolUnlocked] = useState(false);
  const [raidCooldownUntil, setRaidCooldownUntil] = useState(0);
  const [lastDailyClaim, setLastDailyClaim] = useState(() => {
    try {
      return window.localStorage.getItem(DAILY_LOGIN_KEY) || '';
    } catch (e) {
      return '';
    }
  });
  const [isMetaOpen, setIsMetaOpen] = useState(false);

  // New users receive this home base automatically — no world-map plot pick
  const [selectedColor, setSelectedColor] = useState('GREEN');
  const [selectedTool, setSelectedTool] = useState('PAINT');
  /** Walk-brush: paint/erase the tiles you step on while ON. size 1 = single, 3 = 3×3. */
  const [brush, setBrush] = useState({ on: false, size: 1, erase: false });
  const [searchlightLevel, setSearchlightLevel] = useState(DEFAULT_SEARCHLIGHT_LEVEL);
  const [buildings, setBuildings] = useState(() => createStarterRuins());
  const [defenses, setDefenses] = useState([]);
  const [paintedTiles, setPaintedTiles] = useState({});
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [movingBuildingId, setMovingBuildingId] = useState(null);
  const [rebuildProgress, setRebuildProgress] = useState(0);
  const [rebuildingId, setRebuildingId] = useState(null);
  const rebuildHoldRef = useRef({ progress: 0, id: null });
  const guideDoneStored = (() => {
    try {
      return window.localStorage.getItem(BUILD_GUIDE_KEY) === '1';
    } catch (e) {
      return false;
    }
  })();
  const [guideStep, setGuideStep] = useState(() => (guideDoneStored ? GUIDE_STEPS.DONE : GUIDE_STEPS.WELCOME));
  const [raidLoot, setRaidLoot] = useState(null);
  const [nextEntityId, setNextEntityId] = useState(() => createStarterRuins().length + 1);

  const [raidTargetId, setRaidTargetId] = useState(34);
  const [raidData, setRaidData] = useState(null);

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState({ active: false, title: '', subtitle: '', progress: 0 });
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const triggerLoading = (title, subtitle, durationMs = 400, onDone) => {
    setLoadingScreen({ active: true, title, subtitle, progress: 0 });
    window.setTimeout(() => {
      setLoadingScreen({ active: false, title: '', subtitle: '', progress: 0 });
      if (onDone) onDone();
    }, durationMs);
  };

  /** Bind the auto-assigned home fortress after character/camo setup. */
  const provisionHomeBase = (plotId) => {
    const id = Number(plotId) || activePlotId || 1;
    setActivePlotId(id);
    soundEngine.playSuccessSound();
    showToast(`Home base ready · Fortress #${id}`, 'success');
  };

  const transitionTo = (nextState, params = {}) => {
    soundEngine.playTabSound();
    if (nextState === 'BASE_BUILDER') {
      const targetPlotId = params.plotId || activePlotId;
      setActivePlotId(targetPlotId);
      setRaidSession(null);
      triggerLoading('ENTERING YOUR BASE...', 'Paint & fortify your fortress', 400, () => {
        setGameState('BASE_BUILDER');
      });
    } else if (nextState === 'RAID_FINDER') {
      setRaidSession(null);
      triggerLoading('SCANNING RAID TARGETS...', 'Matching nearby fortress snapshots', 400, () => {
        setGameState('RAID_FINDER');
      });
    } else if (nextState === 'STEALTH_RAID') {
      if (Date.now() < raidCooldownUntil) {
        const secs = Math.ceil((raidCooldownUntil - Date.now()) / 1000);
        showToast(`Capture cooldown — wait ${secs}s before another raid`, 'error');
        return;
      }
      if (!isGameColor(camoColor)) {
        showToast('Visit the Makeup House and choose a camouflage color first', 'error');
        return;
      }
      const defender = params.defenderId || raidTargetId;
      setRaidTargetId(defender);
      if (params.raidLoot) setRaidLoot(params.raidLoot);
      const session = createRaidSession({ attackerId: userId, defenderId: defender, camoColor });
      setRaidSession(session);
      triggerLoading(
        'CALIBRATING STEALTH LINK...',
        `Camo locked ${session.camoColor} · grayscale infiltration`,
        500,
        async () => {
          try {
            const res = await fetchRaidTarget(defender);
            setRaidData(res);
          } catch (e) {
            setRaidData(null);
          }
          setGameState('STEALTH_RAID');
        }
      );
    } else if (nextState === 'MAIN_MENU') {
      triggerLoading('INITIALIZING OPERATIVE PROFILE...', 'Character & Camo Setup', 450, () => {
        setGameState('MAIN_MENU');
      });
    } else {
      setGameState(nextState);
    }
  };

  const hasMakeupHouse = true;
  const [hasRecamoed, setHasRecamoed] = useState(false);

  const changeCamoColor = (nextColor) => {
    const gate = rejectColorChange(raidSession, nextColor);
    if (!gate.ok) {
      showToast(
        gate.reason === 'RAID_CAMO_LOCKED' ? 'Camouflage is locked for this raid' : 'Pick one of the five colors',
        'error'
      );
      return false;
    }
    if (gate.camoColor === camoColor) {
      setHasRecamoed(true);
      setCamoReady(true);
      return true;
    }
    if (inkEnergy < MAKEUP_RECOLOR_INK) {
      showToast(`Need ${MAKEUP_RECOLOR_INK} Ink to recamo`, 'error');
      return false;
    }
    soundEngine.playPaintSound();
    setInkEnergy((v) => Math.max(0, v - MAKEUP_RECOLOR_INK));
    setCamoColor(gate.camoColor);
    setHasRecamoed(true);
    setSelectedColor(gate.camoColor);
    showToast(`Body color set to ${gate.camoColor}`, 'success');
    return true;
  };

  const TOTAL_SURFACE = GRID_SIZE;

  const computeColorUsage = (tiles = paintedTiles, blds = buildings) => {
    const counts = {};
    Object.values(tiles).forEach((key) => {
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    blds.forEach((b) => {
      const area = (b.footprintWidth || 2) * (b.footprintHeight || 2);
      const colorKey = b.colorKey || b.hexColor;
      if (colorKey) counts[colorKey] = (counts[colorKey] || 0) + area;
    });
    return counts;
  };

  const colorUsage = computeColorUsage();
  const quotaFor = (colorKey) => (colorUsage[colorKey] || 0) / TOTAL_SURFACE;

  const paintTile = (x, y) => {
    const key = `${x},${y}`;
    if (!isGameColor(selectedColor)) {
      showToast('Pick a paint color from the five-color palette', 'error');
      return false;
    }
    if (paintedTiles[key] === selectedColor) return false;
    if (inkEnergy < PAINT_TILE_INK) {
      showToast(`Painting needs ${PAINT_TILE_INK} Ink`, 'error');
      return false;
    }
    const nextTiles = { ...paintedTiles, [key]: selectedColor };
    const usage = computeColorUsage(nextTiles, buildings)[selectedColor] / TOTAL_SURFACE;
    if (usage > COLOR_QUOTA_LIMIT) {
      showToast(`COLOR_QUOTA_EXCEEDED: ${Math.round(usage * 100)}% of surface — max 35% per color`, 'error');
      return false;
    }
    if (usage >= COLOR_QUOTA_WARN) {
      showToast(`Careful: this color is at ${Math.round(usage * 100)}% of the 35% quota`, 'info');
    }
    soundEngine.playPaintSound();
    setInkEnergy((v) => Math.max(0, v - PAINT_TILE_INK));
    setPaintedTiles((prev) => ({ ...prev, [key]: selectedColor }));
    return true;
  };

  /**
   * Walk-brush: paint a footprint of tiles in one state update.
   * Paints as many as ink allows; returns { painted, stop } where stop=true means the
   * brush should switch off (out of ink / quota hit) so toasts do not spam every step.
   */
  const paintTiles = (coords) => {
    if (!isGameColor(selectedColor)) {
      showToast('Pick a paint color from the five-color palette', 'error');
      return { painted: 0, stop: true };
    }
    const todo = coords.filter(
      ({ x, y }) =>
        x >= 0 && y >= 0 && x < MAP_COLS && y < MAP_ROWS && paintedTiles[`${x},${y}`] !== selectedColor
    );
    if (!todo.length) return { painted: 0, stop: false };
    const affordable = Math.floor(inkEnergy / PAINT_TILE_INK);
    if (affordable <= 0) {
      showToast(`Out of ink — brush off (${PAINT_TILE_INK} ink per tile)`, 'error');
      return { painted: 0, stop: true };
    }
    const batch = todo.slice(0, affordable);
    const nextTiles = { ...paintedTiles };
    batch.forEach(({ x, y }) => {
      nextTiles[`${x},${y}`] = selectedColor;
    });
    const usage = computeColorUsage(nextTiles, buildings)[selectedColor] / TOTAL_SURFACE;
    if (usage > COLOR_QUOTA_LIMIT) {
      showToast(`${COLOR_NAMES[selectedColor]} hit the 35% quota — brush off`, 'error');
      return { painted: 0, stop: true };
    }
    if (usage >= COLOR_QUOTA_WARN) {
      showToast(`${COLOR_NAMES[selectedColor]} at ${Math.round(usage * 100)}% of the 35% quota`, 'info');
    }
    soundEngine.playPaintSound();
    setInkEnergy((v) => Math.max(0, v - PAINT_TILE_INK * batch.length));
    setPaintedTiles(nextTiles);
    return { painted: batch.length, stop: batch.length < todo.length };
  };

  /** Walk-eraser: strip paint from a footprint (no ink refund). */
  const eraseTiles = (coords) => {
    const keys = coords.map(({ x, y }) => `${x},${y}`).filter((k) => paintedTiles[k]);
    if (!keys.length) return 0;
    const nextTiles = { ...paintedTiles };
    keys.forEach((k) => delete nextTiles[k]);
    setPaintedTiles(nextTiles);
    return keys.length;
  };

  const toggleBrush = () =>
    setBrush((b) => {
      const on = !b.on;
      showToast(on ? `Brush ON — walk to ${b.erase ? 'erase' : 'paint'}` : 'Brush off', 'info');
      return { ...b, on };
    });
  const cycleBrushSize = () =>
    setBrush((b) => {
      const next = b.size === 1 ? 3 : b.size === 3 ? 5 : 1;
      showToast(`Brush ${next}×${next}`, 'info');
      return { ...b, size: next };
    });
  const toggleEraser = () =>
    setBrush((b) => {
      const erase = !b.erase;
      showToast(erase ? 'Eraser mode' : 'Paint mode', 'info');
      return { ...b, erase };
    });

  const paintBuilding = (buildingId) => {
    const building = buildings.find((b) => b.id === buildingId);
    if (!building) return false;
    if (building.ruined) {
      showToast('Repair this ruin first (walk close · hold F)', 'info');
      return false;
    }
    const nextHex = hexForColor(selectedColor) || GAME_COLORS.GREEN;
    if (building.hexColor === nextHex) return false;
    if (inkEnergy < PAINT_TILE_INK) {
      showToast(`Painting needs ${PAINT_TILE_INK} Ink`, 'error');
      return false;
    }
    soundEngine.playPaintSound();
    setInkEnergy((v) => Math.max(0, v - PAINT_TILE_INK));
    setBuildings((prev) =>
      prev.map((b) => (b.id === buildingId ? { ...b, hexColor: nextHex, colorKey: selectedColor } : b))
    );
    showToast(`Painted ${building.buildingType.replace(/_/g, ' ')}`, 'success');
    return true;
  };

  const repairedCount = buildings.filter(
    (b) =>
      !b.ruined && ['SLEEP_HOUSE', 'INK_HOUSE', 'CRAFT_HOUSE', 'COIN_GENERATOR'].includes(b.buildingType)
  ).length;
  const ruinedCount = buildings.filter((b) => b.ruined && b.buildingType !== 'MAKEUP_HOUSE').length;
  const guideActive = guideStep !== GUIDE_STEPS.DONE;
  const activeRuin = guideActive ? nextGuideRuin(buildings, GATE_SPAWN_TILE) : null;
  const activeRuinId = activeRuin?.id ?? null;
  const taskStage =
    repairedCount < STARTER_HOUSE_COUNT ? 'REPAIR_HOUSES' : 'READY_TO_RAID';

  const persistGuideDone = () => {
    try {
      window.localStorage.setItem(BUILD_GUIDE_KEY, '1');
    } catch (e) {
      /* private mode */
    }
    setGuideStep(GUIDE_STEPS.DONE);
  };

  const clearGuideDone = () => {
    try {
      window.localStorage.removeItem(BUILD_GUIDE_KEY);
    } catch (e) {
      /* private mode */
    }
    setGuideStep(GUIDE_STEPS.WELCOME);
    rebuildHoldRef.current = { progress: 0, id: null };
    setRebuildProgress(0);
    setRebuildingId(null);
  };

  const dismissWelcome = () => {
    if (guideStep === GUIDE_STEPS.WELCOME) setGuideStep(GUIDE_STEPS.REBUILD);
  };

  const dismissMoveTip = () => {
    if (guideStep !== GUIDE_STEPS.MOVE_TIP) return;
    if (ruinedCount <= 0) persistGuideDone();
    else setGuideStep(GUIDE_STEPS.REBUILD);
  };

  const repairBuilding = (buildingId) => {
    const building = buildings.find((b) => b.id === buildingId);
    if (!building) {
      showToast('No ruin here', 'info');
      return false;
    }
    if (!building.ruined) {
      showToast('Already repaired', 'info');
      return false;
    }
    if (coins < REPAIR_BUILDING_COST.coins || inkEnergy < REPAIR_BUILDING_COST.ink) {
      showToast(
        `Repair needs ${REPAIR_BUILDING_COST.coins} coins and ${REPAIR_BUILDING_COST.ink} ink`,
        'error'
      );
      return false;
    }
    const hex = hexForColor(selectedColor) || GAME_COLORS.GREEN;
    soundEngine.playBuildSound();
    setCoins((v) => v - REPAIR_BUILDING_COST.coins);
    setInkEnergy((v) => Math.max(0, v - REPAIR_BUILDING_COST.ink));
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === buildingId
          ? { ...b, ruined: false, hexColor: hex, colorKey: selectedColor, level: 1 }
          : b
      )
    );
    setSelectedBuildingId(buildingId);
    rebuildHoldRef.current = { progress: 0, id: null };
    setRebuildProgress(0);
    setRebuildingId(null);
    const nextRepaired = repairedCount + 1;
    if (guideStep !== GUIDE_STEPS.DONE) {
      if (repairedCount === 0) setGuideStep(GUIDE_STEPS.MOVE_TIP);
      else if (nextRepaired >= STARTER_HOUSE_COUNT) persistGuideDone();
      else setGuideStep(GUIDE_STEPS.REBUILD);
    }
    showToast(`Repaired ${building.buildingType.replace(/_/g, ' ')} · M to move`, 'success');
    return true;
  };

  /** Drive hold-F rebuild. Returns the ruin id when the bar fills so the view can commit. */
  const tickRebuildHold = (dt, holding, ruinId) => {
    const r = rebuildHoldRef.current;
    const allowed =
      holding &&
      ruinId &&
      guideStep !== GUIDE_STEPS.WELCOME &&
      (guideStep === GUIDE_STEPS.DONE ||
        guideStep === GUIDE_STEPS.MOVE_TIP ||
        ruinId === activeRuinId);
    if (allowed) {
      r.id = ruinId;
      r.progress = Math.min(1, r.progress + dt / REBUILD_SECONDS);
    } else {
      r.progress = Math.max(0, r.progress - dt * 1.7);
      if (r.progress <= 0.001) {
        r.progress = 0;
        r.id = holding ? r.id : null;
      }
    }
    if (Math.abs(r.progress - rebuildProgress) > 0.02 || r.id !== rebuildingId) {
      setRebuildProgress(r.progress);
      setRebuildingId(r.id);
    }
    if (allowed && r.progress >= 1 && r.id) {
      const id = r.id;
      r.progress = 0;
      r.id = null;
      setRebuildProgress(0);
      setRebuildingId(null);
      return id;
    }
    return null;
  };

  const occupantBlocksFootprint = (x, y, w, h, occupant) => {
    if (!occupant) return false;
    const column = occupant.column;
    const row = occupant.row;
    return column >= x && column < x + w && row >= y && row < y + h;
  };

  const beginMoveBuilding = (buildingId) => {
    const building = buildings.find((b) => b.id === buildingId);
    if (!building) {
      showToast('Select a repaired house to move', 'info');
      return false;
    }
    if (building.ruined) {
      showToast('Repair this ruin first (walk close · hold F)', 'info');
      return false;
    }
    if (building.buildingType === 'MAKEUP_HOUSE') {
      showToast('Makeup House stays put', 'info');
      return false;
    }
    setSelectedBuildingId(buildingId);
    setMovingBuildingId(buildingId);
    setSelectedTool('MOVE');
    setBrush((prev) => ({ ...prev, on: false }));
    showToast('Click a tile to place · M drop in front · Esc cancel', 'info');
    return true;
  };

  const cancelMoveBuilding = () => {
    if (!movingBuildingId && selectedTool !== 'MOVE') return false;
    setMovingBuildingId(null);
    setSelectedTool('PAINT');
    showToast('Move cancelled', 'info');
    return true;
  };

  const moveBuildingTo = (x, y, { occupant } = {}) => {
    const id = movingBuildingId || (selectedTool === 'MOVE' ? selectedBuildingId : null);
    const building = buildings.find((b) => b.id === id);
    if (!building) {
      showToast('Select a repaired house, then press Move', 'info');
      return false;
    }
    if (building.ruined) {
      showToast('Repair this ruin first before moving it', 'info');
      return false;
    }
    const w = building.footprintWidth || getGameFootprint(building.buildingType).w;
    const h = building.footprintHeight || getGameFootprint(building.buildingType).h;
    if (occupantBlocksFootprint(x, y, w, h, occupant)) {
      showToast('Cannot drop a house on yourself', 'error');
      return false;
    }
    if (!canPlaceOnGameMap(buildings, x, y, w, h, building.id)) {
      showToast('Cannot place house here', 'error');
      return false;
    }
    if (building.xPos === x && building.yPos === y) {
      setMovingBuildingId(null);
      setSelectedTool('PAINT');
      return true;
    }
    soundEngine.playBuildSound();
    setBuildings((prev) => prev.map((b) => (b.id === building.id ? { ...b, xPos: x, yPos: y } : b)));
    setMovingBuildingId(null);
    setSelectedTool('PAINT');
    showToast(`Moved ${building.buildingType.replace(/_/g, ' ')}`, 'success');
    return true;
  };

  const chooseTool = (tool) => {
    setSelectedTool(tool);
    if (tool !== 'MOVE') setMovingBuildingId(null);
  };

  const repairRuinNear = (column, row) => {
    const ruin = findRuinNear(buildings, column, row);
    if (!ruin) {
      showToast('Walk onto a ruined house · hold F to rebuild', 'info');
      return false;
    }
    if (guideActive && guideStep !== GUIDE_STEPS.MOVE_TIP && ruin.id !== activeRuinId) {
      showToast('Follow the marker — rebuild that house first', 'info');
      return false;
    }
    return repairBuilding(ruin.id);
  };

  const handlePlaceAt = async (x, y, extras = {}) => {
    if (movingBuildingId || selectedTool === 'MOVE') {
      return moveBuildingTo(x, y, extras);
    }

    if (selectedTool === 'PAINT') {
      const tiles = [];
      const half = Math.floor(brush.size / 2);
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) tiles.push({ x: x + dx, y: y + dy });
      }
      if (brush.erase) return eraseTiles(tiles);
      return paintTiles(tiles);
    }

    if (selectedTool === 'PATROL_ROBOT') {
      if (!patrolUnlocked) {
        showToast(`Unlock Patrol Robot after ${PATROL_UNLOCK_RAIDS} successful raids`, 'error');
        return false;
      }
      if (defenses.some((d) => (d.type || d.defenseType) === 'PATROL_ROBOT')) {
        showToast('Patrol Robot already placed', 'info');
        return false;
      }
      if (!canPlaceOnGameMap(buildings, x, y, 1, 1)) {
        showToast('Cannot place Patrol Robot here', 'error');
        return false;
      }
      soundEngine.playBuildSound();
      const id = nextEntityId;
      setNextEntityId((n) => n + 1);
      try {
        await placeDefense(userId, activePlotId, 'PATROL_ROBOT', 1);
      } catch (e) {
        /* offline ok */
      }
      setDefenses((prev) => [...prev, { id, type: 'PATROL_ROBOT', defenseType: 'PATROL_ROBOT', xPos: x, yPos: y }]);
      setSelectedTool('PAINT');
      showToast('Patrol Robot deployed', 'success');
      return true;
    }

    if (PLACEABLE_BUILDINGS.includes(selectedTool)) {
      showToast('Houses start ruined — walk to one and press F to repair', 'info');
      return false;
    }

    return false;
  };

  const handleBuildingSelect = (buildingId) => {
    const building = buildings.find((b) => b.id === buildingId);
    if (!building) return null;
    setSelectedBuildingId(buildingId);
    if (selectedTool === 'MOVE' || movingBuildingId) {
      if (!building.ruined) beginMoveBuilding(buildingId);
      return building;
    }
    if (selectedTool === 'PAINT') paintBuilding(buildingId);
    return building;
  };

  const handleUpgradeSelected = async () => {
    const building = buildings.find((b) => b.id === selectedBuildingId);
    if (!building) {
      showToast('Select a building on your base first', 'info');
      return;
    }
    if (building.ruined) {
      showToast('Repair this ruin first (walk close · hold F)', 'info');
      return;
    }
    if (building.level >= 3) {
      showToast('Already at Lvl 3', 'info');
      return;
    }
    const cost = UPGRADE_COSTS[building.level];
    if (!cost) return;
    if (coins < cost.coins || inkEnergy < cost.ink) {
      showToast(`Upgrade needs ${cost.coins} coins and ${cost.ink} ink`, 'error');
      return;
    }
    soundEngine.playBuildSound();
    try {
      await upgradeBuilding(userId, building.id);
    } catch (e) {
      /* backend optional */
    }
    setCoins((v) => v - cost.coins);
    setInkEnergy((v) => v - cost.ink);
    setBuildings((prev) => prev.map((b) => (b.id === building.id ? { ...b, level: b.level + 1 } : b)));
    showToast(`Upgraded ${building.buildingType.replace(/_/g, ' ')} to Lvl ${building.level + 1}`, 'success');
  };

  const upgradeSearchlight = () => {
    const lv = clampSearchlightLevel(searchlightLevel);
    if (lv >= 3) {
      showToast('Searchlight already Lvl 3 — full fortress cover', 'info');
      return false;
    }
    const cost = SEARCHLIGHT_UPGRADE_COSTS[lv];
    if (!cost) return false;
    if (coins < cost.coins || inkEnergy < cost.ink) {
      showToast(`Searchlight L${lv + 1} needs ${cost.coins}c / ${cost.ink} ink`, 'error');
      return false;
    }
    soundEngine.playBuildSound();
    setCoins((v) => v - cost.coins);
    setInkEnergy((v) => v - cost.ink);
    setSearchlightLevel(lv + 1);
    const next = searchlightSpec(lv + 1);
    showToast(`Searchlight L${next.level} · ${Math.round(next.cover * 100)}% radius`, 'success');
    return true;
  };

  const unlockPatrolRobot = () => {
    if (patrolUnlocked) {
      showToast('Patrol Robot already unlocked', 'info');
      return false;
    }
    if (successfulRaids < PATROL_UNLOCK_RAIDS) {
      showToast(`Need ${PATROL_UNLOCK_RAIDS - successfulRaids} more successful raids`, 'error');
      return false;
    }
    if (coins < PATROL_UNLOCK_COINS) {
      showToast(`Need ${PATROL_UNLOCK_COINS} coins to unlock`, 'error');
      return false;
    }
    setCoins((v) => v - PATROL_UNLOCK_COINS);
    setPatrolUnlocked(true);
    setSelectedTool('PATROL_ROBOT');
    soundEngine.playSuccessSound();
    showToast('Patrol Robot unlocked — place it on your base', 'success');
    return true;
  };

  const recordRaidResult = (outcome) => {
    if (outcome === 'CAUGHT') {
      setRaidCooldownUntil(Date.now() + RAID_COOLDOWN_MS);
      return;
    }
    if (outcome === 'SILENT' || outcome === 'ESCAPED') {
      setSuccessfulRaids((n) => n + 1);
    }
  };

  const claimDailyLogin = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (lastDailyClaim === today) {
      showToast('Daily bonus already claimed today', 'info');
      return false;
    }
    setCoins((v) => v + DAILY_LOGIN_COINS);
    setLastDailyClaim(today);
    try {
      window.localStorage.setItem(DAILY_LOGIN_KEY, today);
    } catch (e) {
      /* private mode */
    }
    soundEngine.playSuccessSound();
    showToast(`Daily login +${DAILY_LOGIN_COINS} coins`, 'success');
    return true;
  };

  const tradeChipsForCoins = (amount) => {
    const n = Math.floor(Number(amount) || 0);
    if (n <= 0) {
      showToast('Enter a chip amount to trade', 'info');
      return false;
    }
    if (chips < n) {
      showToast('Not enough chips', 'error');
      return false;
    }
    setChips((v) => v - n);
    setCoins((v) => v + n);
    soundEngine.playSuccessSound();
    showToast(`Traded ${n} chips → ${n} coins`, 'success');
    return true;
  };

  const performPrestige = () => {
    if (prestigeLevel >= 5) {
      showToast('Prestige capped at 5', 'info');
      return false;
    }
    const upgradable = buildings.filter(
      (b) =>
        !b.ruined &&
        ['SLEEP_HOUSE', 'INK_HOUSE', 'CRAFT_HOUSE', 'COIN_GENERATOR'].includes(b.buildingType)
    );
    if (upgradable.length < 4 || !upgradable.every((b) => (b.level || 1) >= 3)) {
      showToast('Repair & upgrade 4 houses to Lvl 3 before Prestige', 'error');
      return false;
    }
    const next = prestigeLevel + 1;
    setPrestigeLevel(next);
    setDefenses([]);
    setPaintedTiles({});
    setSelectedBuildingId(null);
    const ruins = createStarterRuins();
    setBuildings(ruins);
    setNextEntityId(ruins.length + 1);
    setHasRecamoed(false);
    setSearchlightLevel(DEFAULT_SEARCHLIGHT_LEVEL);
    clearGuideDone();
    soundEngine.playSuccessSound();
    showToast(`Prestige ${next} — ruins reset · +${next * 5}% stealth bonus`, 'success');
    return true;
  };

  const value = {
    gameState,
    transitionTo,
    isFirstRun,
    markIntroDone,
    paintTile,
    paintTiles,
    eraseTiles,
    brush,
    setBrush,
    toggleBrush,
    cycleBrushSize,
    toggleEraser,
    paintBuilding,
    colorUsage,
    quotaFor,
    taskStage,
    hasRecamoed,
    guideStep,
    guideActive,
    activeRuinId,
    activeRuin,
    repairedCount,
    ruinedCount,
    rebuildProgress,
    rebuildingId,
    dismissWelcome,
    dismissMoveTip,
    tickRebuildHold,
    persistGuideDone,
    activePlotId,
    setActivePlotId,
    provisionHomeBase,
    userId,
    setUserId,
    coins,
    setCoins,
    inkEnergy,
    setInkEnergy,
    chips,
    setChips,
    characterModel,
    setCharacterModel,
    camoColor,
    setCamoColor,
    changeCamoColor,
    camoReady,
    setCamoReady,
    raidSession,
    setRaidSession,
    hasMakeupHouse,
    prestigeLevel,
    setPrestigeLevel,
    successfulRaids,
    patrolUnlocked,
    raidCooldownUntil,
    lastDailyClaim,
    isMetaOpen,
    setIsMetaOpen,
    selectedColor,
    setSelectedColor,
    selectedTool,
    setSelectedTool: chooseTool,
    buildings,
    setBuildings,
    defenses,
    setDefenses,
    paintedTiles,
    setPaintedTiles,
    selectedBuildingId,
    setSelectedBuildingId,
    movingBuildingId,
    beginMoveBuilding,
    cancelMoveBuilding,
    moveBuildingTo,
    handleUpgradeSelected,
    handlePlaceAt,
    handleBuildingSelect,
    repairBuilding,
    repairRuinNear,
    searchlightLevel,
    setSearchlightLevel,
    upgradeSearchlight,
    unlockPatrolRobot,
    recordRaidResult,
    claimDailyLogin,
    tradeChipsForCoins,
    performPrestige,
    raidTargetId,
    setRaidTargetId,
    raidData,
    setRaidData,
    raidLoot,
    setRaidLoot,
    isOptionsOpen,
    setIsOptionsOpen,
    loadingScreen,
    triggerLoading,
    toasts,
    showToast,
  };

  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>;
}

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used within GameStateProvider');
  return ctx;
}
