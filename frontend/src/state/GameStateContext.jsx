import React, { createContext, useContext, useState, useEffect } from 'react';
import { PLOT_COORDINATES } from '../data/plotCoordinates.js';
import { UPGRADE_COSTS, MAKEUP_RECOLOR_INK } from '../data/raidTargets.js';
import { GAME_COLORS, hexForColor, isGameColor } from '../colors.js';
import { fetchMap, claimPlot, placeBuilding, placeDefense, fetchRaidTarget, completeRaid, setupPlayer, upgradeBuilding } from '../api.js';
import { soundEngine } from '../soundEngine.js';
import { MAP_COLS, MAP_ROWS } from '../gamemap/mapConfig.js';
import { createRaidSession, rejectColorChange } from '../raid/RaidSession.js';

const GameStateContext = createContext(null);

export const INTRO_DONE_KEY = 'sp_intro_done_v1';
export const PAINT_TILE_INK = 5;
export const COLOR_QUOTA_LIMIT = 0.35;
export const COLOR_QUOTA_WARN = 0.3;
export const GRID_SIZE = MAP_COLS * MAP_ROWS;

export function GameStateProvider({ children }) {
  // FSM: SPLASH | STORY | MAIN_MENU (operative) | PAINT_TUTORIAL | BASE_BUILDER | RAID_FINDER | STEALTH_RAID
  const initialView = new URLSearchParams(window.location.search).get('view');
  const allowedViews = [
    'SPLASH',
    'STORY',
    'MAIN_MENU',
    'PAINT_TUTORIAL',
    'BASE_BUILDER',
    'RAID_FINDER',
    'STEALTH_RAID',
    'WORLD_MAP',
  ];
  const introDone = (() => {
    try {
      return window.localStorage.getItem(INTRO_DONE_KEY) === '1';
    } catch (e) {
      return false;
    }
  })();
  const startView = allowedViews.includes(initialView)
    ? (initialView === 'WORLD_MAP' ? 'BASE_BUILDER' : initialView)
    : introDone
      ? 'MAIN_MENU'
      : 'SPLASH';
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
  const [hoveredPlotId, setHoveredPlotId] = useState(null);
  const [selectedPlot, setSelectedPlot] = useState(PLOT_COORDINATES[0]);

  // Player Resource State
  const [userId, setUserId] = useState(12);
  const [coins, setCoins] = useState(500);
  const [inkEnergy, setInkEnergy] = useState(100);
  const [chips, setChips] = useState(200);
  const [characterModel, setCharacterModel] = useState(1);
  const [camoColor, setCamoColor] = useState('BLUE');
  const [camoReady, setCamoReady] = useState(false);
  const [raidSession, setRaidSession] = useState(null);
  const [prestigeLevel, setPrestigeLevel] = useState(0);

  // World Plots State
  const [plots, setPlots] = useState(PLOT_COORDINATES);

  // Base Builder State
  const [selectedColor, setSelectedColor] = useState('GREEN');
  // First guided task is the Makeup House, so it starts pre-selected
  const [selectedTool, setSelectedTool] = useState('MAKEUP_HOUSE');
  const [buildings, setBuildings] = useState([
    {
      id: 1,
      buildingType: 'SLEEP_HOUSE',
      xPos: 13,
      yPos: 12,
      footprintWidth: 3,
      footprintHeight: 3,
      hexColor: '#F1FAEE',
      level: 1,
    },
  ]);
  const [defenses, setDefenses] = useState([]);
  const [paintedTiles, setPaintedTiles] = useState({});
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [raidLoot, setRaidLoot] = useState(null);

  // Stealth Raid Simulation State
  const [raidTargetId, setRaidTargetId] = useState(34);
  const [raidData, setRaidData] = useState(null);

  // UI Modals & Loading
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState({ active: false, title: '', subtitle: '', progress: 0 });
  const [toasts, setToasts] = useState([]);

  // Toast Notification Trigger
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Loading Screen Transition Trigger
  const triggerLoading = (title, subtitle, durationMs = 400, onDone) => {
    setLoadingScreen({ active: true, title, subtitle, progress: 0 });
    window.setTimeout(() => {
      setLoadingScreen({ active: false, title: '', subtitle: '', progress: 0 });
      if (onDone) onDone();
    }, durationMs);
  };

  // Load Map Data from Backend
  useEffect(() => {
    async function loadMap() {
      try {
        const data = await fetchMap();
        if (data && data.plots) {
          // Merge backend plots data with SVG coordinates
          setPlots((prevPlots) =>
            prevPlots.map((sp) => {
              const match = data.plots.find((bp) => bp.id === sp.id);
              if (match) {
                return {
                  ...sp,
                  ownerId: match.ownerId,
                  status: match.ownerId === userId ? 'CLAIMED_SELF' : (match.isOccupied ? 'CLAIMED_ENEMY' : 'UNCLAIMED'),
                };
              }
              return sp;
            })
          );
        }
      } catch (e) {
        console.warn('Backend offline, using local plot layout.');
      }
    }
    loadMap();
  }, [userId]);

  // Transition Handler for FSM
  const transitionTo = (nextState, params = {}) => {
    soundEngine.playTabSound();
    if (nextState === 'BASE_BUILDER' || nextState === 'WORLD_MAP') {
      const targetPlotId = params.plotId || activePlotId;
      setActivePlotId(targetPlotId);
      setRaidSession(null);
      triggerLoading('ENTERING YOUR BASE...', 'Clash-style home village', 400, () => {
        setGameState('BASE_BUILDER');
      });
    } else if (nextState === 'RAID_FINDER') {
      setRaidSession(null);
      triggerLoading('SCANNING RAID TARGETS...', 'Matching nearby fortress snapshots', 400, () => {
        setGameState('RAID_FINDER');
      });
    } else if (nextState === 'STEALTH_RAID') {
      if (!isGameColor(camoColor)) {
        showToast('Visit the Makeup House and choose a camouflage color first', 'error');
        return;
      }
      const defender = params.defenderId || raidTargetId;
      setRaidTargetId(defender);
      if (params.raidLoot) setRaidLoot(params.raidLoot);
      const session = createRaidSession({ attackerId: userId, defenderId: defender, camoColor });
      setRaidSession(session);
      triggerLoading('CALIBRATING STEALTH LINK...', `Camo locked ${session.camoColor} · grayscale infiltration`, 500, async () => {
        try {
          const res = await fetchRaidTarget(defender);
          setRaidData(res);
        } catch (e) {
          setRaidData(null);
        }
        setGameState('STEALTH_RAID');
      });
    } else if (nextState === 'MAIN_MENU') {
      triggerLoading('INITIALIZING OPERATIVE PROFILE...', 'Character & Camo Setup', 450, () => {
        setGameState('MAIN_MENU');
      });
    } else {
      // SPLASH / STORY / PAINT_TUTORIAL animate themselves — no loading overlay
      setGameState(nextState);
    }
  };

  // Claim Plot Action
  const handleClaimPlot = async (plotId) => {
    soundEngine.playClickSound();
    try {
      const res = await claimPlot(userId, plotId);
      if (res.success) {
        soundEngine.playSuccessSound();
        showToast(`Successfully Claimed Sector Plot #${plotId}!`, 'success');
        if (res.coinsRemaining !== undefined) setCoins(res.coinsRemaining);
        setPlots((prev) =>
          prev.map((p) => (p.id === plotId ? { ...p, ownerId: userId, status: 'CLAIMED_SELF' } : p))
        );
        transitionTo('BASE_BUILDER', { plotId });
      }
    } catch (err) {
      showToast(`Plot Claim Failed: ${err.message}`, 'error');
    }
  };

  const hasMakeupHouse = true;
  const [hasRecamoed, setHasRecamoed] = useState(false);

  const changeCamoColor = (nextColor) => {
    const gate = rejectColorChange(raidSession, nextColor);
    if (!gate.ok) {
      showToast(gate.reason === 'RAID_CAMO_LOCKED' ? 'Camouflage is locked for this raid' : 'Pick one of the five colors', 'error');
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
    setBuildings((prev) => prev.map((b) => (b.id === buildingId ? { ...b, hexColor: nextHex, colorKey: selectedColor } : b)));
    showToast(`Painted ${building.buildingType.replace(/_/g, ' ')}`, 'success');
    return true;
  };

  const houseCount = buildings.filter((b) =>
    ['SLEEP_HOUSE', 'INK_HOUSE', 'CRAFT_HOUSE', 'COIN_GENERATOR'].includes(b.buildingType)
  ).length;
  const taskStage = !hasRecamoed ? 'RECAMO' : houseCount < 4 ? 'BUILD_HOUSES' : 'READY_TO_RAID';

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
      /* backend optional — apply locally */
    }
    setCoins((v) => v - cost.coins);
    setInkEnergy((v) => v - cost.ink);
    setBuildings((prev) =>
      prev.map((b) => (b.id === building.id ? { ...b, level: b.level + 1 } : b))
    );
    showToast(`Upgraded ${building.buildingType.replace('_', ' ')} to Lvl ${building.level + 1}`, 'success');
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
    hoveredPlotId,
    setHoveredPlotId,
    selectedPlot,
    setSelectedPlot,
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
    plots,
    setPlots,
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
    handleClaimPlot,
  };

  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>;
}

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used within GameStateProvider');
  return ctx;
}
