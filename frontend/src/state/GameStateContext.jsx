import React, { createContext, useContext, useState, useEffect } from 'react';
import { PLOT_COORDINATES } from '../data/plotCoordinates.js';
import { fetchMap, claimPlot, placeBuilding, placeDefense, fetchRaidTarget, completeRaid, setupPlayer } from '../api.js';
import { soundEngine } from '../soundEngine.js';

const GameStateContext = createContext(null);

export function GameStateProvider({ children }) {
  // Finite State Machine (FSM): 'MAIN_MENU' | 'WORLD_MAP' | 'BASE_BUILDER' | 'STEALTH_RAID'
  const [gameState, setGameState] = useState('WORLD_MAP');
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
  const [prestigeLevel, setPrestigeLevel] = useState(0);

  // World Plots State
  const [plots, setPlots] = useState(PLOT_COORDINATES);

  // Base Builder State
  const [selectedColor, setSelectedColor] = useState('#F1FAEE');
  const [selectedTool, setSelectedTool] = useState('CRAFT_HOUSE');
  const [buildings, setBuildings] = useState([]);
  const [defenses, setDefenses] = useState([]);
  const [paintedTiles, setPaintedTiles] = useState({});

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
  const triggerLoading = (title, subtitle, durationMs = 450, onDone) => {
    setLoadingScreen({ active: true, title, subtitle, progress: 0 });
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setLoadingScreen((prev) => ({ ...prev, progress: pct }));

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setTimeout(() => {
          setLoadingScreen({ active: false, title: '', subtitle: '', progress: 0 });
          if (onDone) onDone();
        }, 100);
      }
    }, 30);
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
    if (nextState === 'BASE_BUILDER') {
      const targetPlotId = params.plotId || activePlotId;
      setActivePlotId(targetPlotId);
      triggerLoading('ENTERING BASE FORTRESS...', `Loading Plot #${targetPlotId} Diorama Grid`, 450, () => {
        setGameState('BASE_BUILDER');
      });
    } else if (nextState === 'STEALTH_RAID') {
      const defender = params.defenderId || raidTargetId;
      setRaidTargetId(defender);
      triggerLoading('CALIBRATING STEALTH LINK...', `Infiltrating Target Operative #${defender}`, 500, async () => {
        try {
          const res = await fetchRaidTarget(defender);
          setRaidData(res);
        } catch (e) {
          setRaidData(null);
        }
        setGameState('STEALTH_RAID');
      });
    } else if (nextState === 'WORLD_MAP') {
      triggerLoading('SYNCING WORLD SECTOR MAP...', '2.5D Interactive Island Grid', 400, () => {
        setGameState('WORLD_MAP');
      });
    } else if (nextState === 'MAIN_MENU') {
      triggerLoading('INITIALIZING OPERATIVE PROFILE...', 'Character & Camo Setup', 450, () => {
        setGameState('MAIN_MENU');
      });
    } else {
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

  const value = {
    gameState,
    transitionTo,
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
    raidTargetId,
    setRaidTargetId,
    raidData,
    setRaidData,
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
