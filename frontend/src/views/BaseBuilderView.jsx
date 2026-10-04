import React, { useEffect, useMemo, useRef, useState } from 'react';
import DailyTasksPanel from '../components/hud/DailyTasksPanel.jsx';
import { Camera, X } from 'lucide-react';
import { Plus, Minus, Eye, Map } from 'lucide-react';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import BottomBuildDock from '../components/hud/BottomBuildDock.jsx';
import MakeupHousePanel from '../components/hud/MakeupHousePanel.jsx';
import HudBanner from '../components/ui/HudBanner.jsx';
import HudHeader from '../components/ui/HudHeader.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import GameMap from '../gamemap/GameMap.jsx';
import { useGameState, GUIDE_STEPS, STARTER_HOUSE_COUNT } from '../state/GameStateContext.jsx';
import { GATE_SPAWN_TILE, WALK_TILE_SECONDS } from '../gamemap/mapConfig.js';
import { isTileInBeam } from '../raid/SearchlightSensor.js';
import { LIVE_CATCH_HOLD_SECONDS, ROBOT_CHASE_PROXIMITY } from '../raid/stealthConstants.js';
import { collectSolidTiles } from '../gamemap/occupancy.js';
import { isNearGarage, findPartNear, cartPartById, garageCenterTile } from '../gamemap/paletteBuggy.js';
import { stepDirection, attemptStep, nudgeOffSolid, TURN_RATE } from '../character/gridMover.js';
import { noteKeyDown, noteKeyUp, walkAxes, shiftHeld, codeHeld, bindKeyReleaseGuards } from '../character/walkInput.js';
import { soundEngine } from '../soundEngine.js';
import { listDecorOccupiedTiles } from '../gamemap/MapDecor.js';
import { findRuinNear, findRepairedNear, nextGuideRuin, houseLabel } from '../gamemap/starterRuins.js';
import { canPlaceOnGameMap } from '../gamemap/placeUtils.js';
import { createSprintMeter, SPRINT_SPEED_MULT } from '../character/sprint.js';
import StaminaBar from '../components/hud/StaminaBar.jsx';
import BuildQuestHud from '../components/hud/BuildQuestHud.jsx';
import ActionPrompt from '../components/hud/ActionPrompt.jsx';
import HouseStation from '../components/hud/HouseStation.jsx';
import { GAME_COLORS, GAME_COLOR_KEYS } from '../colors.js';
import { ensureStompConnected, stompPublish, stompSubscribe, stompUnsubscribe } from '../live/stompClient.js';
import { fetchMyJailStay } from '../api.js';
import RansomModal from '../components/raid/RansomModal.jsx';

const BASE_DECOR_SEED = 7;

/** Live defense: chase range + hold time to catch and jail an intruding raider. */
const CATCH_RANGE_TILES = 2.5;
const CATCH_HOLD_SECONDS = LIVE_CATCH_HOLD_SECONDS;

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
    reportVisitPose,
    visitRole,
    isVisitGuest,
    visitSpawnToken,
    saveWorld,
    mountProgress,
    gameDay,
    dailyPaintGate,
    coinBanks,
    inkBanks,
    collectHouseCoins,
    collectHouseInk,
    sleepAtHouse,
    pickPaintColor,
    cyclePaintColor,
    activatePatrolRobot,
    togglePatrolRobot,
    patrolUnlocked,
    patrolOn,
    nextRobotCost,
    liveRaidInvite,
    setLiveRaidInvite,
    userId,
    coins,
    inkEnergy,
    chips,
    setCoins,
    setInkEnergy,
    setChips,
    jailStay,
    setJailStay,
    setIsHoldingPrisoner,
  } = useGameState();
  const sceneApi = useRef(null);
  const [selectedTile, setSelectedTile] = useState(null);
  const [makeupOpen, setMakeupOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState('chase');
  const [intruder, setIntruder] = useState(null);
  const [carriedIntruder, setCarriedIntruder] = useState(null);
  const [showJailRansomModal, setShowJailRansomModal] = useState(false);
  const [catchProgress, setCatchProgress] = useState(0);
  const carriedIntruderRef = useRef(null);
  carriedIntruderRef.current = carriedIntruder;
  const intruderRef = useRef(null);
  intruderRef.current = intruder;
  const catchHoldRef = useRef(0);
  const homePatrolChaseRef = useRef(false);
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
  const rebuildKeysRef = useRef(null);
  const sprintMeter = useRef(createSprintMeter());
  const pendingDismount = useRef(null);
  const jailedIntruderRef = useRef(null);
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
  const stationHouse = nearRepaired;
  const nearSleep = nearRepaired?.buildingType === 'SLEEP_HOUSE' ? nearRepaired : null;
  const nearCoin = nearRepaired?.buildingType === 'COIN_GENERATOR' ? nearRepaired : null;
  const nearInk = nearRepaired?.buildingType === 'INK_HOUSE' ? nearRepaired : null;
  const nearCraft = nearRepaired?.buildingType === 'CRAFT_HOUSE' ? nearRepaired : null;
  const nearMakeup = nearRepaired?.buildingType === 'MAKEUP_HOUSE' ? nearRepaired : null;
  const nearJail = nearRepaired?.buildingType === 'JAIL' || nearRepaired?.buildingType === 'BASE_JAIL' ? nearRepaired : null;
  const jailBuilding = buildings?.find((b) => b.buildingType === 'JAIL' || b.buildingType === 'BASE_JAIL');
  const distToJail = jailBuilding ? Math.hypot(walker.column - (jailBuilding.xPos ?? 15), walker.row - (jailBuilding.yPos ?? 15)) : Infinity;
  const isNearJailCell = distToJail <= 3.8 || !!nearJail;
  const distToIntruder = intruder ? Math.hypot(walker.column - intruder.column, walker.row - intruder.row) : Infinity;
  const canCatchIntruder = !carriedIntruder && distToIntruder <= CATCH_RANGE_TILES;

  const finalizeIntruderJail = (target) => {
    if (!target || jailedIntruderRef.current) return;
    const jailPos = {
      column: jailBuilding?.xPos ?? jailBuilding?.column ?? 15,
      row: jailBuilding?.yPos ?? jailBuilding?.row ?? 15,
    };
    const locked = {
      ...target,
      column: jailPos.column,
      row: jailPos.row,
      camoColor: target.camoColor || 'RED',
      characterModel: target.characterModel || 1,
    };
    setIntruder(null);
    setCarriedIntruder(null);
    jailedIntruderRef.current = locked;
    homePatrolChaseRef.current = false;
    sceneApi.current?.setPatrolChase?.(false);
    sceneApi.current?.clearPartnerPose?.();
    sceneApi.current?.setPrisonerPose?.(locked.column, locked.row, {
      camoColor: locked.camoColor,
      characterModel: locked.characterModel,
    });
    soundEngine.playCatchSound();
    showToast(`${target.name || 'Raider'} locked in Base Jail. Ransom is open.`, 'success');
    setShowJailRansomModal(true);
    setIsHoldingPrisoner(true);
    void fetchMyJailStay().then((stay) => { if (stay) setJailStay(stay); });
  };

  const handleCatchIntruder = () => {
    if (!intruder || jailedIntruderRef.current) return;
    const pos = walkerRef.current;
    const raidId = liveRaidInvite?.raidId;
    if (raidId) {
      stompPublish(`/app/live-raid/${raidId}/position`, {
        userId,
        role: 'DEFENDER',
        x: pos.column,
        y: pos.row,
        model: pos.characterModel || 1,
        camo: pos.camoColor || null,
        status: 'CATCH',
        catchProgress: 1,
        outcome: 'CAUGHT_IN_JAIL',
      }).catch(() => {});
    }
  };

  const handleDropIntruderInJail = () => {
    if (!carriedIntruder) return;
    const prisoner = carriedIntruder;
    setCarriedIntruder(null);
    const jailPos = {
      column: jailBuilding?.xPos ?? 15,
      row: jailBuilding?.yPos ?? 15,
    };
    const locked = {
      ...prisoner,
      column: jailPos.column,
      row: jailPos.row,
      camoColor: prisoner.camoColor || 'RED',
      characterModel: prisoner.characterModel || 1,
    };
    jailedIntruderRef.current = locked;
    sceneApi.current?.clearPartnerPose?.();
    sceneApi.current?.setPrisonerPose?.(locked.column, locked.row, {
      camoColor: locked.camoColor,
      characterModel: locked.characterModel,
    });
    soundEngine.playCatchSound();
    showToast('Intruder locked in Base Jail! Intercom open for ransom negotiation.', 'success');
    setShowJailRansomModal(true);
    const raidId = liveRaidInvite?.raidId;
    if (raidId) {
      stompPublish(`/app/live-raid/${raidId}/position`, {
        userId,
        role: 'DEFENDER',
        x: jailPos.column,
        y: jailPos.row,
        outcome: 'CAUGHT_IN_JAIL',
        status: 'JAIL_LOCKED',
      }).catch(() => {});
    }
  };

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
    collectHouseInk,
    sleepAtHouse,
    cyclePaintColor,
    activatePatrolRobot,
    togglePatrolRobot,
    patrolUnlocked,
    patrolOn,
    showToast,
    carriedIntruder,
    canCatchIntruder,
    isNearJailCell,
    handleCatchIntruder,
    handleDropIntruderInJail,
  };

  const nextRuin = isVisitGuest ? null : nextGuideRuin(buildings, GATE_SPAWN_TILE);
  const guideAim = useMemo(() => {
    if (!isVisitGuest && !garageComplete && carriedPart) {
      const spec = cartPartById(carriedPart);
      const pad = garageCenterTile();
      return {
        kind: 'garage',
        label: spec ? `Garage · ${spec.label}` : 'Garage',
        color: '#72B83F',
        column: pad.column,
        row: pad.row,
        footprintW: 4,
        footprintH: 4,
      };
    }
    if (nextRuin) {
      return {
        kind: 'house',
        label: houseLabel(nextRuin.buildingType),
        color: '#F4A261',
        buildingId: nextRuin.id,
        footprintW: nextRuin.footprintWidth || 3,
        footprintH: nextRuin.footprintHeight || 3,
      };
    }
    if (isVisitGuest || garageComplete || !partSpawns.length) return null;
    let best = partSpawns[0];
    let bestD = Infinity;
    partSpawns.forEach((p) => {
      const d = Math.hypot((p.column || 0) - walker.column, (p.row || 0) - walker.row);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    });
    const spec = cartPartById(best.id);
    const color = spec?.kind === 'body' && spec.color ? GAME_COLORS[spec.color] : '#8ECAE6';
    return {
      kind: 'part',
      label: spec?.label || 'Cart part',
      color,
      column: best.column,
      row: best.row,
      footprintW: 1,
      footprintH: 1,
    };
  }, [
    nextRuin,
    isVisitGuest,
    garageComplete,
    carriedPart,
    partSpawns,
    walker.column,
    walker.row,
  ]);
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
    reportVisitPose?.(walker.column, walker.row);
  }, [walker.column, walker.row, reportVisitPose]);

  useEffect(() => {
    if (liveRaidInvite?.raidId || jailedIntruderRef.current) return;
    const other = !visitSession
      ? null
      : visitRole === 'guest'
        ? {
            x: visitSession.hostX,
            y: visitSession.hostY,
            seated: !!visitSession.hostSeated,
            camo: visitSession.hostCamo,
            model: visitSession.hostModel,
          }
        : {
            x: visitSession.guestX,
            y: visitSession.guestY,
            seated: !!visitSession.guestSeated,
            camo: visitSession.guestCamo,
            model: visitSession.guestModel,
          };
    if (!other || other.seated || other.x == null || other.y == null) {
      sceneApi.current?.clearPartnerPose?.();
      return;
    }
    sceneApi.current?.setPartnerPose?.(other.x, other.y, {
      camoColor: other.camo || 'BLUE',
      characterModel: other.model || 1,
    });
  }, [visitSession, visitRole, liveRaidInvite?.raidId]);

  useEffect(() => {
    if (guideStep === GUIDE_STEPS.WELCOME || guideStep === GUIDE_STEPS.REBUILD) return;
    if (carriedPart) return;
    pickUpPartAt(walker.column, walker.row);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walker.column, walker.row, guideStep, carriedPart]);

  useEffect(() => {
    const raidId = liveRaidInvite?.raidId;
    if (!raidId || !userId) {
      if (intruder) setIntruder(null);
      if (carriedIntruder) setCarriedIntruder(null);
      sceneApi.current?.clearPartnerPose?.();
      sceneApi.current?.clearPrisonerPose?.();
      jailedIntruderRef.current = null;
      return undefined;
    }
    let cancelled = false;
    let pubTimer = 0;

    (async () => {
      try {
        await ensureStompConnected();
        if (cancelled) return;
        await stompPublish(`/app/live-raid/${raidId}/join`, {
          userId,
          role: 'DEFENDER',
        });
        await stompSubscribe(`/topic/live-raid/${raidId}/state`, (state) => {
          if (!state || cancelled) return;
          if (state.message === 'CATCH_TOO_FAR') {
            catchHoldRef.current = 0;
            setCatchProgress(0);
            soundEngine.stopRebuildHum();
            showToast('Raider slipped away — get closer', 'warning');
            return;
          }
          const jailedNow =
            state.status === 'JAIL_LOCKED'
            || state.outcome === 'CAUGHT_IN_JAIL'
            || (state.terminal && state.outcome === 'CAUGHT');
          if (jailedNow && !jailedIntruderRef.current && intruderRef.current) {
            finalizeIntruderJail(intruderRef.current);
            return;
          }
          if (state.status === 'CARRIED' && !jailedIntruderRef.current && intruderRef.current) {
            setCarriedIntruder(intruderRef.current);
            setIntruder(null);
            return;
          }
          if (jailedIntruderRef.current) {
            homePatrolChaseRef.current = false;
            sceneApi.current?.setPatrolChase?.(false);
            const locked = jailedIntruderRef.current;
            sceneApi.current?.clearPartnerPose?.();
            sceneApi.current?.setPrisonerPose?.(locked.column, locked.row, {
              camoColor: locked.camoColor,
              characterModel: locked.characterModel,
            });
          } else if (state.attackerX != null && state.attackerY != null) {
            const col = state.attackerX;
            const row = state.attackerY;
            if (carriedIntruderRef.current) {
              return;
            }
            const camo = state.attackerCamo || 'RED';
            const model = state.attackerModel || 1;
            setIntruder({
              id: liveRaidInvite.attackerUserId,
              name: liveRaidInvite.attackerName,
              camoColor: camo,
              characterModel: model,
              column: col,
              row: row,
            });
            sceneApi.current?.setPartnerPose?.(col, row, {
              camoColor: camo,
              characterModel: model,
            });
          }
          if (state.outcome === 'RELEASED') {
            setIntruder(null);
            setCarriedIntruder(null);
            jailedIntruderRef.current = null;
            setShowJailRansomModal(false);
            sceneApi.current?.clearPartnerPose?.();
            sceneApi.current?.clearPrisonerPose?.();
            setLiveRaidInvite(null);
          }
          // Raider escaped or quit — clear the intruder unless they're already jailed.
          if (
            state.terminal &&
            (state.outcome === 'RAID_ENDED' || state.outcome === 'ABORTED' || state.message === 'ATTACKER_LEFT') &&
            !jailedIntruderRef.current
          ) {
            setIntruder(null);
            setCarriedIntruder(null);
            sceneApi.current?.clearPartnerPose?.();
            setLiveRaidInvite(null);
          }
        });
      } catch {
        /* fallback */
      }
    })();

    pubTimer = window.setInterval(() => {
      const pos = walkerRef.current;
      const holdPct = catchHoldRef.current > 0
        ? Math.min(1, catchHoldRef.current / CATCH_HOLD_SECONDS)
        : 0;
      const catching = holdPct > 0 && !carriedIntruderRef.current && !jailedIntruderRef.current;
      stompPublish(`/app/live-raid/${raidId}/position`, {
        userId,
        role: 'DEFENDER',
        x: pos.column,
        y: pos.row,
        model: pos.characterModel || 1,
        camo: pos.camoColor || null,
        status: carriedIntruderRef.current ? 'CARRIED' : (catching ? 'CATCH' : null),
        catchProgress: catching ? holdPct : null,
      }).catch(() => {});
      if (carriedIntruderRef.current) {
        sceneApi.current?.setPartnerPose?.(pos.column, pos.row, {
          camoColor: carriedIntruderRef.current.camoColor || 'RED',
          characterModel: carriedIntruderRef.current.characterModel || 1,
        });
      }
    }, 120);

    return () => {
      cancelled = true;
      window.clearInterval(pubTimer);
      stompUnsubscribe(`/topic/live-raid/${raidId}/state`);
    };
  }, [liveRaidInvite?.raidId, userId, setLiveRaidInvite]);

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
    let lastCatchPct = 0;

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
            lastCompass.onScreen === screen.onScreen &&
            lastCompass.label === screen.label &&
            lastCompass.kind === screen.kind;
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

      // Hold F 3s next to a live raider to catch them — takes priority over other F holds.
      const intr = carriedIntruderRef.current ? null : intruderRef.current;
      const intruderNear =
        !!intr && Math.hypot(pos.column - intr.column, pos.row - intr.row) <= CATCH_RANGE_TILES;
      const catchActive = holdingF && intruderNear;
      if (catchActive) {
        catchHoldRef.current += dt;
        soundEngine.startRebuildHum();
        if (catchHoldRef.current >= CATCH_HOLD_SECONDS) {
          catchHoldRef.current = 0;
          soundEngine.stopRebuildHum();
          rk.handleCatchIntruder?.();
        }
      } else {
        catchHoldRef.current = 0;
      }
      const catchPct = catchActive ? Math.min(1, catchHoldRef.current / CATCH_HOLD_SECONDS) : 0;
      if (Math.abs(catchPct - lastCatchPct) >= 0.03 || (catchPct === 0) !== (lastCatchPct === 0)) {
        lastCatchPct = catchPct;
        setCatchProgress(catchPct);
      }

      const raidIntruder = carriedIntruderRef.current ? null : intruderRef.current;
      if (rk.patrolOn && raidIntruder && !jailedIntruderRef.current) {
        const light = sceneApi.current?.getSearchlightState?.();
        const lighthouseHit = !!(light && isTileInBeam(light, raidIntruder.column, raidIntruder.row));
        const patrolState = sceneApi.current?.getPatrolState?.() || {};
        const robotPos = patrolState.position;
        const robotDist =
          robotPos != null
            ? Math.hypot(raidIntruder.column - robotPos.column, raidIntruder.row - robotPos.row)
            : Infinity;
        const nearRobot = robotDist <= ROBOT_CHASE_PROXIMITY && !patrolState.stunned;
        if (lighthouseHit || nearRobot) homePatrolChaseRef.current = true;
        if (homePatrolChaseRef.current) {
          sceneApi.current?.setPatrolChase?.(true, {
            column: raidIntruder.column,
            row: raidIntruder.row,
          });
        }
      } else if (homePatrolChaseRef.current) {
        homePatrolChaseRef.current = false;
        sceneApi.current?.setPatrolChase?.(false);
      }

      const canMount =
        !catchActive &&
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
        !rk.isVisitGuest &&
        !canMount &&
        !catchActive &&
        holdingF &&
        !!target &&
        rk.guideStep !== GUIDE_STEPS.WELCOME &&
        rk.guideStep !== GUIDE_STEPS.MOVE_TIP;
      const doneId = rk.tickRebuildHold(dt, canHold, target?.id || null);
      if (doneId) {
        soundEngine.stopRebuildHum();
        rk.repairBuilding(doneId);
      } else if (canHold) soundEngine.startRebuildHum();
      else if (!canMount && !catchActive) soundEngine.stopRebuildHum();

      const screen = sceneApi.current?.getGuideScreen?.();
      if (screen) {
        const same =
          lastCompass &&
          Math.abs(lastCompass.nx - screen.nx) < 0.016 &&
          Math.abs(lastCompass.ny - screen.ny) < 0.016 &&
          lastCompass.onScreen === screen.onScreen &&
          lastCompass.label === screen.label &&
          lastCompass.kind === screen.kind;
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
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
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
        if (rk.carriedIntruder) {
          if (rk.isNearJailCell) {
            rk.handleDropIntruderInJail?.();
          } else {
            rk.showToast?.('Carry the intruder to the Base Jail to lock them in!', 'info');
          }
          return;
        }
        const pos = walkerRef.current;
        if (rk.pickUpPartAt(pos.column, pos.row)) return;
        if (rk.carriedPart) {
          rk.dropCarriedPart(pos.column, pos.row);
          return;
        }
        const house = findRepairedNear(rk.buildings, pos.column, pos.row);
        if (!rk.isVisitGuest && house) {
          if (house.buildingType === 'MAKEUP_HOUSE') {
            setMakeupOpen(true);
            return;
          }
          if (house.buildingType === 'SLEEP_HOUSE') {
            rk.sleepAtHouse();
            return;
          }
          if (house.buildingType === 'COIN_GENERATOR') {
            rk.collectHouseCoins(house.id);
            return;
          }
          if (house.buildingType === 'INK_HOUSE') {
            if (rk.collectHouseInk?.(house.id)) return;
            rk.cyclePaintColor();
            return;
          }
          if (house.buildingType === 'CRAFT_HOUSE') {
            if (!rk.patrolUnlocked) {
              rk.activatePatrolRobot();
              return;
            }
            rk.togglePatrolRobot();
            return;
          }
          if (house.buildingType === 'JAIL' || house.buildingType === 'BASE_JAIL') {
            rk.showToast('Base Jail: Holding cell for intruders captured in your fortress', 'info');
            soundEngine.playGateSlamSound?.();
            return;
          }
        }
        if (!rk.isVisitGuest) {
          brushKeysRef.current.setSelectedTool('PAINT');
          brushKeysRef.current.toggleBrush();
        }
      }
      if ((e.key === 'q' || e.key === 'Q') && !e.repeat && !rebuildKeysRef.current?.isVisitGuest) {
        e.preventDefault();
        brushKeysRef.current.cycleBrushSize();
      }
      if ((e.key === 'r' || e.key === 'R') && !e.repeat && !rebuildKeysRef.current?.isVisitGuest) {
        e.preventDefault();
        brushKeysRef.current.toggleEraser();
      }
      if (e.key >= '1' && e.key <= '5' && !e.repeat && !rebuildKeysRef.current?.isVisitGuest) {
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
      if ((e.key === 'm' || e.key === 'M') && !e.repeat && !rebuildKeysRef.current?.isVisitGuest) {
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
    if (isVisitGuest) return;
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
    if (isVisitGuest) {
      showToast('Friendly visit — look only', 'info');
      return;
    }
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
          canCatchIntruder
            ? catchProgress > 0.01
              ? `Catching ${intruder?.name || 'Raider'}… ${Math.round(catchProgress * 100)}%`
              : 'Hold F 3s to catch and send to jail'
            : null,
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
          nearInk && !nearRuin ? 'E collect ink · tap a color' : null,
          nearCraft && !nearRuin
            ? !patrolUnlocked
              ? 'E buy patrol'
              : patrolOn
                ? 'E turn patrol off'
                : 'E turn patrol on'
            : null,
          nearJail && !nearRuin ? 'E Base Jail (Holding Cell)' : null,
          nearMakeup && !nearRuin ? 'E change camo' : null,
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
        patrolPowered={patrolOn}
        selectedBuildingId={selectedBuildingId}
        movingBuildingId={movingBuildingId}
        activeRuinId={guideStep === GUIDE_STEPS.REBUILD ? activeRuinId : null}
        rebuildingId={rebuildingId}
        rebuildProgress={rebuildProgress}
        onTileHover={handleTileHover}
        showSearchlight
        searchlightLevel={searchlightLevel}
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
        guideAim={guideAim}
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
                      ? `${repairedCount}/${STARTER_HOUSE_COUNT}`
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
        aim={guideAim}
        clearLeft={!!peekHouse}
        onDismissWelcome={dismissWelcome}
        onDismissMoveTip={dismissMoveTip}
      />

      <div className="absolute left-3 top-16 z-50 flex w-[220px] max-w-[46vw] flex-col gap-2 pointer-events-none">
        <DailyTasksPanel hidden={guideStep !== GUIDE_STEPS.DONE || isVisitGuest} />
        <HouseStation
          building={peekHouse}
          ruined={!!peekHouse?.ruined}
          gameDay={gameDay}
          sleepWarning={peekHouse?.buildingType === 'SLEEP_HOUSE' ? dailyPaintGate?.warning || '' : ''}
          storedCoins={Math.floor(Number(coinBanks[peekHouse?.id]) || 0)}
          storedInk={Math.floor(Number(inkBanks[peekHouse?.id]) || 0)}
          selectedColor={selectedColor}
          onCollect={() => {
            if (!isVisitGuest) collectHouseCoins(peekHouse?.id);
          }}
          onCollectInk={() => {
            if (!isVisitGuest) collectHouseInk(peekHouse?.id);
          }}
          onPickColor={(key) => {
            if (!isVisitGuest) pickPaintColor(key);
          }}
          onSleep={() => {
            if (!isVisitGuest) sleepAtHouse();
          }}
          onOpenMakeup={() => {
            if (!isVisitGuest) setMakeupOpen(true);
          }}
          patrolOwned={patrolUnlocked}
          patrolOn={patrolOn}
          patrolCost={nextRobotCost}
          canAffordPatrol={coins >= nextRobotCost}
          onActivatePatrol={() => {
            if (!isVisitGuest) activatePatrolRobot();
          }}
          onTogglePatrol={() => {
            if (!isVisitGuest) togglePatrolRobot();
          }}
        />
      </div>
      {canCatchIntruder && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[160] pointer-events-none flex flex-col items-center gap-2 min-w-[260px] max-w-[86vw]">
          <div className="px-4 py-2.5 rounded-2xl bg-black/80 border border-amber-400/70 shadow-[0_0_24px_rgba(245,158,11,0.35)] text-amber-200 text-center">
            <p className="text-xs font-extrabold tracking-wide">
              {catchProgress > 0.01
                ? `Catching ${intruder?.name || 'Raider'}… ${Math.round(catchProgress * 100)}%`
                : 'Hold F 3s to catch and send to jail'}
            </p>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-black/70 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-[width] duration-100"
                style={{ width: `${Math.min(100, catchProgress * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {guideStep !== GUIDE_STEPS.WELCOME && <ActionPrompt lines={actionLines} />}

      <aside className="absolute right-4 top-[4.75rem] z-40 hidden md:flex flex-col items-end gap-2">
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
      <RansomModal
        isOpen={showJailRansomModal}
        isPrisoner={false}
        jailStayId={jailStay?.id || null}
        attackerId={carriedIntruder?.id || intruder?.id || liveRaidInvite?.attackerUserId || null}
        defenderId={userId}
        attackerName={carriedIntruder?.name || intruder?.name || liveRaidInvite?.attackerName || 'Intruder'}
        defenderName="Base Owner (You)"
        playerCoins={coins || 500}
        playerInk={inkEnergy || 100}
        playerChips={chips || 200}
        onRelease={(payment = {}) => {
          const ransomCoins = Number(payment.coins) || 0;
          const ransomInk = Number(payment.ink) || 0;
          const ransomChips = Number(payment.chips) || 0;
          if (ransomCoins > 0) setCoins((c) => c + ransomCoins);
          if (ransomInk > 0) setInkEnergy((i) => i + ransomInk);
          if (ransomChips > 0) setChips((ch) => ch + ransomChips);
          showToast(
            ransomCoins + ransomInk + ransomChips > 0
              ? `Ransom received: +${ransomCoins}c · +${ransomInk} ink · +${ransomChips} pts. Prisoner released.`
              : 'Prisoner released and sent home.',
            'success'
          );
          setShowJailRansomModal(false);
          setIsHoldingPrisoner(false);
          jailedIntruderRef.current = null;
          sceneApi.current?.clearPartnerPose?.();
          sceneApi.current?.clearPrisonerPose?.();
          const raidId = liveRaidInvite?.raidId;
          if (raidId) {
            stompPublish(`/app/live-raid/${raidId}/position`, {
              userId,
              role: 'DEFENDER',
              outcome: 'RELEASED',
              status: 'RELEASED',
            }).catch(() => {});
          }
          setLiveRaidInvite(null);
        }}
        onDecline={() => {
          showToast('Offer declined — intruder stays in your jail.', 'info');
        }}
      />
    </div>
  );
}
