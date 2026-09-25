import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { UPGRADE_COSTS, MAKEUP_RECOLOR_INK } from '../data/raidTargets.js';
import { GAME_COLORS, GAME_COLOR_KEYS, COLOR_NAMES, hexForColor, isGameColor } from '../colors.js';
import {
  placeBuilding,
  placeDefense,
  fetchRaidTarget,
  startRaidSession,
  upgradeBuilding,
  postPresenceHeartbeat,
  fetchOnlinePlayers,
  sendVisitInvite,
  fetchVisitInbox,
  acceptVisitInvite,
  declineVisitInvite,
  fetchVisitSession,
  postVisitState,
  endVisitSession,
} from '../api.js';
import {
  CART_PARTS,
  CART_PART_IDS,
  scatterCartParts,
  cartPartById,
  BUGGY_GEAR_SPEED,
  findPartNear,
  WHEEL_PART_IDS,
  BODY_PART_IDS,
} from '../gamemap/paletteBuggy.js';
import { soundEngine } from '../soundEngine.js';
import { createRaidSession, rejectColorChange } from '../raid/RaidSession.js';
import { MAP_COLS, MAP_ROWS } from '../gamemap/mapConfig.js';
import { canPlaceOnGameMap, getGameFootprint, migrateHouseFootprints } from '../gamemap/placeUtils.js';
import { createStarterRuins, createMaxedHome, REPAIR_BUILDING_COST, findRuinNear, findRepairedNear, nextGuideRuin, STARTER_HOUSE_COUNT, REBUILD_SECONDS, houseLabel } from '../gamemap/starterRuins.js';
import { GATE_SPAWN_TILE } from '../gamemap/mapConfig.js';
import {
  DEFAULT_SEARCHLIGHT_LEVEL,
  SEARCHLIGHT_UPGRADE_COSTS,
  clampSearchlightLevel,
  searchlightSpec,
} from '../raid/stealthConstants.js';
import {
  TASK_REWARDS,
  ROBOT_MAX,
  robotCost,
  formatReward,
  INK_CAP,
  WORLD_SAVE_KEY,
  MOUNT_SECONDS,
  PICKUP_SECONDS,
} from '../economy.js';

const GameStateContext = createContext(null);

export const INTRO_DONE_KEY = 'sp_intro_done_v2';
export const BUILD_GUIDE_KEY = 'sp_base_build_guide_v1';
export const DAILY_LOGIN_KEY = 'sp_daily_login_v1';
export const PAINT_TILE_INK = 5;
export const PLACE_BUILDING_COST = { coins: 100, ink: 15 };
export { REPAIR_BUILDING_COST, SEARCHLIGHT_UPGRADE_COSTS, STARTER_HOUSE_COUNT };
export const GUIDE_STEPS = { WELCOME: 'WELCOME', REBUILD: 'REBUILD', MOVE_TIP: 'MOVE_TIP', DONE: 'DONE' };
export const BUGGY_STORAGE_KEY = 'sp_palette_buggy_v1';
export const BUGGY_SCATTER_VERSION = 2;
export { CART_PARTS, CART_PART_IDS, BUGGY_GEAR_SPEED, WHEEL_PART_IDS, BODY_PART_IDS };

function readBuggySave() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(BUGGY_STORAGE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') {
      return { mountedParts: [], carriedPart: null, remaining: [], scattered: false };
    }
    const mountedParts = Array.isArray(raw.mountedParts)
      ? raw.mountedParts.filter((id) => CART_PART_IDS.includes(id))
      : [];
    const staleLayout = raw.scatterVersion !== BUGGY_SCATTER_VERSION;
    const remaining = staleLayout
      ? []
      : Array.isArray(raw.remaining)
        ? raw.remaining.filter((p) => p && CART_PART_IDS.includes(p.id))
        : [];
    return {
      mountedParts,
      carriedPart: CART_PART_IDS.includes(raw.carriedPart) ? raw.carriedPart : null,
      remaining,
      scattered: staleLayout ? false : !!raw.scattered,
    };
  } catch {
    return { mountedParts: [], carriedPart: null, remaining: [], scattered: false };
  }
}

function writeBuggySave(data) {
  try {
    window.localStorage.setItem(
      BUGGY_STORAGE_KEY,
      JSON.stringify({ ...data, scatterVersion: BUGGY_SCATTER_VERSION })
    );
  } catch {
    /* private mode */
  }
}

function readWorldSave() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(WORLD_SAVE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return null;
    return raw;
  } catch {
    return null;
  }
}

export const PATROL_UNLOCK_RAIDS = 3;
export const PATROL_UNLOCK_COINS = 500;
export { robotCost, ROBOT_MAX };
export const DAILY_LOGIN_COINS = 100;
export const RAID_COOLDOWN_MS = 5 * 60 * 1000;
export const COLOR_QUOTA_LIMIT = 0.35;
export const COLOR_QUOTA_WARN = 0.3;
export const GRID_SIZE = MAP_COLS * MAP_ROWS;
export const PLACEABLE_BUILDINGS = ['CRAFT_HOUSE', 'INK_HOUSE', 'SLEEP_HOUSE', 'COIN_GENERATOR'];

export function GameStateProvider({ children }) {
  // FSM: SPLASH | STORY | INTRO_* | MAIN_MENU | PAINT_TUTORIAL | BASE_BUILDER | RAID_FINDER | RAID_ENTER | STEALTH_RAID | LIVE_DEFENSE
  const initialView = new URLSearchParams(window.location.search).get('view');
  const allowedViews = [
    'SPLASH',
    'STORY',
    'INTRO_FORTRESS',
    'INTRO_COLOR',
    'INTRO_RAID',
    'MAIN_MENU',
    'PAINT_TUTORIAL',
    'BASE_BUILDER',
    'RAID_FINDER',
    'RAID_ENTER',
    'STEALTH_RAID',
    'LIVE_DEFENSE',
    'ADMIN',
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

  const forceFullHome = new URLSearchParams(window.location.search).get('full') === '1';
  const savedWorld = useRef(forceFullHome ? createMaxedHome() : readWorldSave()).current;
  const [userId, setUserId] = useState(() => {
    try {
      const q = Number(new URLSearchParams(window.location.search).get('userId'));
      if (Number.isFinite(q) && q > 0) return q;
      const saved = Number(window.localStorage.getItem('sp_userId'));
      if (Number.isFinite(saved) && saved > 0) return saved;
    } catch {
      /* ignore */
    }
    return 12;
  });
  useEffect(() => {
    try {
      window.localStorage.setItem('sp_userId', String(userId));
    } catch {
      /* ignore */
    }
  }, [userId]);
  const [coins, setCoins] = useState(() => (Number.isFinite(savedWorld?.coins) ? savedWorld.coins : 500));
  const [inkEnergy, setInkEnergy] = useState(() => (Number.isFinite(savedWorld?.inkEnergy) ? savedWorld.inkEnergy : 100));
  const [chips, setChips] = useState(() => (Number.isFinite(savedWorld?.chips) ? savedWorld.chips : 200));
  const [characterModel, setCharacterModel] = useState(() => savedWorld?.characterModel || 1);
  const [camoColor, setCamoColor] = useState(() => savedWorld?.camoColor || 'BLUE');
  const [camoReady, setCamoReady] = useState(false);
  const [raidSession, setRaidSession] = useState(null);
  /** Pending STOMP raid-invite for this user (defender). */
  const [liveRaidInvite, setLiveRaidInvite] = useState(null);
  /** Active live-defense session after Join. */
  const [liveDefense, setLiveDefense] = useState(null);
  const [prestigeLevel, setPrestigeLevel] = useState(() => savedWorld?.prestigeLevel || 0);
  const [successfulRaids, setSuccessfulRaids] = useState(() => savedWorld?.successfulRaids || 0);
  const [patrolUnlocked, setPatrolUnlocked] = useState(() =>
    Array.isArray(savedWorld?.defenses) ? savedWorld.defenses.some((d) => (d.type || d.defenseType) === 'PATROL_ROBOT') : false
  );
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
  const [selectedColor, setSelectedColor] = useState(() => savedWorld?.selectedColor || 'GREEN');
  const [gameDay, setGameDay] = useState(() => {
    const n = Number(savedWorld?.gameDay);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  });
  const [coinBanks, setCoinBanks] = useState(() => {
    const raw = savedWorld?.coinBanks;
    if (!raw || typeof raw !== 'object') return {};
    const next = {};
    Object.entries(raw).forEach(([id, amount]) => {
      const n = Math.floor(Number(amount) || 0);
      if (n > 0) next[String(id)] = n;
    });
    return next;
  });
  const [selectedTool, setSelectedTool] = useState('PAINT');
  /** Walk-brush: paint/erase the tiles you step on while ON. size 1 = single, 3 = 3×3. */
  const [brush, setBrush] = useState({ on: false, size: 1, erase: false });
  const [searchlightLevel, setSearchlightLevel] = useState(() =>
    savedWorld?.searchlightLevel || DEFAULT_SEARCHLIGHT_LEVEL
  );
  const [buildings, setBuildings] = useState(() =>
    migrateHouseFootprints(
      Array.isArray(savedWorld?.buildings) && savedWorld.buildings.length
        ? savedWorld.buildings
        : createStarterRuins()
    )
  );
  const [defenses, setDefenses] = useState(() => (Array.isArray(savedWorld?.defenses) ? savedWorld.defenses : []));
  const [paintedTiles, setPaintedTiles] = useState(() =>
    savedWorld?.paintedTiles && typeof savedWorld.paintedTiles === 'object' ? savedWorld.paintedTiles : {}
  );
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
  const [nextEntityId, setNextEntityId] = useState(() => {
    const list = Array.isArray(savedWorld?.buildings) ? savedWorld.buildings : createStarterRuins();
    const defs = Array.isArray(savedWorld?.defenses) ? savedWorld.defenses : [];
    return Math.max(0, ...list.map((b) => Number(b.id) || 0), ...defs.map((d) => Number(d.id) || 0)) + 1;
  });

  const [raidTargetId, setRaidTargetId] = useState(forceFullHome ? 21 : 34);
  const [raidData, setRaidData] = useState(null);

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState({ active: false, title: '', subtitle: '', progress: 0 });
  const [toasts, setToasts] = useState([]);
  const buggySave = useRef(
    forceFullHome
      ? { mountedParts: [...CART_PART_IDS], carriedPart: null, remaining: [], scattered: true }
      : readBuggySave()
  ).current;
  const [mountedParts, setMountedParts] = useState(() => buggySave.mountedParts);
  const [carriedPart, setCarriedPart] = useState(() => buggySave.carriedPart);
  const [partSpawns, setPartSpawns] = useState(() => buggySave.remaining);
  const [cartScattered, setCartScattered] = useState(() => buggySave.scattered);
  const [garageComplete, setGarageComplete] = useState(() => buggySave.mountedParts.length >= CART_PART_IDS.length);
  const [mountProgress, setMountProgress] = useState(0);
  const mountHoldRef = useRef({ progress: 0 });
  const [pickupAnim, setPickupAnim] = useState(null);
  const pickupAnimRef = useRef(null);
  const [buggySeated, setBuggySeated] = useState(false);
  const [buggyGear, setBuggyGear] = useState(0);
  const [buggyTrackT, setBuggyTrackT] = useState(0);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [rideInviteOpen, setRideInviteOpen] = useState(false);
  const [visitSession, setVisitSession] = useState(null);
  const [visitRole, setVisitRole] = useState(null);
  const [visitSpawnToken, setVisitSpawnToken] = useState(0);
  const homeBackupRef = useRef(null);
  const visitSessionRef = useRef(null);
  const visitRoleRef = useRef(null);
  const endVisitRef = useRef(async () => {});
  const snapshotRef = useRef({});
  const username = `Player${userId}`;
  const isVisitGuest = visitRole === 'guest';
  visitSessionRef.current = visitSession;
  visitRoleRef.current = visitRole;
  snapshotRef.current = { buildings, paintedTiles, mountedParts, garageComplete };
  const buildingsRef = useRef(buildings);
  buildingsRef.current = buildings;
  const worldRef = useRef({});
  worldRef.current = {
    coins,
    inkEnergy,
    chips,
    buildings,
    paintedTiles,
    defenses,
    camoColor,
    characterModel,
    searchlightLevel,
    prestigeLevel,
    successfulRaids,
    selectedColor,
    gameDay,
    coinBanks,
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  };

  const grantReward = (kind, label) => {
    const r = TASK_REWARDS[kind];
    if (!r) return;
    if (r.coins) setCoins((v) => v + r.coins);
    if (r.chips) setChips((v) => v + r.chips);
    showToast(`${label} · ${formatReward(r)}`, 'success');
  };

  const saveWorld = (message = 'Saved') => {
    try {
      window.localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify(worldRef.current));
      if (message) showToast(message, 'success');
      return true;
    } catch {
      showToast('Save failed', 'error');
      return false;
    }
  };

  const collectHouseCoins = (buildingId) => {
    const id = String(buildingId);
    const banks = { ...(worldRef.current.coinBanks || {}) };
    const n = Math.floor(Number(banks[id]) || 0);
    if (n <= 0) {
      showToast('No coins yet', 'info');
      return false;
    }
    banks[id] = 0;
    const nextCoins = (Number(worldRef.current.coins) || 0) + n;
    worldRef.current = { ...worldRef.current, coinBanks: banks, coins: nextCoins };
    setCoinBanks(banks);
    setCoins(nextCoins);
    soundEngine.playSuccessSound();
    showToast(`Collected ${n} coins`, 'success');
    return true;
  };

  const sleepAtHouse = () => {
    const nextDay = (Number(worldRef.current.gameDay) || 1) + 1;
    const nextCoins = (Number(worldRef.current.coins) || 0) + DAILY_LOGIN_COINS;
    const banks = { ...(worldRef.current.coinBanks || {}) };
    let inkAdd = 0;
    (worldRef.current.buildings || []).forEach((b) => {
      if (b.ruined) return;
      const level = b.level || 1;
      if (b.buildingType === 'COIN_GENERATOR') {
        const key = String(b.id);
        banks[key] = (Number(banks[key]) || 0) + level * 8;
      }
      if (b.buildingType === 'INK_HOUSE') inkAdd += level * 4;
    });
    const nextInk = Math.min(INK_CAP, (Number(worldRef.current.inkEnergy) || 0) + inkAdd);
    worldRef.current = {
      ...worldRef.current,
      gameDay: nextDay,
      coins: nextCoins,
      inkEnergy: nextInk,
      coinBanks: banks,
    };
    setGameDay(nextDay);
    setCoins(nextCoins);
    setInkEnergy(nextInk);
    setCoinBanks(banks);
    soundEngine.playSuccessSound();
    return saveWorld(`Day ${nextDay} · saved`);
  };

  const pickPaintColor = (key) => {
    const next = String(key || '').trim().toUpperCase();
    if (!isGameColor(next)) return false;
    setSelectedColor(next);
    setSelectedTool('PAINT');
    setMovingBuildingId(null);
    worldRef.current = { ...worldRef.current, selectedColor: next };
    soundEngine.playPaintSound();
    showToast(COLOR_NAMES[next] || next, 'success');
    return true;
  };

  const cyclePaintColor = () => {
    const cur = worldRef.current.selectedColor;
    const i = GAME_COLOR_KEYS.indexOf(cur);
    const next = GAME_COLOR_KEYS[(i + 1) % GAME_COLOR_KEYS.length];
    return pickPaintColor(next);
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
    showToast('Base ready', 'success');
  };

  const transitionTo = (nextState, params = {}) => {
    soundEngine.playTabSound();
    if (visitSessionRef.current && nextState !== 'BASE_BUILDER') {
      void endVisitRef.current({ silent: true });
    }
    if (nextState === 'BASE_BUILDER') {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('view')) {
          url.searchParams.delete('view');
          window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        }
      } catch {
        /* ignore */
      }
      const targetPlotId = params.plotId || activePlotId;
      setActivePlotId(targetPlotId);
      setRaidSession(null);
      triggerLoading(
        params.loadingTitle || (isVisitGuest ? 'Visit' : 'Base'),
        params.loadingSubtitle || '',
        params.loadingMs || 400,
        () => {
          setGameState('BASE_BUILDER');
        }
      );
    } else if (nextState === 'RAID_FINDER') {
      setRaidSession(null);
      triggerLoading('Raids', '', 400, () => {
        setGameState('RAID_FINDER');
      });
    } else if (nextState === 'RAID_ENTER') {
      if (Date.now() < raidCooldownUntil) {
        const secs = Math.ceil((raidCooldownUntil - Date.now()) / 1000);
        showToast(`Cooldown ${secs}s`, 'error');
        return;
      }
      if (!isGameColor(camoColor)) {
        showToast('Set camo', 'error');
        return;
      }
      if (params.defenderId) setRaidTargetId(params.defenderId);
      if (params.raidLoot) setRaidLoot(params.raidLoot);
      setGameState('RAID_ENTER');
    } else if (nextState === 'STEALTH_RAID') {
      if (Date.now() < raidCooldownUntil) {
        const secs = Math.ceil((raidCooldownUntil - Date.now()) / 1000);
        showToast(`Cooldown ${secs}s`, 'error');
        return;
      }
      if (!isGameColor(camoColor)) {
        showToast('Set camo', 'error');
        return;
      }
      const defender = params.defenderId || raidTargetId;
      setRaidTargetId(defender);
      if (params.raidLoot) setRaidLoot(params.raidLoot);
      const session = createRaidSession({ attackerId: userId, defenderId: defender, camoColor });
      setRaidSession(session);
      const mountRaid = async () => {
        try {
          const res = await fetchRaidTarget(defender);
          setRaidData(res);
        } catch (e) {
          setRaidData(null);
        }
        // Optional live invite — never blocks the async raid if backend is down.
        try {
          const live = await startRaidSession({
            attackerId: userId,
            defenderId: defender,
            raidId: session.raidId,
            attackerName: username,
          });
          if (live?.raidId) {
            setRaidSession((prev) =>
              prev
                ? {
                    ...prev,
                    raidId: live.raidId,
                    liveInviteSent: !!live.liveInviteSent,
                    joinDeadline: live.joinDeadline || null,
                  }
                : prev
            );
          }
        } catch {
          /* offline backend → pure async raid */
        }
        setGameState('STEALTH_RAID');
      };
      // After RaidEnterView cinematic, mount raid immediately — no second loading wipe.
      if (params.skipEnterCinematic) {
        void mountRaid();
      } else {
        triggerLoading('Raid', '', 400, mountRaid);
      }
    } else if (nextState === 'MAIN_MENU') {
      setGameState('MAIN_MENU');
    } else {
      setGameState(nextState);
    }
  };

  const hasMakeupHouse = true;
  const [hasRecamoed, setHasRecamoed] = useState(false);

  const changeCamoColor = (nextColor) => {
    const gate = rejectColorChange(raidSession, nextColor);
    if (!gate.ok) {
      showToast(gate.reason === 'RAID_CAMO_LOCKED' ? 'Camo locked' : 'Pick a color', 'error');
      return false;
    }
    if (gate.camoColor === camoColor) {
      setHasRecamoed(true);
      setCamoReady(true);
      return true;
    }
    if (inkEnergy < MAKEUP_RECOLOR_INK) {
      showToast(`Need ${MAKEUP_RECOLOR_INK} ink`, 'error');
      return false;
    }
    soundEngine.playPaintSound();
    setInkEnergy((v) => Math.max(0, v - MAKEUP_RECOLOR_INK));
    setCamoColor(gate.camoColor);
    setHasRecamoed(true);
    setSelectedColor(gate.camoColor);
    showToast(`Camo ${gate.camoColor}`, 'success');
    return true;
  };

  const dismissLiveRaidInvite = () => setLiveRaidInvite(null);

  const acceptLiveRaidDefense = (invite) => {
    const inv = invite || liveRaidInvite;
    if (!inv?.raidId) return;
    setLiveDefense({
      raidId: inv.raidId,
      attackerUserId: inv.attackerUserId,
      attackerName: inv.attackerName,
    });
    setLiveRaidInvite(null);
    setGameState('LIVE_DEFENSE');
  };

  const clearLiveDefense = () => setLiveDefense(null);

  const TOTAL_SURFACE = GRID_SIZE;

  const computeColorUsage = (tiles = paintedTiles, blds = buildings) => {
    const counts = {};
    Object.values(tiles).forEach((key) => {
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    blds.forEach((b) => {
      const area = (b.footprintWidth || 3) * (b.footprintHeight || 3);
      const colorKey = b.colorKey || b.hexColor;
      if (colorKey) counts[colorKey] = (counts[colorKey] || 0) + area;
    });
    return counts;
  };

  const colorUsage = computeColorUsage();
  const quotaFor = (colorKey) => (colorUsage[colorKey] || 0) / TOTAL_SURFACE;

  const paintTile = (x, y) => {
    if (isVisitGuest) {
      showToast('Visit — no paint', 'info');
      return false;
    }
    const key = `${x},${y}`;
    if (!isGameColor(selectedColor)) {
      showToast('Pick a color', 'error');
      return false;
    }
    if (paintedTiles[key] === selectedColor) return false;
    if (inkEnergy < PAINT_TILE_INK) {
      showToast('Need ink', 'error');
      return false;
    }
    const nextTiles = { ...paintedTiles, [key]: selectedColor };
    const usage = computeColorUsage(nextTiles, buildings)[selectedColor] / TOTAL_SURFACE;
    if (usage > COLOR_QUOTA_LIMIT) {
      showToast('Quota 35%', 'error');
      return false;
    }
    if (usage >= COLOR_QUOTA_WARN) {
      showToast(`Quota ${Math.round(usage * 100)}%`, 'info');
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
    if (isVisitGuest) return { painted: 0, stop: true };
    if (!isGameColor(selectedColor)) {
      showToast('Pick a color', 'error');
      return { painted: 0, stop: true };
    }
    const todo = coords.filter(
      ({ x, y }) =>
        x >= 0 && y >= 0 && x < MAP_COLS && y < MAP_ROWS && paintedTiles[`${x},${y}`] !== selectedColor
    );
    if (!todo.length) return { painted: 0, stop: false };
    const affordable = Math.floor(inkEnergy / PAINT_TILE_INK);
    if (affordable <= 0) {
      showToast('Out of ink', 'error');
      return { painted: 0, stop: true };
    }
    const batch = todo.slice(0, affordable);
    const nextTiles = { ...paintedTiles };
    batch.forEach(({ x, y }) => {
      nextTiles[`${x},${y}`] = selectedColor;
    });
    const usage = computeColorUsage(nextTiles, buildings)[selectedColor] / TOTAL_SURFACE;
    if (usage > COLOR_QUOTA_LIMIT) {
      showToast('Quota 35%', 'error');
      return { painted: 0, stop: true };
    }
    if (usage >= COLOR_QUOTA_WARN) {
      showToast(`Quota ${Math.round(usage * 100)}%`, 'info');
    }
    soundEngine.playPaintSound();
    setInkEnergy((v) => Math.max(0, v - PAINT_TILE_INK * batch.length));
    setPaintedTiles(nextTiles);
    return { painted: batch.length, stop: batch.length < todo.length };
  };

  /** Walk-eraser: strip paint from a footprint (no ink refund). */
  const eraseTiles = (coords) => {
    if (isVisitGuest) return 0;
    const keys = coords.map(({ x, y }) => `${x},${y}`).filter((k) => paintedTiles[k]);
    if (!keys.length) return 0;
    const nextTiles = { ...paintedTiles };
    keys.forEach((k) => delete nextTiles[k]);
    setPaintedTiles(nextTiles);
    return keys.length;
  };

  const toggleBrush = () => {
    if (isVisitGuest) return;
    setBrush((b) => {
      const on = !b.on;
      showToast(on ? (b.erase ? 'Erase' : 'Brush on') : 'Brush off', 'info');
      return { ...b, on };
    });
  };
  const cycleBrushSize = () => {
    if (isVisitGuest) return;
    setBrush((b) => {
      const next = b.size === 1 ? 3 : b.size === 3 ? 5 : 1;
      showToast(`Brush ${next}×${next}`, 'info');
      return { ...b, size: next };
    });
  };
  const toggleEraser = () => {
    if (isVisitGuest) return;
    setBrush((b) => {
      const erase = !b.erase;
      showToast(erase ? 'Erase' : 'Paint', 'info');
      return { ...b, erase };
    });
  };

  const paintBuilding = (buildingId) => {
    if (isVisitGuest) {
      showToast('Visit — no paint', 'info');
      return false;
    }
    const building = buildings.find((b) => b.id === buildingId);
    if (!building) return false;
    if (building.ruined) {
      showToast('Hold F to rebuild', 'info');
      return false;
    }
    const nextHex = hexForColor(selectedColor) || GAME_COLORS.GREEN;
    if (building.hexColor === nextHex) return false;
    if (inkEnergy < PAINT_TILE_INK) {
      showToast('Need ink', 'error');
      return false;
    }
    soundEngine.playPaintSound();
    setInkEnergy((v) => Math.max(0, v - PAINT_TILE_INK));
    setBuildings((prev) =>
      prev.map((b) => (b.id === buildingId ? { ...b, hexColor: nextHex, colorKey: selectedColor } : b))
    );
    showToast('Painted', 'success');
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
    if (isVisitGuest) {
      showToast('Visit — no repair', 'info');
      return false;
    }
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
      showToast(`Need ${REPAIR_BUILDING_COST.coins}c / ${REPAIR_BUILDING_COST.ink} ink`, 'error');
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
    grantReward('REBUILD', `Repaired ${houseLabel(building.buildingType)}`);
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
      const craftMul = buildingsRef.current.some((b) => !b.ruined && b.buildingType === 'CRAFT_HOUSE') ? 0.7 : 1;
      r.progress = Math.min(1, r.progress + dt / (REBUILD_SECONDS * craftMul));
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
    if (isVisitGuest) {
      showToast('Visit — no move', 'info');
      return false;
    }
    const building = buildings.find((b) => b.id === buildingId);
    if (!building) {
      showToast('Select a house', 'info');
      return false;
    }
    if (building.ruined) {
      showToast('Hold F to rebuild', 'info');
      return false;
    }
    if (building.buildingType === 'MAKEUP_HOUSE') {
      showToast('Makeup stays', 'info');
      return false;
    }
    setSelectedBuildingId(buildingId);
    setMovingBuildingId(buildingId);
    setSelectedTool('MOVE');
    setBrush((prev) => ({ ...prev, on: false }));
    showToast('Click tile · M drop · Esc', 'info');
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
      showToast('Select a house', 'info');
      return false;
    }
    if (building.ruined) {
      showToast('Rebuild first', 'info');
      return false;
    }
    const w = building.footprintWidth || getGameFootprint(building.buildingType).w;
    const h = building.footprintHeight || getGameFootprint(building.buildingType).h;
    if (occupantBlocksFootprint(x, y, w, h, occupant)) {
      showToast('Cannot drop on you', 'error');
      return false;
    }
    if (!canPlaceOnGameMap(buildings, x, y, w, h, building.id)) {
      showToast('Cannot place here', 'error');
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
    showToast('Moved', 'success');
    return true;
  };

  const chooseTool = (tool) => {
    setSelectedTool(tool);
    if (tool !== 'MOVE') setMovingBuildingId(null);
  };

  const repairRuinNear = (column, row) => {
    const ruin = findRuinNear(buildings, column, row);
    if (!ruin) {
      showToast('Hold F on a ruin', 'info');
      return false;
    }
    if (guideActive && guideStep !== GUIDE_STEPS.MOVE_TIP && ruin.id !== activeRuinId) {
      showToast('Follow the marker', 'info');
      return false;
    }
    return repairBuilding(ruin.id);
  };

  const handlePlaceAt = async (x, y, extras = {}) => {
    if (isVisitGuest) {
      showToast('Visit — no build', 'info');
      return false;
    }
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
      const owned = defenses.filter((d) => (d.type || d.defenseType) === 'PATROL_ROBOT').length;
      if (owned >= ROBOT_MAX) {
        showToast('Robot cap', 'info');
        return false;
      }
      const cost = robotCost(owned);
      if (coins < cost) {
        showToast(`Need ${cost}c`, 'error');
        return false;
      }
      if (!canPlaceOnGameMap(buildings, x, y, 1, 1)) {
        showToast('Cannot place patrol', 'error');
        return false;
      }
      soundEngine.playBuildSound();
      const id = nextEntityId;
      setNextEntityId((n) => n + 1);
      setCoins((v) => v - cost);
      try {
        await placeDefense(userId, activePlotId, 'PATROL_ROBOT', 1);
      } catch (e) {
        /* offline ok */
      }
      setDefenses((prev) => [...prev, { id, type: 'PATROL_ROBOT', defenseType: 'PATROL_ROBOT', xPos: x, yPos: y }]);
      setPatrolUnlocked(true);
      setSelectedTool('PAINT');
      showToast(`Robot ${owned + 1}`, 'success');
      return true;
    }

    if (PLACEABLE_BUILDINGS.includes(selectedTool)) {
      showToast('Hold F on a ruin', 'info');
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

  const upgradeHouse = async (buildingId) => {
    const building = buildings.find((b) => b.id === buildingId);
    if (!building) {
      showToast('Select a house', 'info');
      return false;
    }
    if (building.ruined) {
      showToast('Hold F to rebuild', 'info');
      return false;
    }
    if (building.level >= 3) {
      showToast('Already at Lvl 3', 'info');
      return false;
    }
    const cost = UPGRADE_COSTS[building.level];
    if (!cost) return false;
    if (coins < cost.coins || inkEnergy < cost.ink) {
      showToast(`Need ${cost.coins}c / ${cost.ink} ink`, 'error');
      return false;
    }
    soundEngine.playBuildSound();
    try {
      await upgradeBuilding(userId, building.id);
    } catch (e) {
      /* backend optional */
    }
    setCoins((v) => v - cost.coins);
    setInkEnergy((v) => v - cost.ink);
    const nextLevel = building.level + 1;
    setBuildings((prev) => prev.map((b) => (b.id === building.id ? { ...b, level: nextLevel } : b)));
    showToast(`${houseLabel(building.buildingType)} L${nextLevel}`, 'success');
    return true;
  };

  const handleUpgradeSelected = () => upgradeHouse(selectedBuildingId);

  const upgradeSearchlight = () => {
    const lv = clampSearchlightLevel(searchlightLevel);
    if (lv >= 3) {
      showToast('Light max', 'info');
      return false;
    }
    const cost = SEARCHLIGHT_UPGRADE_COSTS[lv];
    if (!cost) return false;
    if (coins < cost.coins || inkEnergy < cost.ink) {
      showToast(`Need ${cost.coins}c / ${cost.ink} ink`, 'error');
      return false;
    }
    soundEngine.playBuildSound();
    setCoins((v) => v - cost.coins);
    setInkEnergy((v) => v - cost.ink);
    setSearchlightLevel(lv + 1);
    const next = searchlightSpec(lv + 1);
    showToast(`Light L${next.level}`, 'success');
    return true;
  };

  const unlockPatrolRobot = () => {
    const owned = defenses.filter((d) => (d.type || d.defenseType) === 'PATROL_ROBOT').length;
    if (owned >= ROBOT_MAX) {
      showToast('Robot cap', 'info');
      return false;
    }
    const cost = robotCost(owned);
    if (coins < cost) {
      showToast(`Need ${cost}c`, 'error');
      return false;
    }
    setSelectedTool('PATROL_ROBOT');
    showToast(`Click tile · ${cost}c`, 'info');
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
      showToast('Claimed', 'info');
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
      showToast('Enter chips', 'info');
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
      showToast('Need 4× L3 houses', 'error');
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
    setMountedParts([]);
    setCarriedPart(null);
    setPartSpawns([]);
    setCartScattered(false);
    setGarageComplete(false);
    setBuggySeated(false);
    setBuggyGear(0);
    setBuggyTrackT(0);
    writeBuggySave({ mountedParts: [], carriedPart: null, remaining: [], scattered: false });
    soundEngine.playSuccessSound();
    showToast(`Prestige ${next}`, 'success');
    return true;
  };

  const persistBuggy = (next = {}) => {
    if (visitRole === 'guest') return;
    const data = {
      mountedParts: next.mountedParts ?? mountedParts,
      carriedPart: next.carriedPart === undefined ? carriedPart : next.carriedPart,
      remaining: next.remaining ?? partSpawns,
      scattered: next.scattered ?? cartScattered,
    };
    writeBuggySave(data);
  };

  const missingPartLabel = () => {
    const missing = CART_PARTS.find((p) => !mountedParts.includes(p.id));
    return missing ? missing.label : null;
  };

  const pickUpPartAt = (column, row) => {
    if (isVisitGuest) return false;
    if (pickupAnimRef.current && pickupAnimRef.current.t < 1) return false;
    if (carriedPart) return false;
    const part = findPartNear(partSpawns, column, row);
    if (!part) return false;
    const next = partSpawns.filter((p) => p.id !== part.id);
    setPartSpawns(next);
    setCarriedPart(part.id);
    const anim = { partId: part.id, column: part.column, row: part.row, t: 0 };
    setPickupAnim(anim);
    pickupAnimRef.current = anim;
    persistBuggy({ remaining: next, carriedPart: part.id, scattered: true });
    soundEngine.playClickSound();
    grantReward('PICK_PART', cartPartById(part.id)?.label || 'Part');
    return true;
  };

  const dropCarriedPart = (column, row) => {
    if (isVisitGuest || !carriedPart) return false;
    const next = [...partSpawns, { id: carriedPart, column: Math.round(column), row: Math.round(row) }];
    setPartSpawns(next);
    setCarriedPart(null);
    persistBuggy({ remaining: next, carriedPart: null, scattered: true });
    showToast('Dropped · E to pick', 'info');
    return true;
  };

  const tickPickupAnim = (dt) => {
    const a = pickupAnimRef.current;
    if (!a) return false;
    a.t = Math.min(1, (a.t || 0) + dt / PICKUP_SECONDS);
    if (a.t >= 1) {
      pickupAnimRef.current = null;
      setPickupAnim(null);
      return false;
    }
    return true;
  };

  const tickMountHold = (dt, holding) => {
    const r = mountHoldRef.current;
    if (holding && carriedPart && !isVisitGuest) {
      const craftMul = buildingsRef.current.some((b) => !b.ruined && b.buildingType === 'CRAFT_HOUSE') ? 0.7 : 1;
      r.progress = Math.min(1, r.progress + dt / (MOUNT_SECONDS * craftMul));
    } else {
      r.progress = Math.max(0, r.progress - dt * 1.7);
    }
    if (Math.abs(r.progress - mountProgress) > 0.02) setMountProgress(r.progress);
    if (holding && r.progress >= 1 && carriedPart) {
      r.progress = 0;
      setMountProgress(0);
      return carriedPart;
    }
    return null;
  };

  const mountCarriedPart = () => {
    if (isVisitGuest || !carriedPart) return false;
    if (mountedParts.includes(carriedPart)) {
      setCarriedPart(null);
      persistBuggy({ carriedPart: null });
      return false;
    }
    const nextMounted = [...mountedParts, carriedPart];
    const done = nextMounted.length >= CART_PART_IDS.length;
    setMountedParts(nextMounted);
    setCarriedPart(null);
    setGarageComplete(done);
    persistBuggy({ mountedParts: nextMounted, carriedPart: null, scattered: true });
    mountHoldRef.current.progress = 0;
    setMountProgress(0);
    soundEngine.playBuildSound();
    if (done) {
      grantReward('BUGGY_DONE', 'Buggy ready');
    } else {
      grantReward('MOUNT_PART', 'Mounted');
    }
    return true;
  };

  const sitInBuggy = (role = 'driver') => {
    if (!garageComplete) {
      showToast('Find remaining parts', 'info');
      return false;
    }
    setBuggySeated(true);
    setBrush((b) => ({ ...b, on: false }));
    if (visitSession) {
      const host = visitRole === 'host' || (!visitRole && userId === visitSession.hostId);
      void postVisitState({
        visitId: visitSession.visitId,
        userId,
        seated: true,
        gear: host ? 1 : undefined,
        trackT: host ? buggyTrackT : undefined,
      }).catch(() => {});
    }
    if (role === 'passenger') {
      showToast('Passenger', 'success');
      return true;
    }
    setBuggyGear(1);
    setRideInviteOpen(true);
    showToast('Car started', 'success');
    return true;
  };

  const standFromBuggy = () => {
    setBuggyGear(0);
    setBuggySeated(false);
    setRideInviteOpen(false);
    if (visitSession) {
      void postVisitState({
        visitId: visitSession.visitId,
        userId,
        seated: false,
        gear: visitRole === 'guest' ? undefined : 0,
        trackT: visitRole === 'guest' ? undefined : buggyTrackT,
      }).catch(() => {});
    }
    return true;
  };

  const setBuggyGearClamped = (next) => {
    if (visitRole === 'guest') return;
    const gear = Math.max(0, Math.min(3, next));
    setBuggyGear(gear);
    if (visitSession && (visitRole === 'host' || !visitRole)) {
      void postVisitState({
        visitId: visitSession.visitId,
        userId,
        seated: buggySeated,
        gear,
        trackT: buggyTrackT,
      }).catch(() => {});
    }
  };

  const bumpBuggyGear = (delta) => {
    if (!buggySeated || visitRole === 'guest') return;
    setBuggyGearClamped(buggyGear + delta);
  };

  const advanceBuggyTrack = (dt) => {
    if (visitRole === 'guest') return;
    const speed = BUGGY_GEAR_SPEED[buggyGear] || 0;
    if (speed <= 0) return;
    setBuggyTrackT((t) => {
      let n = t + speed * dt;
      n %= 1;
      if (n < 0) n += 1;
      return n;
    });
  };

  const applyHostSnapshot = (snap) => {
    if (!snap || typeof snap !== 'object') return;
    if (Array.isArray(snap.buildings)) setBuildings(migrateHouseFootprints(snap.buildings));
    if (snap.paintedTiles && typeof snap.paintedTiles === 'object') setPaintedTiles(snap.paintedTiles);
    const parts = Array.isArray(snap.mountedParts) ? snap.mountedParts.filter((id) => CART_PART_IDS.includes(id)) : [];
    setMountedParts(parts);
    setGarageComplete(parts.length >= CART_PART_IDS.length || snap.garageComplete === true);
    setPartSpawns([]);
    setCarriedPart(null);
  };

  const restoreHomeBackup = () => {
    const home = homeBackupRef.current;
    if (!home) return;
    setBuildings(migrateHouseFootprints(home.buildings));
    setPaintedTiles(home.paintedTiles);
    setMountedParts(home.mountedParts);
    setPartSpawns(home.partSpawns);
    setCarriedPart(home.carriedPart);
    setCartScattered(home.cartScattered);
    setGarageComplete(home.garageComplete);
    homeBackupRef.current = null;
  };

  const enterVisit = (session, role) => {
    if (!session) return;
    visitSessionRef.current = session;
    visitRoleRef.current = role;
    setVisitSession(session);
    setVisitRole(role);
    setBrush((b) => ({ ...b, on: false }));
    setPendingInvite(null);
    setRideInviteOpen(false);
    if (role === 'guest') {
      setBuggyGear(0);
      setBuggyTrackT(0);
      setVisitSpawnToken((n) => n + 1);
      applyHostSnapshot(session.snapshot);
      setBuggySeated(true);
    }
    showToast(role === 'guest' ? `Joined ${session.hostName}` : `${session.guestName} joined your base`, 'success');
  };

  const endVisit = async ({ silent = false, kicked = false } = {}) => {
    const session = visitSessionRef.current;
    const role = visitRoleRef.current;
    if (!session && !role) return;
    visitSessionRef.current = null;
    visitRoleRef.current = null;
    if (session) {
      try {
        await endVisitSession({ visitId: session.visitId, userId });
      } catch {
        /* offline */
      }
    }
    if (role === 'guest') restoreHomeBackup();
    setVisitSession(null);
    setVisitRole(null);
    setBuggySeated(false);
    setBuggyGear(0);
    if (!silent) {
      showToast(kicked ? 'Visit ended' : 'Visit ended', 'info');
    }
  };
  endVisitRef.current = endVisit;

  const invitePlayer = async (guestId) => {
    if (!garageComplete || !buggySeated) {
      showToast('Sit to invite', 'info');
      return false;
    }
    try {
      await postPresenceHeartbeat({
        userId,
        username,
        characterModel,
        camoColor,
        snapshot: snapshotRef.current,
      });
      await sendVisitInvite(userId, guestId);
      showToast('Invite sent', 'success');
      return true;
    } catch (e) {
      const raw = e?.data?.error || e.message || '';
      showToast(raw === 'GUEST_OFFLINE' ? 'Player offline' : raw || 'Could not send invite', 'error');
      return false;
    }
  };

  const closeRideInvite = () => setRideInviteOpen(false);
  const openRideInvite = () => setRideInviteOpen(true);

  const acceptPendingInvite = async (invite = pendingInvite) => {
    if (!invite) return false;
    try {
      homeBackupRef.current = {
        buildings,
        paintedTiles,
        mountedParts,
        partSpawns,
        carriedPart,
        cartScattered,
        garageComplete,
      };
      const session = await acceptVisitInvite(invite.id, userId);
      enterVisit(session, 'guest');
      void postVisitState({
        visitId: session.visitId,
        userId,
        seated: true,
      }).catch(() => {});
      triggerLoading(
        `ARRIVING AT ${String(session.hostName || 'HOST').toUpperCase()} FORTRESS`,
        'You are in their base',
        700,
        () => setGameState('BASE_BUILDER')
      );
      return true;
    } catch (e) {
      homeBackupRef.current = null;
      showToast(e?.data?.error || e.message || 'Invite expired', 'error');
      setPendingInvite(null);
      return false;
    }
  };

  const declinePendingInvite = async (invite = pendingInvite) => {
    if (!invite) return false;
    try {
      await declineVisitInvite(invite.id, userId);
    } catch {
      /* ignore */
    }
    setPendingInvite(null);
    showToast('Invite declined', 'info');
    return true;
  };

  const patrolCount = defenses.filter((d) => (d.type || d.defenseType) === 'PATROL_ROBOT').length;
  const nextRobotCost = robotCost(patrolCount);

  useEffect(() => {
    const id = window.setInterval(() => {
      const list = buildingsRef.current || [];
      const inkN = list
        .filter((b) => !b.ruined && b.buildingType === 'INK_HOUSE')
        .reduce((s, b) => s + (b.level || 1), 0);
      const coinN = list
        .filter((b) => !b.ruined && b.buildingType === 'COIN_GENERATOR')
        .reduce((s, b) => s + (b.level || 1), 0);
      if (inkN) {
        setInkEnergy((v) => {
          const next = Math.min(INK_CAP, v + inkN);
          worldRef.current = { ...worldRef.current, inkEnergy: next };
          return next;
        });
      }
      if (coinN) {
        setCoinBanks((prev) => {
          const next = { ...prev };
          list.forEach((b) => {
            if (b.ruined || b.buildingType !== 'COIN_GENERATOR') return;
            const key = String(b.id);
            next[key] = (Number(next[key]) || 0) + (b.level || 1);
          });
          worldRef.current = { ...worldRef.current, coinBanks: next };
          return next;
        });
      }
    }, 10000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!forceFullHome) return;
    try {
      window.localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify(worldRef.current));
      window.localStorage.setItem(INTRO_DONE_KEY, '1');
      window.localStorage.setItem(BUILD_GUIDE_KEY, '1');
      writeBuggySave({
        mountedParts: [...CART_PART_IDS],
        carriedPart: null,
        remaining: [],
        scattered: true,
      });
    } catch {
      /* private mode */
    }
  }, [forceFullHome]);

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
    liveRaidInvite,
    setLiveRaidInvite,
    liveDefense,
    acceptLiveRaidDefense,
    dismissLiveRaidInvite,
    clearLiveDefense,
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
    patrolCount,
    nextRobotCost,
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
    username,
    mountedParts,
    carriedPart,
    partSpawns,
    garageComplete,
    mountProgress,
    buggySeated,
    buggyGear,
    buggyTrackT,
    onlinePlayers,
    pendingInvite,
    rideInviteOpen,
    closeRideInvite,
    openRideInvite,
    visitSession,
    visitRole,
    isVisitGuest,
    visitSpawnToken,
    pickupAnim,
    tickPickupAnim,
    pickUpPartAt,
    dropCarriedPart,
    tickMountHold,
    mountCarriedPart,
    sitInBuggy,
    standFromBuggy,
    setBuggyGearClamped,
    bumpBuggyGear,
    advanceBuggyTrack,
    invitePlayer,
    acceptPendingInvite,
    declinePendingInvite,
    endVisit,
    missingPartLabel,
    saveWorld,
    gameDay,
    coinBanks,
    collectHouseCoins,
    sleepAtHouse,
    pickPaintColor,
    cyclePaintColor,
    upgradeHouse,
  };

  useEffect(() => {
    if (visitRole === 'guest') return;
    writeBuggySave({
      mountedParts,
      carriedPart,
      remaining: partSpawns,
      scattered: cartScattered,
    });
  }, [mountedParts, carriedPart, partSpawns, cartScattered, visitRole]);

  useEffect(() => {
    setGarageComplete(mountedParts.length >= CART_PART_IDS.length);
  }, [mountedParts]);

  useEffect(() => {
    if (visitRole === 'guest') return;
    if (mountedParts.length >= CART_PART_IDS.length) return;
    const missing = CART_PART_IDS.filter((id) => !mountedParts.includes(id) && id !== carriedPart);
    if (missing.length === 0) return;
    const spawned = partSpawns.filter((p) => missing.includes(p.id));
    if (spawned.length >= missing.length) return;
    const remaining = scatterCartParts(buildings).filter((p) => missing.includes(p.id));
    if (
      remaining.length === partSpawns.length &&
      remaining.every((p, i) => partSpawns[i]?.id === p.id && partSpawns[i]?.column === p.column && partSpawns[i]?.row === p.row)
    ) {
      return;
    }
    setPartSpawns(remaining);
    setCartScattered(true);
    writeBuggySave({ mountedParts, carriedPart, remaining, scattered: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitRole, mountedParts, carriedPart, partSpawns]);

  useEffect(() => {
    if (
      gameState === 'STEALTH_RAID' ||
      gameState === 'RAID_ENTER' ||
      gameState === 'SPLASH' ||
      gameState === 'STORY' ||
      gameState === 'INTRO_FORTRESS' ||
      gameState === 'INTRO_COLOR' ||
      gameState === 'INTRO_RAID' ||
      gameState === 'MAIN_MENU' ||
      gameState === 'PAINT_TUTORIAL'
    )
      return undefined;
    const beat = () => {
      postPresenceHeartbeat({
        userId,
        username,
        characterModel,
        camoColor,
        snapshot: snapshotRef.current,
      }).catch(() => {});
    };
    beat();
    const id = window.setInterval(beat, 8000);
    return () => window.clearInterval(id);
  }, [gameState, userId, username, characterModel, camoColor]);

  useEffect(() => {
    if (
      gameState === 'STEALTH_RAID' ||
      gameState === 'RAID_ENTER' ||
      gameState === 'SPLASH' ||
      gameState === 'STORY' ||
      gameState === 'INTRO_FORTRESS' ||
      gameState === 'INTRO_COLOR' ||
      gameState === 'INTRO_RAID' ||
      gameState === 'MAIN_MENU' ||
      gameState === 'PAINT_TUTORIAL'
    )
      return undefined;
    const poll = async () => {
      try {
        const box = await fetchVisitInbox(userId);
        const pending = (box.pending && box.pending[0]) || null;
        setPendingInvite(pending);
        const active = box.active;
        if (active && active.success !== false && active.status !== 'ENDED') {
          const role = Number(active.hostId) === Number(userId) ? 'host' : 'guest';
          if (!visitSessionRef.current) {
            if (role === 'host') enterVisit(active, 'host');
          } else if (Number(visitSessionRef.current.visitId) === Number(active.visitId)) {
            setVisitSession(active);
          }
        } else if (visitSessionRef.current) {
          void endVisitRef.current({ kicked: visitRoleRef.current === 'guest' });
        }
      } catch {
        /* backend optional */
      }
    };
    poll();
    const id = window.setInterval(poll, 4000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, userId]);

  useEffect(() => {
    if (!buggySeated) return undefined;
    const poll = async () => {
      try {
        const res = await fetchOnlinePlayers(userId);
        setOnlinePlayers(res.players || []);
      } catch {
        setOnlinePlayers([]);
      }
    };
    poll();
    const id = window.setInterval(poll, 5000);
    return () => window.clearInterval(id);
  }, [buggySeated, userId]);

  useEffect(() => {
    if (!visitSession?.visitId) return undefined;
    const visitId = visitSession.visitId;
    const poll = async () => {
      try {
        const s = await fetchVisitSession(visitId);
        if (!s || s.status === 'ENDED' || s.success === false) {
          void endVisitRef.current({ kicked: visitRoleRef.current === 'guest' });
          return;
        }
        setVisitSession(s);
        if (visitRoleRef.current === 'guest') {
          setBuggyGear(Number(s.gear) || 0);
          setBuggyTrackT(Number(s.trackT) || 0);
          if (s.guestSeated !== undefined && s.guestSeated !== buggySeated) {
            /* guest seated is local authority; ignore */
          }
        } else if (s.guestSeated !== visitSession.guestSeated) {
          setVisitSession(s);
        }
      } catch {
        /* ignore */
      }
    };
    const id = window.setInterval(poll, 800);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitSession?.visitId]);

  useEffect(() => {
    if (!visitSession?.visitId || visitRole === 'guest') return undefined;
    const id = window.setInterval(() => {
      postVisitState({
        visitId: visitSession.visitId,
        userId,
        seated: buggySeated,
        gear: buggyGear,
        trackT: buggyTrackT,
      }).catch(() => {});
    }, 450);
    return () => window.clearInterval(id);
  }, [visitSession?.visitId, visitRole, buggySeated, buggyGear, buggyTrackT, userId]);

  useEffect(() => {
    if (!visitSession?.visitId || visitRole !== 'guest') return undefined;
    const id = window.setInterval(() => {
      postVisitState({
        visitId: visitSession.visitId,
        userId,
        seated: buggySeated,
      }).catch(() => {});
    }, 800);
    return () => window.clearInterval(id);
  }, [visitSession?.visitId, visitRole, buggySeated, userId]);

  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>;
}

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used within GameStateProvider');
  return ctx;
}
