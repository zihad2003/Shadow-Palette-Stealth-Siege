import React, { createContext, useContext, useState } from 'react';
import { UPGRADE_COSTS, MAKEUP_RECOLOR_INK } from '../data/raidTargets.js';
import { GAME_COLORS, hexForColor, isGameColor } from '../colors.js';
import { placeBuilding, placeDefense, fetchRaidTarget, upgradeBuilding } from '../api.js';
import { soundEngine } from '../soundEngine.js';
import { createRaidSession, rejectColorChange } from '../raid/RaidSession.js';
import { MAP_COLS, MAP_ROWS } from '../gamemap/mapConfig.js';
import { canPlaceOnGameMap, getGameFootprint } from '../gamemap/placeUtils.js';

const GameStateContext = createContext(null);

export const INTRO_DONE_KEY = 'sp_intro_done_v1';
export const DAILY_LOGIN_KEY = 'sp_daily_login_v1';
export const PAINT_TILE_INK = 5;
export const PLACE_BUILDING_COST = { coins: 100, ink: 15 };
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
  const [buildings, setBuildings] = useState([
    {
      id: 1,
      buildingType: 'SLEEP_HOUSE',
      xPos: 1,
      yPos: 1,
      footprintWidth: 2,
      footprintHeight: 2,
      hexColor: '#F1FAEE',
      level: 1,
    },
  ]);
  const [defenses, setDefenses] = useState([]);
  const [paintedTiles, setPaintedTiles] = useState({});
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [raidLoot, setRaidLoot] = useState(null);
  const [nextEntityId, setNextEntityId] = useState(2);

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

  const paintBuilding = (buildingId) => {
    const building = buildings.find((b) => b.id === buildingId);
    const nextHex = hexForColor(selectedColor) || GAME_COLORS.GREEN;
    if (!building || building.hexColor === nextHex) return false;
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

  const houseCount = buildings.filter((b) =>
    ['SLEEP_HOUSE', 'INK_HOUSE', 'CRAFT_HOUSE', 'COIN_GENERATOR'].includes(b.buildingType)
  ).length;
  const taskStage = !hasRecamoed ? 'RECAMO' : houseCount < 4 ? 'BUILD_HOUSES' : 'READY_TO_RAID';

  const handlePlaceAt = async (x, y) => {
    if (selectedTool === 'PAINT') return paintTile(x, y);

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

    if (!PLACEABLE_BUILDINGS.includes(selectedTool)) return false;

    const { w, h } = getGameFootprint(selectedTool);
    if (!canPlaceOnGameMap(buildings, x, y, w, h)) {
      showToast('Invalid placement — searchlight plaza or overlap', 'error');
      return false;
    }
    if (coins < PLACE_BUILDING_COST.coins || inkEnergy < PLACE_BUILDING_COST.ink) {
      showToast(`Needs ${PLACE_BUILDING_COST.coins} coins and ${PLACE_BUILDING_COST.ink} ink`, 'error');
      return false;
    }

    const hex = hexForColor(selectedColor) || GAME_COLORS.GREEN;
    const id = nextEntityId;
    setNextEntityId((n) => n + 1);
    soundEngine.playBuildSound();
    try {
      await placeBuilding(userId, activePlotId, selectedTool, 1, x, y, hex);
    } catch (e) {
      /* offline ok */
    }
    setCoins((v) => v - PLACE_BUILDING_COST.coins);
    setInkEnergy((v) => Math.max(0, v - PLACE_BUILDING_COST.ink));
    setBuildings((prev) => [
      ...prev,
      {
        id,
        buildingType: selectedTool,
        xPos: x,
        yPos: y,
        footprintWidth: w,
        footprintHeight: h,
        hexColor: hex,
        colorKey: selectedColor,
        level: 1,
      },
    ]);
    setSelectedBuildingId(id);
    setSelectedTool('PAINT');
    showToast(`Placed ${selectedTool.replace(/_/g, ' ')}`, 'success');
    return true;
  };

  const handleBuildingSelect = (buildingId) => {
    const building = buildings.find((b) => b.id === buildingId);
    if (!building) return null;
    setSelectedBuildingId(buildingId);
    if (selectedTool === 'PAINT') paintBuilding(buildingId);
    return building;
  };

  const handleUpgradeSelected = async () => {
    const building = buildings.find((b) => b.id === selectedBuildingId);
    if (!building) {
      showToast('Select a building on your base first', 'info');
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
    const upgradable = buildings.filter((b) =>
      ['SLEEP_HOUSE', 'INK_HOUSE', 'CRAFT_HOUSE', 'COIN_GENERATOR'].includes(b.buildingType)
    );
    if (upgradable.length < 4 || !upgradable.every((b) => (b.level || 1) >= 3)) {
      showToast('All buildings must be Lvl 3 before Prestige', 'error');
      return false;
    }
    const next = prestigeLevel + 1;
    setPrestigeLevel(next);
    setDefenses([]);
    setPaintedTiles({});
    setSelectedBuildingId(null);
    setBuildings([
      {
        id: 1,
        buildingType: 'SLEEP_HOUSE',
        xPos: 1,
        yPos: 1,
        footprintWidth: 2,
        footprintHeight: 2,
        hexColor: '#F1FAEE',
        level: 1,
      },
    ]);
    setNextEntityId(2);
    setHasRecamoed(false);
    soundEngine.playSuccessSound();
    showToast(`Prestige ${next} — base reset · +${next * 5}% stealth bonus`, 'success');
    return true;
  };

  const value = {
    gameState,
    transitionTo,
    isFirstRun,
    markIntroDone,
    paintTile,
    paintBuilding,
    colorUsage,
    quotaFor,
    taskStage,
    hasRecamoed,
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
    setSelectedTool,
    buildings,
    setBuildings,
    defenses,
    setDefenses,
    paintedTiles,
    setPaintedTiles,
    selectedBuildingId,
    setSelectedBuildingId,
    handleUpgradeSelected,
    handlePlaceAt,
    handleBuildingSelect,
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
