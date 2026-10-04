import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Minus, DoorOpen, Hammer, Bot, Coins, Droplet, Zap, ZapOff } from 'lucide-react';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import SideRaidPanel from '../components/hud/SideRaidPanel.jsx';
import HudBanner from '../components/ui/HudBanner.jsx';
import HudHeader from '../components/ui/HudHeader.jsx';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import GameMap from '../gamemap/GameMap.jsx';
import { useGameState } from '../state/GameStateContext.jsx';
import { soundEngine } from '../soundEngine.js';
import { DetectionSystem } from '../raid/DetectionSystem.js';
import { createAlarmSystem } from '../raid/AlarmSystem.js';
import { PatrolRobotContext, ROBOT_STATES } from '../patrolRobotState.js';
import { generateDefenderBase, tileColorAt } from '../raid/defenderLayouts.js';
import {
  RAID_DURATION_SECONDS,
  DETECTION_STATES,
  RAID_LOOT_FRACTION,
  GATE_X,
  GATE_Y,
  ROBOT_CATCH_DISTANCE,
  ROBOT_CHASE_PROXIMITY,
  ROBOT_HIT_RANGE,
  ROBOT_STUN_SECONDS,
  ROBOT_CATCH_HOLD_SECONDS,
} from '../raid/stealthConstants.js';
import { resolveRaidOutcome, estimateLootPercent } from '../raid/RaidSession.js';
import { tickExtractionChannel, estimateLootAmounts, inExtractionZone } from '../raid/extraction.js';
import { GATE_SPAWN_TILE, SEARCHLIGHT_TILE, WALK_TILE_SECONDS } from '../gamemap/mapConfig.js';
import { collectSolidTiles, isWallBreakSpot } from '../gamemap/occupancy.js';
import { stepDirection, attemptStep, nudgeOffSolid, TURN_RATE } from '../character/gridMover.js';
import { noteKeyDown, noteKeyUp, walkAxes, shiftHeld, bindKeyReleaseGuards } from '../character/walkInput.js';
import { listDecorOccupiedTiles } from '../gamemap/MapDecor.js';
import { GAME_COLORS } from '../colors.js';
import { RAID_TARGETS } from '../data/raidTargets.js';
import { createSprintMeter, SPRINT_SPEED_MULT } from '../character/sprint.js';
import StaminaBar from '../components/hud/StaminaBar.jsx';
import ActionPrompt from '../components/hud/ActionPrompt.jsx';
import { ensureStompConnected, stompPublish, stompSubscribe, stompUnsubscribe } from '../live/stompClient.js';
import { duoMarkCaught } from '../api.js';
import LootFloatFX from '../components/raid/LootFloatFX.jsx';
import RaidTransitionOverlay, { RAID_CINEMATIC_MS } from '../components/raid/RaidTransitionOverlay.jsx';
import { findRepairedNear } from '../gamemap/starterRuins.js';
import RansomModal from '../components/raid/RansomModal.jsx';

const WALL_BREAK_HITS = 4;
const RAID_DECOR_SEED = 41;
/** Advance PatrolRobotContext on a fixed cadence (~session-log rate), not every rAF. */
const ROBOT_TICK_HZ = 8;
/** Duo members each keep half of greed loot on a successful extract. */
const DUO_LOOT_SHARE = 0.5;

/** Map robot SM → HUD ladder labels used by vignettes / SideRaidPanel. */
function hudStateFromRobot(robotState) {
  switch (robotState) {
    case ROBOT_STATES.SUSPICIOUS:
      return DETECTION_STATES.SUSPICIOUS;
    case ROBOT_STATES.ALERT:
    case ROBOT_STATES.SEARCHING:
      return DETECTION_STATES.ALERT;
    case ROBOT_STATES.CHASING:
      return DETECTION_STATES.ALARM;
    default:
      return DETECTION_STATES.NORMAL;
  }
}

function isAtGate(column, row) {
  return column === GATE_SPAWN_TILE.column && row === GATE_SPAWN_TILE.row;
}

/** Split raid target pools onto the defender's coin / ink houses (20% steal cap). */
function initRaidStash(buildings, raidLoot) {
  const coinCap = Math.floor((raidLoot?.coins || 200) * RAID_LOOT_FRACTION);
  const inkCap = Math.floor((raidLoot?.ink || 40) * RAID_LOOT_FRACTION);
  const coinHouses = (buildings || []).filter((b) => b.buildingType === 'COIN_GENERATOR');
  const inkHouses = (buildings || []).filter((b) => b.buildingType === 'INK_HOUSE');
  const coins = {};
  const ink = {};
  if (coinHouses.length) {
    const each = Math.floor(coinCap / coinHouses.length);
    let left = coinCap;
    coinHouses.forEach((b, i) => {
      const n = i === coinHouses.length - 1 ? left : each;
      coins[b.id] = Math.max(0, n);
      left -= n;
    });
  }
  if (inkHouses.length) {
    const each = Math.floor(inkCap / inkHouses.length);
    let left = inkCap;
    inkHouses.forEach((b, i) => {
      const n = i === inkHouses.length - 1 ? left : each;
      ink[b.id] = Math.max(0, n);
      left -= n;
    });
  }
  return { coins, ink };
}

export default function StealthRaidView() {
  const {
    raidTargetId,
    camoColor,
    raidSession,
    raidLoot,
    characterModel,
    showToast,
    setCoins,
    setInkEnergy,
    transitionTo,
    recordRaidResult,
    userId,
    duoParty,
  } = useGameState();

  const duoPartyId = raidSession?.duoPartyId || duoParty?.partyId || null;
  const isDuoHost = duoPartyId && Number(duoParty?.hostId) === Number(userId);
  const duoAlarmRef = useRef(false);

  const lockedCamo = raidSession?.camoColor || camoColor;
  const sceneApi = useRef(null);
  const targetMeta = useMemo(() => {
    if (raidLoot && (raidLoot.name || raidLoot.ownerId)) return raidLoot;
    return RAID_TARGETS.find((t) => t.id === raidTargetId) || RAID_TARGETS[0];
  }, [raidTargetId, raidLoot]);
  const defenderBase = useMemo(
    () =>
      generateDefenderBase(raidTargetId || 34, {
        buildingCount: Math.max(4, targetMeta?.buildings || 4),
        patrol: !!(targetMeta?.patrol || targetMeta?.hasPatrol),
      }),
    [raidTargetId, targetMeta]
  );
  const paintedTiles = defenderBase.tiles;
  const raidBuildings = defenderBase.buildings;
  const raidDefenses = defenderBase.defenses;
  const patrolArmed =
    (raidDefenses || []).some((d) => (d.type || d.defenseType) === 'PATROL_ROBOT')
    || !!targetMeta?.patrol
    || !!targetMeta?.hasPatrol;
  const patrolArmedRef = useRef(patrolArmed);
  patrolArmedRef.current = patrolArmed;

  const [stash, setStash] = useState(() => initRaidStash(raidBuildings, raidLoot || targetMeta));
  const stashRef = useRef(stash);
  stashRef.current = stash;
  const lootedHousesRef = useRef(new Set());
  const creditHouseLootRef = useRef(() => false);
  const [stolen, setStolen] = useState({ coins: 0, ink: 0 });
  const stolenRef = useRef(stolen);
  stolenRef.current = stolen;
  const [lootFloats, setLootFloats] = useState([]);
  const stealRef = useRef(null);
  const detection = useRef(new DetectionSystem());
  /** Escalation SM shared with backend PatrolRobotContext — drives HUD label + chase. */
  const robotContext = useRef(new PatrolRobotContext());
  const lastRobotStateRef = useRef(ROBOT_STATES.PATROL);
  const robotTickAccumRef = useRef(0);
  /** Once the beam hits the player even once, chase stays on for the rest of the raid. */
  const chaseLatchedRef = useRef(false);
  /** Live defender is driving the robot — skip local AI chase. */
  const liveDefenderRef = useRef(false);
  const liveCaughtRef = useRef(false);
  const sessionLog = useRef([]);
  const wallHitsRef = useRef(0);
  const gateLockedRef = useRef(false);
  const channelProgressRef = useRef(0);
  const extractionArmedRef = useRef(false); // must leave the gate zone once before channeling
  const prevPosRef = useRef({
    column: GATE_SPAWN_TILE.column,
    row: Math.max(0, GATE_SPAWN_TILE.row - 3),
  });
  const raidStartedRef = useRef(Date.now());
  const keys = useRef(new Set());
  const actionRef = useRef(null);
  const hitRobotRef = useRef(null);
  const robotStunnedUntilRef = useRef(0);
  const [robotStunCountdown, setRobotStunCountdown] = useState(0);
  const [nearRobotDist, setNearRobotDist] = useState(Infinity);
  const sprintMeter = useRef(createSprintMeter());
  const [stamina, setStamina] = useState({ stamina: 1, sprinting: false, exhausted: false });

  const [isLooting, setIsLooting] = useState(false);
  const isLootingRef = useRef(false);
  isLootingRef.current = isLooting;
  const [lootProgress, setLootProgress] = useState(0);
  const [lootingTarget, setLootingTarget] = useState(null);
  const lootTimerRef = useRef(null);

  const [showRansomModal, setShowRansomModal] = useState(false);
  const [imprisoned, setImprisoned] = useState(false);
  const imprisonedRef = useRef(false);
  imprisonedRef.current = imprisoned;
  const ransomPaidRef = useRef(false);

  useEffect(() => {
    return () => {
      if (lootTimerRef.current) clearInterval(lootTimerRef.current);
    };
  }, []);

  const [attacker, setAttacker] = useState(() => {
    const baseCol = GATE_SPAWN_TILE.column;
    const baseRow = Math.max(0, GATE_SPAWN_TILE.row - 3);
    // Guest spawns one tile to the side so duo partners do not stack.
    const guestOffset = duoPartyId && !isDuoHost ? 1 : 0;
    return {
      column: baseCol + guestOffset,
      row: baseRow,
      camoColor: lockedCamo,
      characterModel: characterModel || 1,
    };
  });
  const attackerRef = useRef(attacker);
  attackerRef.current = attacker;
  attackerRef.current.camoColor = lockedCamo;
  attackerRef.current.characterModel = characterModel || 1;

  const [hud, setHud] = useState({
    meter: 0,
    state: DETECTION_STATES.NORMAL,
    colorMatch: false,
    inBeam: false,
    remaining: RAID_DURATION_SECONDS,
    alarm: false,
    shimmer: false,
    exposed: false,
    outcome: null,
    wallHits: 0,
    gateLocked: false,
    breaking: false,
    robotEngaged: false,
    robotHitting: false,
    breakFlash: false,
    statePulse: 0,
    robotState: ROBOT_STATES.PATROL,
    channelProgress: 0,
    channelPercent: 0,
    channeling: false,
    channelInterrupt: false,
    greedPercent: 0,
    greedCoins: 0,
    greedInk: 0,
    elapsed: 0,
  });
  const hudRef = useRef(hud);
  hudRef.current = hud;
  const lastDetectState = useRef(DETECTION_STATES.NORMAL);
  const openSolids = useMemo(
    () =>
      collectSolidTiles({
        buildings: raidBuildings,
        decorTiles: listDecorOccupiedTiles(RAID_DECOR_SEED, raidBuildings),
        includeMakeupHouse: false,
        gateLocked: false,
      }),
    [raidBuildings]
  );
  const lockedSolids = useMemo(
    () =>
      collectSolidTiles({
        buildings: raidBuildings,
        decorTiles: listDecorOccupiedTiles(RAID_DECOR_SEED, raidBuildings),
        includeMakeupHouse: false,
        gateLocked: true,
      }),
    [raidBuildings]
  );
  const solidRef = useRef(openSolids);
  const solidsPairRef = useRef({ open: openSolids, locked: lockedSolids });
  solidsPairRef.current = { open: openSolids, locked: lockedSolids };
  solidRef.current = hud.gateLocked || gateLockedRef.current ? lockedSolids : openSolids;

  const alarmSystem = useRef(null);
  if (!alarmSystem.current) {
    alarmSystem.current = createAlarmSystem({
      onAlarmTriggered() {
        gateLockedRef.current = true;
        sceneApi.current?.lockGate?.();
        if (patrolArmedRef.current) {
          sceneApi.current?.setPatrolChase?.(true, {
            column: attackerRef.current.column,
            row: attackerRef.current.row,
          });
        }
      },
    });
  }

  // Toast helper from context is NOT referentially stable — never put it in this
  // effect's deps or the siren toast restarts the raid loop (chase unlatch + greed → 0).
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  useEffect(() => {
    soundEngine.playAmbient('raid');
  }, []);

  useEffect(() => {
    const started = Date.now();
    raidStartedRef.current = started;
    channelProgressRef.current = 0;
    extractionArmedRef.current = false;
    robotTickAccumRef.current = 0;
    robotContext.current = new PatrolRobotContext();
    lastRobotStateRef.current = ROBOT_STATES.PATROL;
    chaseLatchedRef.current = false;
    gateLockedRef.current = false;
    detection.current.reset();
    lastDetectState.current = DETECTION_STATES.NORMAL;
    prevPosRef.current = { ...attackerRef.current };
    sceneApi.current?.setExtractionMarker?.({ column: GATE_X, row: GATE_Y, active: true, intensity: 0.35 });
    let raf = 0;
    let last = performance.now();
    let tickN = 0;
    let moveCooldown = 0;
    let bumpCooldown = 0;
    let lastSprintMul = 1;
    let lastHud = { stamina: 1, sprinting: false, exhausted: false };

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      moveCooldown = Math.max(0, moveCooldown - dt);
      bumpCooldown = Math.max(0, bumpCooldown - dt);

      const canMove = !hudRef.current.outcome && !hudRef.current.breaking && !isLootingRef.current && !imprisonedRef.current;
      const { forward, turn } = canMove ? walkAxes(keys.current) : { forward: 0, turn: 0 };

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

      // Mouse locked → A/D strafe (mouse steers); otherwise A/D turns smoothly every frame
      const mouseLocked = sceneApi.current?.isMouseLocked?.() ?? false;
      const strafe = mouseLocked ? -turn : 0;
      if (canMove && !mouseLocked && turn !== 0) sceneApi.current?.addLookYaw?.(turn * TURN_RATE * dt);

      if (canMove && moveCooldown <= 0 && (forward !== 0 || strafe !== 0)) {
        const pair = solidsPairRef.current;
        solidRef.current = gateLockedRef.current || hudRef.current.gateLocked ? pair.locked : pair.open;
        const yaw = sceneApi.current?.getFacingYaw?.() ?? Math.PI;
        const dir = stepDirection(yaw, forward, strafe);
        const step = attemptStep(attackerRef.current, dir, solidRef.current);
        if (step.ok) {
          moveCooldown = WALK_TILE_SECONDS * (step.diagonal ? Math.SQRT2 : 1) / sprintMul;
          soundEngine.playFootstepSound(sp.sprinting);
          const next = { ...attackerRef.current, column: step.column, row: step.row };
          attackerRef.current = next;
          setAttacker(next);
        } else if (step.blocked && bumpCooldown <= 0) {
          bumpCooldown = 0.2;
          sceneApi.current?.playBump?.();
        }
      } else if (canMove && moveCooldown <= 0) {
        const pair = solidsPairRef.current;
        solidRef.current = gateLockedRef.current || hudRef.current.gateLocked ? pair.locked : pair.open;
        const escape = nudgeOffSolid(attackerRef.current, solidRef.current);
        if (escape?.ok) {
          moveCooldown = WALK_TILE_SECONDS * (escape.diagonal ? Math.SQRT2 : 1);
          const next = { ...attackerRef.current, column: escape.column, row: escape.row };
          attackerRef.current = next;
          setAttacker(next);
        }
      }

      const pos = attackerRef.current;
      const elapsed = (Date.now() - started) / 1000;
      sceneApi.current?.setRaidElapsed?.(elapsed);
      const light = sceneApi.current?.getSearchlightState?.();
      const tileColor = tileColorAt(paintedTiles, pos.column, pos.row);
      const result = detection.current.tick({
        light: light || {
          x: SEARCHLIGHT_TILE.column,
          y: SEARCHLIGHT_TILE.row,
          beamAngleDeg: 0,
          coneAngleDeg: 48,
          coneRangeTiles: 4.6,
        },
        player: { x: pos.column, y: pos.row },
        attackerColor: lockedCamo,
        tileColor,
        dt,
        elapsedSeconds: elapsed,
      });

      // If plot color matches character color, the light will NOT find the player!
      const lightSpotted = !!result.beam?.canSee && !result.colorMatch;
      const firstLightHit = lightSpotted && !chaseLatchedRef.current;
      if (lightSpotted || result.alarmLatched) {
        chaseLatchedRef.current = true;
      }

      const liveDrivesRobot = liveDefenderRef.current && !!duoPartyId;
      if (patrolArmedRef.current && chaseLatchedRef.current && !liveDrivesRobot) {
        robotContext.current.setState(ROBOT_STATES.CHASING);
        robotContext.current.lastSeenPlayerX = pos.column;
        robotContext.current.lastSeenPlayerY = pos.row;
        lastRobotStateRef.current = ROBOT_STATES.CHASING;
        sceneApi.current?.setPatrolChase?.(true, {
          column: pos.column,
          row: pos.row,
        });
      }

      if (firstLightHit || (result.justAlarmed && !result.colorMatch)) {
        duoAlarmRef.current = true;
        alarmSystem.current.trigger({
          playerX: pos.column,
          playerY: pos.row,
          reason: result.reason || 'IN_BEAM',
          camoColor: lockedCamo,
          tileColor,
        });
        soundEngine.playAlarmSound();
        soundEngine.playGateSlamSound();
        sceneApi.current?.setAlarm?.(true);
        sceneApi.current?.lockGate?.();
        sceneApi.current?.flashSearchlightDetect?.(1.2);
        showToastRef.current('Siren · break wall or hold gate', 'error');
      } else if (lightSpotted) {
        sceneApi.current?.flashSearchlightDetect?.(0.55);
      }

      // Advance stun timer on robot context
      robotContext.current.tickStun(dt);

      const patrolState = sceneApi.current?.getPatrolState?.() || {};
      const robotPos = patrolState.position || null;
      const robotDist =
        robotPos != null
          ? Math.hypot(pos.column - robotPos.column, pos.row - robotPos.row)
          : Infinity;
      setNearRobotDist(robotDist);

      const isRobotStunned =
        !!patrolState.stunned ||
        robotContext.current.state === ROBOT_STATES.DISABLED ||
        Date.now() < (robotStunnedUntilRef.current || 0);

      // Robot proximity detection: fixes on the intruder within a 4-block circular radius
      const inRobotProximity = patrolArmedRef.current && robotDist <= ROBOT_CHASE_PROXIMITY && !isRobotStunned;
      if (inRobotProximity && !liveDrivesRobot && !chaseLatchedRef.current) {
        robotContext.current.setState(ROBOT_STATES.CHASING);
        robotContext.current.lastSeenPlayerX = pos.column;
        robotContext.current.lastSeenPlayerY = pos.row;
        lastRobotStateRef.current = ROBOT_STATES.CHASING;
        sceneApi.current?.setPatrolChase?.(true, {
          column: pos.column,
          row: pos.row,
        });
      }

      // Skip robot SM while chase is latched or robot is stunned offline
      robotTickAccumRef.current += dt;
      const robotTickDue = robotTickAccumRef.current >= 1 / ROBOT_TICK_HZ;
      if (robotTickDue) {
        robotTickAccumRef.current = 0;
        if (!chaseLatchedRef.current && !isRobotStunned) {
          robotContext.current.processDetection({
            reason: inRobotProximity ? 'CORE_ZONE' : (result.robotReason || 'OUTSIDE_RANGE'),
            playerX: pos.column,
            playerY: pos.row,
          });
        }
      }

      const robotState = isRobotStunned ? ROBOT_STATES.DISABLED : robotContext.current.state;
      const robotHudState = !patrolArmedRef.current
        ? (chaseLatchedRef.current || result.alarmLatched ? DETECTION_STATES.ALARM : DETECTION_STATES.NORMAL)
        : isRobotStunned
        ? DETECTION_STATES.NORMAL
        : chaseLatchedRef.current
        ? DETECTION_STATES.ALARM
        : hudStateFromRobot(robotState);

      if (patrolArmedRef.current && !isRobotStunned && !chaseLatchedRef.current && !liveDrivesRobot && raidDefenses.length > 0) {
        const lastSeen = {
          column: robotContext.current.lastSeenPlayerX ?? pos.column,
          row: robotContext.current.lastSeenPlayerY ?? pos.row,
        };
        if (robotState === ROBOT_STATES.SEARCHING) {
          sceneApi.current?.setPatrolMode?.('searching', lastSeen);
        } else if (robotState === ROBOT_STATES.ALERT) {
          sceneApi.current?.setPatrolMode?.('alert', lastSeen);
        } else if (robotState === ROBOT_STATES.SUSPICIOUS) {
          sceneApi.current?.setPatrolMode?.('suspicious', lastSeen);
        } else if (robotState === ROBOT_STATES.CHASING) {
          sceneApi.current?.setPatrolChase?.(true, lastSeen);
        }
      }
      const robotStateChanged = robotState !== lastRobotStateRef.current;
      if (robotStateChanged) lastRobotStateRef.current = robotState;

      // Stunned robot cannot catch while it sleeps.
      // Must be on top of the player (catch radius) — distant chase never auto-CAUGHT.
      // Live takeover: server is source of truth for CAUGHT (liveCaughtRef).
      const robotTagged =
        patrolArmedRef.current &&
        !isRobotStunned &&
        !liveDefenderRef.current &&
        !!patrolState.hitting &&
        robotDist <= ROBOT_CATCH_DISTANCE + 0.2;
      const robotCaught =
        patrolArmedRef.current &&
        !isRobotStunned &&
        !hudRef.current.outcome &&
        (liveCaughtRef.current ||
          (!liveDefenderRef.current &&
            (!!patrolState.caught || (!!patrolState.tagged && robotDist <= ROBOT_CATCH_DISTANCE + 0.2))));
      const robotChasing =
        patrolArmedRef.current &&
        !isRobotStunned &&
        (chaseLatchedRef.current ||
          liveDefenderRef.current ||
          robotState === ROBOT_STATES.CHASING ||
          !!patrolState.chasing);

      // Arm extraction only after the attacker has left the gate zone once
      // (prevents spawn/nudge onto the corridor from auto-completing a Silent extract).
      if (!inExtractionZone(pos.column, pos.row)) {
        extractionArmedRef.current = true;
      }

      const channel = extractionArmedRef.current
        ? tickExtractionChannel({
          channelProgress: channelProgressRef.current,
          x: pos.column,
          y: pos.row,
          prevX: prevPosRef.current.column,
          prevY: prevPosRef.current.row,
          dt,
          robotX: robotPos?.column,
          robotY: robotPos?.row,
          beamHit:
            !chaseLatchedRef.current &&
            !result.alarmLatched &&
            !!(result.exposed && result.beam?.canSee),
          robotChasing,
        })
        : {
          channelProgress: 0,
          channeling: false,
          complete: false,
          interrupted: false,
          inZone: inExtractionZone(pos.column, pos.row),
          percent: 0,
        };
      channelProgressRef.current = channel.channelProgress;
      prevPosRef.current = { column: pos.column, row: pos.row };

      sceneApi.current?.setExtractionMarker?.({
        column: GATE_X,
        row: GATE_Y,
        active: !hudRef.current.outcome,
        intensity: channel.channeling ? 0.55 + channel.percent / 200 : inExtractionZone(pos.column, pos.row) ? 0.45 : 0.3,
        channeling: channel.channeling,
        interrupted: channel.interrupted,
      });

      const remaining = Math.max(0, RAID_DURATION_SECONDS - elapsed);
      const poolCoins = Number(raidLoot?.coins ?? targetMeta?.coins ?? 200);
      const poolInk = Number(raidLoot?.ink ?? targetMeta?.ink ?? 40);
      const greedPct = estimateLootPercent(elapsed);
      // Spotted ≠ loot lost — preview ESCAPED payout so greed stays visible after the siren.
      const lootPreviewOutcome =
        chaseLatchedRef.current || result.alarmLatched || gateLockedRef.current ? 'ESCAPED' : 'SILENT';
      const greedPreviewRaw = estimateLootAmounts(elapsed, { coins: poolCoins, ink: poolInk }, lootPreviewOutcome);
      const duoShare = duoPartyId ? DUO_LOOT_SHARE : 1;
      const greedPreview = {
        ...greedPreviewRaw,
        coins: Math.round(greedPreviewRaw.coins * duoShare),
        ink: Math.round(greedPreviewRaw.ink * duoShare),
      };

      tickN += 1;
      if (tickN % 8 === 0) {
        sessionLog.current.push({
          tick: tickN,
          xPos: pos.column,
          yPos: pos.row,
          beamAngleDeg: light?.beamAngleDeg ?? 0,
        });
      }

      const stateChanged = robotStateChanged;
      // lastDetectState tracks robot HUD ladder for vignette pulses
      if (stateChanged) lastDetectState.current = robotHudState;

      if (robotCaught && !hudRef.current.outcome && !imprisonedRef.current) {
        const jailBuilding = raidBuildings?.find((b) => b.buildingType === 'JAIL');
        const hasJail = !!jailBuilding || targetMeta?.jail || targetMeta?.hasJail || targetMeta?.isRealPlayer || raidTargetId === 105;
        if (hasJail && !ransomPaidRef.current) {
          imprisonedRef.current = true;
          setImprisoned(true);
          setShowRansomModal(true);
          const jailPos = jailBuilding
            ? { column: jailBuilding.xPos ?? jailBuilding.column ?? 10, row: jailBuilding.yPos ?? jailBuilding.row ?? 10 }
            : { column: 10, row: 10 };
          setAttacker((prev) => ({ ...prev, ...jailPos }));
          attackerRef.current = { ...attackerRef.current, ...jailPos };
          if (duoPartyId) duoMarkCaught(duoPartyId, userId).catch(() => { });
          showToastRef.current('Captured! Locked in Base Jail — Negotiate ransom or voice intercom', 'warning');
          soundEngine.playWallHitSound?.();
        } else {
          if (duoPartyId) duoMarkCaught(duoPartyId, userId).catch(() => { });
          setStolen((prev) => ({ coins: prev.coins, ink: prev.ink }));
          hudRef.current = { ...hudRef.current, outcome: 'CAUGHT' };
          setHud((prev) => ({
            ...prev,
            outcome: 'CAUGHT',
            remaining: 0,
            channeling: false,
            greedPercent: 0,
            greedCoins: 0,
            greedInk: 0,
            elapsed,
            alarm: true,
            robotHitting: true,
          }));
          showToastRef.current('Caught by patrol', 'error');
        }
      } else if (channel.complete && !hudRef.current.outcome) {
        const outcome = resolveRaidOutcome({
          alarmTriggered: result.alarmLatched || gateLockedRef.current || chaseLatchedRef.current,
          caught: false,
          extractionOk: true,
        });
        const greedRaw = estimateLootAmounts(elapsed, { coins: poolCoins, ink: poolInk }, outcome);
        const greed = {
          ...greedRaw,
          coins: Math.round(greedRaw.coins * duoShare),
          ink: Math.round(greedRaw.ink * duoShare),
        };
        setStolen((prev) => ({ coins: prev.coins + greed.coins, ink: prev.ink + greed.ink }));
        hudRef.current = { ...hudRef.current, outcome };
        setHud((prev) => ({
          ...prev,
          outcome,
          remaining: 0,
          channeling: false,
          channelPercent: 100,
          channelProgress: channel.channelProgress,
          greedPercent: greed.percent,
          greedCoins: greed.coins,
          greedInk: greed.ink,
          elapsed,
        }));
        showToastRef.current(outcome === 'ESCAPED' ? 'Escaped' : 'Silent extract', 'success');
      } else if (remaining <= 0 && !hudRef.current.outcome) {
        // Survived the full 150s — lock greed loot (spotted or not). Patrol never zeros this.
        const outcome =
          chaseLatchedRef.current || result.alarmLatched || gateLockedRef.current ? 'ESCAPED' : 'SILENT';
        const greedRaw = estimateLootAmounts(elapsed, { coins: poolCoins, ink: poolInk }, outcome);
        const greed = {
          ...greedRaw,
          coins: Math.round(greedRaw.coins * duoShare),
          ink: Math.round(greedRaw.ink * duoShare),
        };
        setStolen((prev) => ({ coins: prev.coins + greed.coins, ink: prev.ink + greed.ink }));
        hudRef.current = { ...hudRef.current, outcome };
        setHud((prev) => ({
          ...prev,
          outcome,
          remaining: 0,
          channeling: false,
          greedPercent: greed.percent,
          greedCoins: greed.coins,
          greedInk: greed.ink,
          elapsed,
          alarm: chaseLatchedRef.current || result.alarmLatched || prev.alarm,
        }));
        showToastRef.current(outcome === 'ESCAPED' ? 'Time up · escaped with loot' : 'Time up · loot secured', 'success');
      }

      setHud((prev) => {
        if (prev.outcome) return prev;
        return {
          meter: result.meter,
          state: robotHudState,
          robotState,
          colorMatch: result.colorMatch,
          inBeam: result.beam.canSee,
          remaining,
          alarm: chaseLatchedRef.current || result.alarmLatched || (patrolArmedRef.current && robotState === ROBOT_STATES.CHASING),
          shimmer: result.beam.canSee && result.colorMatch,
          exposed: result.exposed,
          outcome: null,
          wallHits: wallHitsRef.current,
          gateLocked: gateLockedRef.current || result.alarmLatched || chaseLatchedRef.current,
          breaking: prev.breaking,
          robotEngaged: robotChasing,
          robotHitting: robotTagged || !!patrolState.hitting,
          robotCatchProgress: Number(patrolState.catchProgress) || 0,
          breakFlash: prev.breakFlash,
          statePulse: stateChanged ? prev.statePulse + 1 : prev.statePulse,
          channelProgress: channel.channelProgress,
          channelPercent: channel.percent,
          channeling: channel.channeling,
          channelInterrupt: channel.interrupted,
          greedPercent: greedPct,
          greedCoins: greedPreview.coins,
          greedInk: greedPreview.ink,
          elapsed,
        };
      });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      sceneApi.current?.setExtractionMarker?.({ active: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedCamo, raidDefenses.length, duoPartyId, userId]);

  // Optional live-defender takeover over STOMP (AI resumes if they disconnect).
  useEffect(() => {
    const raidId = raidSession?.raidId;
    if (!raidId || !userId) return undefined;
    let cancelled = false;
    let pubTimer = 0;

    (async () => {
      try {
        await ensureStompConnected();
        if (cancelled) return;
        await stompSubscribe(`/topic/live-raid/${raidId}/state`, (state) => {
          if (!state || cancelled) return;
          if (state.joined && !liveDefenderRef.current) {
            liveDefenderRef.current = true;
            chaseLatchedRef.current = true;
            showToastRef.current('A live defender has joined!', 'info');
          }
          if (state.message === 'DEFENDER_LEFT' || state.outcome === 'DEFENDER_LEFT') {
            liveDefenderRef.current = false;
            sceneApi.current?.clearLivePatrol?.();
            if (!duoPartyId) sceneApi.current?.clearPartnerPose?.();
            showToastRef.current('Defender left — patrol AI resumed', 'info');
          }
          if (liveDefenderRef.current && state.robotX != null && state.robotY != null) {
            // The base owner chases in person: show their character (partner mesh is
            // reserved for the duo partner, so duo raids keep the robot stand-in).
            if (duoPartyId) {
              if (state.status !== 'CARRIED') {
                sceneApi.current?.setLivePatrolPosition?.(state.robotX, state.robotY);
              }
            } else {
              sceneApi.current?.setPartnerPose?.(state.robotX, state.robotY, {
                camoColor: state.defenderCamo || 'BLUE',
                characterModel: state.defenderModel || 1,
              });
            }
          }
          const jailedNow =
            state.status === 'JAIL_LOCKED'
            || state.outcome === 'CAUGHT_IN_JAIL'
            || (state.terminal && state.outcome === 'CAUGHT');
          if (jailedNow && !liveCaughtRef.current) {
            liveCaughtRef.current = true;
            imprisonedRef.current = true;
            setImprisoned(true);
            setShowRansomModal(true);
            const jailBuilding = raidBuildings?.find((b) => b.buildingType === 'JAIL');
            const jailPos = jailBuilding
              ? { column: jailBuilding.xPos ?? jailBuilding.column ?? 10, row: jailBuilding.yPos ?? jailBuilding.row ?? 10 }
              : { column: 10, row: 10 };
            setAttacker((prev) => ({ ...prev, ...jailPos }));
            attackerRef.current = { ...attackerRef.current, ...jailPos };
            showToastRef.current?.('Caught by the base owner and locked in jail. Ransom is open.', 'warning');
            soundEngine.playGateSlamSound?.();
          } else if (state.status === 'CARRIED' && !liveCaughtRef.current) {
            if (!imprisonedRef.current) {
              showToastRef.current?.('Caught by Base Owner! You have been picked up — being carried to the Base Jail...', 'warning');
            }
            imprisonedRef.current = true;
            if (state.robotX != null && state.robotY != null) {
              setAttacker({ column: state.robotX, row: state.robotY });
              attackerRef.current = { column: state.robotX, row: state.robotY };
            }
          }
          if (state.outcome === 'RELEASED') {
            setShowRansomModal(false);
            imprisonedRef.current = false;
            setImprisoned(false);
            showToastRef.current?.('Base owner released you from jail! Returning to your base...', 'success');
            window.setTimeout(() => {
              transitionTo('BASE_BUILDER');
            }, 1200);
          }
        });
        pubTimer = window.setInterval(() => {
          const pos = attackerRef.current;
          stompPublish(`/app/live-raid/${raidId}/position`, {
            userId,
            role: 'ATTACKER',
            x: pos.column,
            y: pos.row,
            model: pos.characterModel || null,
            camo: pos.camoColor || null,
          }).catch(() => { });
        }, 120);
      } catch {
        /* backend / ws down — stay on async AI path */
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(pubTimer);
      stompUnsubscribe(`/topic/live-raid/${raidId}/state`);
      liveDefenderRef.current = false;
      sceneApi.current?.clearLivePatrol?.();
      if (!duoPartyId) sceneApi.current?.clearPartnerPose?.();
    };
  }, [raidSession?.raidId, userId, duoPartyId]);

  // Duo co-op: publish pose; partner mesh + shared alarm come from duoParty (context STOMP).
  useEffect(() => {
    const partyId = duoPartyId;
    if (!partyId || !userId) return undefined;
    let cancelled = false;
    let pubTimer = 0;

    (async () => {
      try {
        await ensureStompConnected();
        if (cancelled) return;
        pubTimer = window.setInterval(() => {
          const pos = attackerRef.current;
          stompPublish(`/app/duo/${partyId}/position`, {
            userId,
            x: pos.column,
            y: pos.row,
            alarm: duoAlarmRef.current || chaseLatchedRef.current || gateLockedRef.current,
          }).catch(() => { });
        }, 120);
      } catch {
        /* offline */
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(pubTimer);
      sceneApi.current?.clearPartnerPose?.();
      sceneApi.current?.clearPrisonerPose?.();
    };
  }, [duoPartyId, userId]);

  // Mirror partner tile + shared alarm from party state broadcasts.
  useEffect(() => {
    if (!duoPartyId || !duoParty || duoParty.status !== 'IN_RAID') return;
    const iAmHost = Number(duoParty.hostId) === Number(userId);
    const px = iAmHost ? duoParty.guestX : duoParty.hostX;
    const py = iAmHost ? duoParty.guestY : duoParty.hostY;
    const partnerCaught = iAmHost ? !!duoParty.guestCaught : !!duoParty.hostCaught;
    const camoColor = iAmHost ? (duoParty.guestCamo || 'GREEN') : (duoParty.hostCamo || 'PURPLE');
    const characterModel = iAmHost ? (duoParty.guestModel || 1) : (duoParty.hostModel || 1);
    if (partnerCaught) {
      sceneApi.current?.clearPartnerPose?.();
      if (px != null && py != null) {
        sceneApi.current?.setPrisonerPose?.(px, py, { camoColor, characterModel });
      }
    } else if (px != null && py != null) {
      sceneApi.current?.clearPrisonerPose?.();
      sceneApi.current?.setPartnerPose?.(px, py, { camoColor, characterModel });
    }
    if (duoParty.alarmLatched && !chaseLatchedRef.current) {
      duoAlarmRef.current = true;
      chaseLatchedRef.current = true;
      gateLockedRef.current = true;
      alarmSystem.current?.trigger?.({
        playerX: attackerRef.current.column,
        playerY: attackerRef.current.row,
        reason: 'DUO_PARTNER',
        camoColor: lockedCamo,
        tileColor: null,
      });
      soundEngine.playAlarmSound();
      soundEngine.playGateSlamSound();
      sceneApi.current?.setAlarm?.(true);
      sceneApi.current?.lockGate?.();
      setHud((prev) => ({
        ...prev,
        alarm: true,
        gateLocked: true,
        state: DETECTION_STATES.ALARM,
      }));
      showToastRef.current('Partner spotted — siren!', 'error');
    }
  }, [
    duoPartyId,
    duoParty?.hostX,
    duoParty?.hostY,
    duoParty?.guestX,
    duoParty?.guestY,
    duoParty?.alarmLatched,
    duoParty?.hostCaught,
    duoParty?.guestCaught,
    duoParty?.guestCamo,
    duoParty?.hostCamo,
    duoParty?.guestModel,
    duoParty?.hostModel,
    duoParty?.status,
    duoParty?.hostId,
    userId,
    lockedCamo,
  ]);

  const partnerCaughtToastRef = useRef(false);
  useEffect(() => {
    if (!duoPartyId || !duoParty) return;
    const iAmHost = Number(duoParty.hostId) === Number(userId);
    const partnerCaught = iAmHost ? duoParty.guestCaught : duoParty.hostCaught;
    if (partnerCaught && !partnerCaughtToastRef.current) {
      partnerCaughtToastRef.current = true;
      showToast('Partner caught — keep raiding', 'info');
    }
  }, [duoPartyId, duoParty?.hostCaught, duoParty?.guestCaught, duoParty?.hostId, userId, showToast]);

  // Duo Signal Listener for shared Robot Stun events
  useEffect(() => {
    if (!duoPartyId) return undefined;
    let cancelled = false;
    const onSignal = (msg) => {
      if (!msg || Number(msg.fromUserId) === Number(userId)) return;
      if (msg.type === 'ROBOT_HIT') {
        const secs = Number(msg.payload?.stunSeconds) || ROBOT_STUN_SECONDS;
        soundEngine.playWallHitSound();
        sceneApi.current?.stunPatrolRobot?.(secs);
        robotContext.current?.stun?.(secs);
        robotStunnedUntilRef.current = Date.now() + secs * 1000;
        setRobotStunCountdown(secs);
        showToastRef.current?.(`Teammate disabled the robot for ${secs}s`, 'success');
      }
      if (msg.type === 'LOOT') {
        const kind = msg.payload?.kind === 'ink' ? 'ink' : 'coin';
        const houseId = msg.payload?.houseId;
        const share = Math.max(0, Math.floor(Number(msg.payload?.partnerShare) || 0));
        creditHouseLootRef.current?.(houseId, kind, share, 'partner');
      }
      if (msg.type === 'WALL') {
        const column = Number(msg.payload?.column);
        const row = Number(msg.payload?.row);
        const hits = Number(msg.payload?.hits) || 1;
        const final = !!msg.payload?.final;
        if (!Number.isFinite(column) || !Number.isFinite(row)) return;
        wallHitsRef.current = Math.max(wallHitsRef.current, hits);
        sceneApi.current?.playWallBreak?.(column, row, { hits, final, gate: isAtGate(column, row) });
        soundEngine.playWallBreakSound(final);
        setHud((prev) => ({ ...prev, wallHits: wallHitsRef.current, breakFlash: true }));
        if (final) showToastRef.current?.('Partner opened a wall', 'success');
      }
    };
    (async () => {
      try {
        await ensureStompConnected();
        if (cancelled) return;
        await stompSubscribe(`/topic/duo/${duoPartyId}/signal`, onSignal);
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
      stompUnsubscribe(`/topic/duo/${duoPartyId}/signal`, onSignal);
    };
  }, [duoPartyId, userId]);

  // Smooth countdown ticker for the robot stun badge
  useEffect(() => {
    if (robotStunCountdown <= 0) return undefined;
    const interval = window.setInterval(() => {
      const left = Math.max(0, (robotStunnedUntilRef.current - Date.now()) / 1000);
      setRobotStunCountdown(left);
      if (left <= 0) {
        showToastRef.current?.('⚠️ Patrol robot rebooted! Watch out!', 'warning');
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [robotStunCountdown > 0]);

  useEffect(() => {
    const down = (e) => {
      noteKeyDown(keys.current, e);
      if ((e.code === 'KeyF' || e.code === 'Space') && !e.repeat) {
        const patrolState = sceneApi.current?.getPatrolState?.() || {};
        const robotPos = patrolState.position || null;
        const robotDist =
          robotPos != null
            ? Math.hypot(attackerRef.current.column - robotPos.column, attackerRef.current.row - robotPos.row)
            : Infinity;
        const isRobotStunned =
          !!patrolState.stunned ||
          robotContext.current.state === ROBOT_STATES.DISABLED ||
          Date.now() < (robotStunnedUntilRef.current || 0);
        if (patrolArmedRef.current && robotDist <= ROBOT_HIT_RANGE && !isRobotStunned) {
          e.preventDefault();
          hitRobotRef.current?.();
          return;
        }
      }
      if (e.code === 'KeyF' && !e.repeat) {
        e.preventDefault();
        actionRef.current?.();
      }
      if (e.code === 'KeyE' && !e.repeat) {
        e.preventDefault();
        stealRef.current?.();
      }
    };
    const up = (e) => noteKeyUp(keys.current, e);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    const unguard = bindKeyReleaseGuards(keys);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      unguard();
    };
  }, []);

  const settled = useRef(false);
  const [leaveFx, setLeaveFx] = useState(null); // null | 'exit' | 'caught'

  const spawnLootFloat = (kind, amount) => {
    const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setLootFloats((prev) => [...prev, { id, kind, amount }]);
  };

  creditHouseLootRef.current = (houseId, kind, credit, source) => {
    if (houseId == null || hudRef.current.outcome) return false;
    const key = `${kind}:${houseId}`;
    if (lootedHousesRef.current.has(key)) return false;
    lootedHousesRef.current.add(key);
    const gain = Math.max(0, Math.floor(Number(credit) || 0));
    if (kind === 'ink') {
      setStash((prev) => ({ ...prev, ink: { ...prev.ink, [houseId]: 0 } }));
      if (gain > 0) {
        setStolen((prev) => ({ ...prev, ink: prev.ink + gain }));
        setInkEnergy((v) => v + gain);
        spawnLootFloat('ink', gain);
      }
    } else {
      setStash((prev) => ({ ...prev, coins: { ...prev.coins, [houseId]: 0 } }));
      if (gain > 0) {
        setStolen((prev) => ({ ...prev, coins: prev.coins + gain }));
        setCoins((v) => v + gain);
        spawnLootFloat('coin', gain);
      }
    }
    sceneApi.current?.pulseBuilding?.(houseId);
    soundEngine.playSuccessSound();
    const label = kind === 'ink' ? 'ink' : 'coins';
    showToast(source === 'partner' ? `Partner looted · you got ${gain} ${label}` : `Stole ${gain} ${label}`, 'success');
    return true;
  };

  /** Walk up to a coin/ink house and steal with a float animation. */
  const stealFromHouse = (house) => {
    if (!house || hudRef.current.outcome) return false;
    const id = house.id;
    const isInk = house.buildingType === 'INK_HOUSE';
    const isCoin = house.buildingType === 'COIN_GENERATOR';
    if (!isInk && !isCoin) return false;
    const kind = isInk ? 'ink' : 'coin';
    const n = Math.floor(Number(isInk ? stashRef.current.ink[id] : stashRef.current.coins[id]) || 0);
    if (n <= 0) {
      showToast(isInk ? 'Empty ink' : 'Empty vault', 'info');
      return false;
    }
    const mine = duoPartyId ? Math.ceil(n / 2) : n;
    const partnerShare = duoPartyId ? n - mine : 0;
    const ok = creditHouseLootRef.current(id, kind, mine, 'self');
    if (ok && duoPartyId) {
      stompPublish(`/app/duo/${duoPartyId}/signal`, {
        fromUserId: userId,
        type: 'LOOT',
        payload: { houseId: id, kind, amount: n, partnerShare },
      }).catch(() => {});
    }
    return ok;
  };

  /** Start channeling loot from a house with 3D ground spinning animation. */
  const startLootChannel = (house) => {
    if (!house || hudRef.current.outcome || isLootingRef.current || imprisonedRef.current) return;
    const id = house.id;
    const isCoin = house.buildingType === 'COIN_GENERATOR';
    const amount = isCoin ? Number(stashRef.current.coins[id] || 0) : Number(stashRef.current.ink[id] || 0);
    if (amount <= 0) {
      showToast(isCoin ? 'Empty vault' : 'Empty ink', 'info');
      return;
    }

    setIsLooting(true);
    setLootingTarget(house);
    setLootProgress(0);
    soundEngine.playFootstepSound?.(false);

    const startTime = Date.now();
    const duration = 1100;
    if (lootTimerRef.current) clearInterval(lootTimerRef.current);
    lootTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setLootProgress(progress);
      if (progress >= 100) {
        clearInterval(lootTimerRef.current);
        lootTimerRef.current = null;
        setIsLooting(false);
        setLootingTarget(null);
        stealFromHouse(house);
      }
    }, 40);
  };

  const handleRansomReleased = (paidCoins) => {
    ransomPaidRef.current = true;
    imprisonedRef.current = false;
    setImprisoned(false);
    setShowRansomModal(false);
    if (paidCoins > 0) {
      setCoins((c) => Math.max(0, c - paidCoins));
    }
    showToast(`Ransom settled (${paidCoins} coins). Base owner released you! Returning to your base...`, 'success');
    window.setTimeout(() => {
      transitionTo('BASE_BUILDER');
    }, 1200);
  };

  const handleRansomDeclined = () => {
    setShowRansomModal(false);
    imprisonedRef.current = false;
    setImprisoned(false);
    showToast('Ransom negotiation ended. Released and expelled back to your home base.', 'info');
    window.setTimeout(() => {
      transitionTo('BASE_BUILDER');
    }, 1200);
  };

  /** End the run and show the results card. */
  const endRaid = (forcedOutcome) => {
    if (hudRef.current.outcome || settled.current) return;
    if (document.pointerLockElement) document.exitPointerLock?.();
    const outcome = forcedOutcome || 'INCOMPLETE';
    // Tell the live session the run is over so the base owner's screen clears the raider.
    const liveRaidId = raidSession?.raidId;
    if (liveRaidId && !imprisonedRef.current && !liveCaughtRef.current) {
      const pos = attackerRef.current;
      stompPublish(`/app/live-raid/${liveRaidId}/position`, {
        userId,
        role: 'ATTACKER',
        x: pos.column,
        y: pos.row,
        outcome: 'RAID_ENDED',
      }).catch(() => { });
    }
    const elapsed = (Date.now() - raidStartedRef.current) / 1000;
    const poolCoins = Number(raidLoot?.coins ?? targetMeta?.coins ?? 200);
    const poolInk = Number(raidLoot?.ink ?? targetMeta?.ink ?? 40);
    const greed = estimateLootAmounts(elapsed, { coins: poolCoins, ink: poolInk }, outcome);
    const share = duoPartyId ? DUO_LOOT_SHARE : 1;
    const greedCoins = Math.round(greed.coins * share);
    const greedInk = Math.round(greed.ink * share);
    if (outcome === 'CAUGHT' && duoPartyId) {
      duoMarkCaught(duoPartyId, userId).catch(() => { });
    }
    setStolen((prev) => ({
      coins: prev.coins + (outcome === 'CAUGHT' || outcome === 'INCOMPLETE' ? 0 : greedCoins),
      ink: prev.ink + (outcome === 'CAUGHT' || outcome === 'INCOMPLETE' ? 0 : greedInk),
    }));
    setHud((prev) => ({
      ...prev,
      outcome,
      remaining: 0,
      breaking: false,
      channeling: false,
      greedCoins,
      greedInk,
    }));
    showToast(
      outcome === 'CAUGHT'
        ? 'Caught'
        : outcome === 'INCOMPLETE'
          ? 'Raid incomplete'
          : outcome === 'ESCAPED'
            ? duoPartyId
              ? 'Escaped (half loot)'
              : 'Escaped'
            : duoPartyId
              ? 'Silent (half loot)'
              : 'Silent',
      outcome === 'CAUGHT' || outcome === 'INCOMPLETE' ? 'error' : 'success'
    );
  };

  const finishRaid = () => {
    if (settled.current) return;
    const { outcome } = hudRef.current;
    if (!outcome) return;
    settled.current = true;
    if (document.pointerLockElement) document.exitPointerLock?.();
    try {
      recordRaidResult(outcome);
      if (outcome === 'SILENT' || outcome === 'ESCAPED') {
        soundEngine.playRaidExitSound();
        sceneApi.current?.playBump?.();
      } else if (outcome === 'CAUGHT') {
        soundEngine.playRaidCaughtSound?.();
      }
    } catch {
      /* loot sound must not trap the player on the result card */
    }
    transitionTo('BASE_BUILDER', {
      loadingTitle: 'Base',
      loadingSubtitle: '',
      loadingMs: 300,
    });
  };

  const climbGate = () => {
    if (hudRef.current.outcome) return;
    if (!inExtractionZone(attackerRef.current.column, attackerRef.current.row)) {
      showToast('Reach the south gate', 'info');
      return;
    }
    if (hudRef.current.gateLocked || hudRef.current.alarm) {
      showToast('Gate locked — break a wall', 'error');
      return;
    }
    showToast('Hold still to extract', 'info');
  };

  const hitWall = () => {
    if (hudRef.current.outcome) return;
    if (hudRef.current.breaking) return;
    if (!isWallBreakSpot(attackerRef.current.column, attackerRef.current.row)) {
      showToast('At a wall', 'info');
      return;
    }
    if (!hudRef.current.alarm && !hudRef.current.gateLocked) {
      showToast('F · gate or wall', 'info');
      return;
    }

    const { column, row } = attackerRef.current;
    wallHitsRef.current = Math.min(WALL_BREAK_HITS, wallHitsRef.current + 1);
    const hits = wallHitsRef.current;
    const final = hits >= WALL_BREAK_HITS;

    setHud((prev) => ({
      ...prev,
      breaking: true,
      wallHits: hits,
      breakFlash: true,
    }));

    sceneApi.current?.playWallBreak?.(column, row, { hits, final, gate: isAtGate(column, row) });
    soundEngine.playWallBreakSound(final);
    if (duoPartyId) {
      stompPublish(`/app/duo/${duoPartyId}/signal`, {
        fromUserId: userId,
        type: 'WALL',
        payload: { column, row, hits, final },
      }).catch(() => {});
    }
    if (final) soundEngine.playSuccessSound();

    window.setTimeout(() => {
      if (final) {
        showToast('Open', 'success');
        const elapsed = (Date.now() - raidStartedRef.current) / 1000;
        const poolCoins = Number(raidLoot?.coins ?? targetMeta?.coins ?? 200);
        const poolInk = Number(raidLoot?.ink ?? targetMeta?.ink ?? 40);
        const greed = estimateLootAmounts(elapsed, { coins: poolCoins, ink: poolInk }, 'ESCAPED');
        const share = duoPartyId ? DUO_LOOT_SHARE : 1;
        const greedCoins = Math.round(greed.coins * share);
        const greedInk = Math.round(greed.ink * share);
        setStolen((prev) => ({ coins: prev.coins + greedCoins, ink: prev.ink + greedInk }));
        setHud((prev) => ({
          ...prev,
          outcome: 'ESCAPED',
          remaining: 0,
          breaking: false,
          breakFlash: false,
          greedCoins,
          greedInk,
          greedPercent: greed.percent,
          elapsed,
        }));
      } else {
        showToast(`${hits}/${WALL_BREAK_HITS}`, 'info');
        setHud((prev) => ({ ...prev, breaking: false, breakFlash: false }));
      }
    }, final ? 900 : 420);
  };

  const hitRobot = () => {
    if (hudRef.current.outcome || !patrolArmedRef.current) return;
    const patrolState = sceneApi.current?.getPatrolState?.() || {};
    const robotPos = patrolState.position || null;
    const robotDist =
      robotPos != null
        ? Math.hypot(attackerRef.current.column - robotPos.column, attackerRef.current.row - robotPos.row)
        : Infinity;
    if (robotDist > ROBOT_HIT_RANGE + 0.25) {
      showToast('Too far to kick', 'info');
      return;
    }
    const isRobotStunned =
      !!patrolState.stunned ||
      robotContext.current.state === ROBOT_STATES.DISABLED ||
      Date.now() < (robotStunnedUntilRef.current || 0);
    if (isRobotStunned) {
      showToast('Robot already disabled', 'info');
      return;
    }

    soundEngine.playWallHitSound();
    sceneApi.current?.playKick?.();
    sceneApi.current?.stunPatrolRobot?.(ROBOT_STUN_SECONDS);
    robotContext.current?.stun?.(ROBOT_STUN_SECONDS);
    robotStunnedUntilRef.current = Date.now() + ROBOT_STUN_SECONDS * 1000;
    setRobotStunCountdown(ROBOT_STUN_SECONDS);
    showToast(`Kick landed — robot asleep ${ROBOT_STUN_SECONDS}s`, 'success');

    if (duoPartyId) {
      stompPublish(`/app/duo/${duoPartyId}/signal`, {
        fromUserId: userId,
        type: 'ROBOT_HIT',
        payload: { stunSeconds: ROBOT_STUN_SECONDS },
      }).catch(() => {});
    }
  };
  hitRobotRef.current = hitRobot;

  const tryAction = () => {
    if (hudRef.current.outcome) return;
    const { column, row } = attackerRef.current;

    // Melee range attack on patrol robot
    const patrolState = sceneApi.current?.getPatrolState?.() || {};
    const robotPos = patrolState.position || null;
    const robotDist =
      robotPos != null
        ? Math.hypot(column - robotPos.column, row - robotPos.row)
        : Infinity;
    const isRobotStunned =
      !!patrolState.stunned ||
      robotContext.current.state === ROBOT_STATES.DISABLED ||
      Date.now() < (robotStunnedUntilRef.current || 0);

    if (patrolArmedRef.current && robotDist <= ROBOT_HIT_RANGE && !isRobotStunned) {
      hitRobot();
      return;
    }

    const house = findRepairedNear(raidBuildings, column, row);
    if (
      house &&
      (house.buildingType === 'COIN_GENERATOR' || house.buildingType === 'INK_HOUSE')
    ) {
      startLootChannel(house);
      return;
    }
    if (isAtGate(column, row) && !hudRef.current.gateLocked && !hudRef.current.alarm) {
      climbGate();
      return;
    }
    if (isWallBreakSpot(column, row) && (hudRef.current.alarm || hudRef.current.gateLocked)) {
      hitWall();
      return;
    }
    if (inExtractionZone(column, row)) {
      showToast(hudRef.current.alarm ? 'Break wall to escape' : 'Hold still to extract', 'info');
      return;
    }
    showToast('E · steal · hold gate to extract', 'info');
  };
  actionRef.current = tryAction;
  stealRef.current = () => {
    if (hudRef.current.outcome || isLootingRef.current) return;
    const house = findRepairedNear(raidBuildings, attackerRef.current.column, attackerRef.current.row);
    if (house?.buildingType === 'COIN_GENERATOR' || house?.buildingType === 'INK_HOUSE') {
      startLootChannel(house);
    } else {
      showToast('Stand by coin or ink house', 'info');
    }
  };

  const atGate = inExtractionZone(attacker.column, attacker.row);
  const atWall = isWallBreakSpot(attacker.column, attacker.row);
  const canClimb = atGate && !hud.gateLocked && !hud.alarm && !hud.outcome;
  const canBreak = atWall && (hud.alarm || hud.gateLocked) && !hud.outcome;
  const nearLootHouse = !hud.outcome
    ? findRepairedNear(raidBuildings, attacker.column, attacker.row)
    : null;
  const nearCoin =
    nearLootHouse?.buildingType === 'COIN_GENERATOR' ? nearLootHouse : null;
  const nearInk = nearLootHouse?.buildingType === 'INK_HOUSE' ? nearLootHouse : null;
  const coinLeft = nearCoin ? Math.floor(Number(stash.coins[nearCoin.id]) || 0) : 0;
  const inkLeft = nearInk ? Math.floor(Number(stash.ink[nearInk.id]) || 0) : 0;

  const stateTone =
    hud.state === DETECTION_STATES.ALARM
      ? 'text-clay-danger clay-alarm'
      : hud.state === DETECTION_STATES.ALERT
        ? 'text-clay-danger'
        : hud.state === DETECTION_STATES.SUSPICIOUS
          ? 'text-clay-accent'
          : 'text-clay-accent';

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#141414]">
      <GameMap
        grayscale
        cameraMode="chase"
        apiRef={sceneApi}
        paintedTiles={paintedTiles}
        buildings={raidBuildings}
        defenses={raidDefenses}
        showSearchlight
        searchlightLevel={targetMeta?.level || 1}
        showMakeupHouse
        attacker={attacker}
        looting={isLooting}
      />

      {leaveFx && (
        <RaidTransitionOverlay
          mode={leaveFx}
          title={leaveFx === 'caught' ? 'Caught' : 'Extracted'}
          subtitle={
            leaveFx === 'caught' ? 'Cooldown applied' : 'Returning to base'
          }
        />
      )}

      <HudHeader
        left={<HudBanner title="Raid" subtitle={lockedCamo} />}
        right={
          <>
            <NavigationTabs />
            <TopResourceBar />
          </>
        }
      />

      <div className="absolute top-[4.75rem] left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <ClayPanel className={`h-11 px-3.5 rounded-2xl flex items-center gap-2.5 ${stateTone}`}>
          {patrolArmed && (
            <Bot size={13} className={hud.robotEngaged ? 'text-clay-danger' : 'text-clay-muted'} />
          )}
          <span className="text-[11px] font-semibold whitespace-nowrap">
            {hud.alarm && hud.robotEngaged
              ? 'Chase'
              : hud.alarm
                ? 'Break wall'
                : patrolArmed
                  ? (hud.robotState || hud.state)
                  : (hud.state || 'Quiet')}{' '}
            · {Math.ceil(hud.remaining)}s
          </span>
          <div className="w-16 h-1.5 rounded-full clay-inset overflow-hidden">
            <div
              className={`h-full rounded-full ${hud.exposed ? 'bg-clay-danger' : hud.shimmer ? 'bg-clay-success' : 'bg-clay-accent'}`}
              style={{ width: `${hud.meter}%` }}
            />
          </div>
          <span className="flex items-center gap-1 text-[10px] text-clay-yellow whitespace-nowrap">
            <Coins size={11} /> {hud.greedCoins}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-clay-success whitespace-nowrap">
            <Droplet size={11} /> {hud.greedInk}
          </span>
          {hud.inBeam && (
            <span className={`text-[10px] ${hud.colorMatch ? 'text-clay-success' : 'text-clay-danger'}`}>
              {hud.colorMatch ? 'Hidden' : 'Exposed'}
            </span>
          )}
        </ClayPanel>
      </div>

      <AnimatePresence>
        {hud.shimmer && !hud.alarm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.18 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 z-20 pointer-events-none"
            style={{ boxShadow: `inset 0 0 56px ${GAME_COLORS[lockedCamo] || '#fff'}` }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hud.exposed && !hud.alarm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.14 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 z-20 pointer-events-none bg-clay-danger/15"
          />
        )}
      </AnimatePresence>

      {/* Detection ladder vignette: NORMAL → SUSPICIOUS → ALERT → ALARM */}
      <AnimatePresence mode="wait">
        {hud.state !== DETECTION_STATES.NORMAL && (
          <motion.div
            key={`detect-${hud.state}-${hud.statePulse}`}
            initial={{ opacity: 0 }}
            animate={{
              opacity:
                hud.state === DETECTION_STATES.ALARM
                  ? [0.22, 0.38, 0.22]
                  : hud.state === DETECTION_STATES.ALERT
                    ? [0.14, 0.26, 0.14]
                    : [0.08, 0.16, 0.08],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, repeat: hud.state === DETECTION_STATES.ALARM ? Infinity : 1 }}
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              background:
                hud.state === DETECTION_STATES.ALARM
                  ? 'radial-gradient(ellipse at center, transparent 35%, rgba(230,57,70,0.55) 100%)'
                  : hud.state === DETECTION_STATES.ALERT
                    ? 'radial-gradient(ellipse at center, transparent 42%, rgba(231,111,81,0.45) 100%)'
                    : 'radial-gradient(ellipse at center, transparent 48%, rgba(244,162,97,0.35) 100%)',
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hud.state !== DETECTION_STATES.NORMAL && (
          <motion.div
            key={`flash-${hud.statePulse}`}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: [0.4, 0.15, 0] }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0 z-25 pointer-events-none"
            style={{
              background:
                hud.state === DETECTION_STATES.ALARM
                  ? 'radial-gradient(ellipse at center, rgba(230,57,70,0.42) 0%, transparent 70%)'
                  : hud.state === DETECTION_STATES.ALERT
                    ? 'radial-gradient(ellipse at center, rgba(231,111,81,0.28) 0%, transparent 68%)'
                    : 'radial-gradient(ellipse at center, rgba(244,162,97,0.2) 0%, transparent 65%)',
              boxShadow:
                hud.state === DETECTION_STATES.ALARM
                  ? 'inset 0 0 80px rgba(230,57,70,0.35)'
                  : 'inset 0 0 60px rgba(244,162,97,0.18)',
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hud.channelInterrupt && (
          <motion.div
            key="channel-interrupt"
            initial={{ opacity: 0.45 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 z-30 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 85%, rgba(230,57,70,0.35), transparent 55%)',
            }}
          />
        )}
      </AnimatePresence>

      {!hud.outcome && (
        <div className="absolute right-4 bottom-20 z-40 pointer-events-none flex flex-col gap-2">
          <ClayPanel depth="deep" className="px-3 py-2 rounded-2xl min-w-[140px]">
            <p className="text-[10px] uppercase tracking-wider text-clay-muted mb-1">Greed</p>
            <div className="h-1.5 rounded-full clay-inset overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full bg-clay-accent origin-left transition-[width] duration-300"
                style={{ width: `${Math.min(100, (hud.greedPercent / 0.45) * 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-clay-yellow">
                <Coins size={11} /> {hud.greedCoins}
              </span>
              <span className="flex items-center gap-1 text-clay-success">
                <Droplet size={11} /> {hud.greedInk}
              </span>
            </div>
            <p className="text-[9px] text-clay-muted mt-1">Stays after siren</p>
          </ClayPanel>
        </div>
      )}

      <AnimatePresence>
        {hud.channeling && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <ClayPanel className="px-4 py-2.5 rounded-2xl flex flex-col items-center gap-1.5 min-w-[160px]">
              <p className="text-[11px] font-heading font-semibold text-clay-text">
                Extracting… {hud.channelPercent}%
              </p>
              <div className="w-36 h-1.5 rounded-full clay-inset overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-clay-success origin-left"
                  animate={{ width: `${hud.channelPercent}%` }}
                  transition={{ duration: 0.12 }}
                />
              </div>
            </ClayPanel>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hud.breakFlash && (
          <motion.div
            key={`break-${hud.wallHits}`}
            initial={{ opacity: 0.32 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="absolute inset-0 z-30 pointer-events-none"
            style={{
              background:
                hud.wallHits >= WALL_BREAK_HITS
                  ? 'radial-gradient(circle at center, rgba(244,162,97,0.28), transparent 55%)'
                  : 'radial-gradient(circle at center, rgba(255,255,255,0.16), transparent 50%)',
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hud.robotHitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.16 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-25 pointer-events-none bg-clay-danger/20"
          />
        )}
      </AnimatePresence>

      {!hud.outcome && (
        <StaminaBar
          stamina={stamina.stamina}
          sprinting={stamina.sprinting}
          exhausted={stamina.exhausted}
          className="absolute left-4 bottom-4 z-40"
        />
      )}

      {!hud.outcome && (
        <ClayPanel
          depth="deep"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 h-11 px-2.5 rounded-2xl flex items-center gap-2 pointer-events-auto"
        >
          {(hud.alarm || hud.gateLocked) && (
            <div className="w-16 h-1.5 rounded-full clay-inset overflow-hidden flex gap-0.5 p-px">
              {Array.from({ length: WALL_BREAK_HITS }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-sm ${i < hud.wallHits ? 'bg-clay-accent' : 'bg-transparent'}`}
                />
              ))}
            </div>
          )}
          <ClayButton
            variant={canClimb || hud.channeling ? 'success' : 'ghost'}
            disabled={!canClimb && !hud.channeling}
            onClick={climbGate}
            className="h-8 px-3 rounded-lg text-[11px] flex items-center gap-1"
          >
            <DoorOpen size={12} /> {hud.channeling ? `Extract ${hud.channelPercent}%` : 'Hold gate'}
          </ClayButton>
          <ClayButton
            variant={canBreak ? 'danger' : 'ghost'}
            disabled={!canBreak}
            onClick={hitWall}
            className="h-8 px-3 rounded-lg text-[11px] flex items-center gap-1"
          >
            <Hammer size={12} /> Wall
          </ClayButton>
        </ClayPanel>
      )}

      <AnimatePresence>
        {hud.outcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="absolute inset-0 z-[70] flex items-center justify-center bg-[#0d1b1e]/70 pointer-events-auto"
          >
            <ClayPanel depth="deep" className="p-5 rounded-3xl w-[300px] max-w-[88vw] flex flex-col gap-3 text-center">
              <h2 className="font-heading font-semibold text-sm text-clay-text">
                {hud.outcome === 'SILENT'
                  ? 'Silent'
                  : hud.outcome === 'ESCAPED'
                    ? 'Escaped'
                    : hud.outcome === 'INCOMPLETE'
                      ? 'Incomplete'
                      : 'Caught'}
              </h2>
              <div className="clay-inset rounded-2xl px-3 py-3 flex items-center justify-center gap-4">
                <span className="flex items-center gap-1.5 text-clay-yellow">
                  <Coins size={14} />
                  <strong className="font-heading text-sm">
                    +{hud.outcome === 'CAUGHT' || hud.outcome === 'INCOMPLETE' ? stolen.coins : (hud.greedCoins ?? stolen.coins)}
                  </strong>
                </span>
                <span className="flex items-center gap-1.5 text-clay-success">
                  <Droplet size={14} />
                  <strong className="font-heading text-sm">
                    +{hud.outcome === 'CAUGHT' || hud.outcome === 'INCOMPLETE' ? stolen.ink : (hud.greedInk ?? stolen.ink)}
                  </strong>
                </span>
              </div>
              <p className="text-[11px] text-clay-muted">
                {hud.outcome === 'CAUGHT'
                  ? stolen.coins + stolen.ink > 0
                    ? 'Caught — only house steals kept'
                    : 'Caught — no loot locked in'
                  : hud.outcome === 'INCOMPLETE'
                    ? 'No loot locked in'
                    : 'Greed loot secured'}
              </p>
              <ClayButton variant="success" onClick={finishRaid} className="w-full py-2 rounded-xl text-xs">
                Return to base
              </ClayButton>
            </ClayPanel>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute right-4 top-[4.75rem] z-40 flex flex-col gap-1.5 pointer-events-auto">
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

      {!hud.outcome && (nearCoin || nearInk) && (
        <div className="absolute left-4 top-[4.75rem] z-40 pointer-events-auto max-w-[220px]">
          <ClayPanel depth="deep" className="px-3 py-2.5 rounded-2xl flex flex-col gap-2">
            <p className="text-[11px] font-heading font-semibold text-clay-text">
              {nearCoin ? 'Enemy Coin Vault' : 'Enemy Ink House'}
            </p>
            <p className="text-[10px] text-clay-muted">
              {nearCoin ? `${coinLeft} coins stored` : `${inkLeft} ink stored`}
            </p>
            <ClayButton
              variant={nearCoin ? 'primary' : 'success'}
              magnetic
              disabled={(nearCoin ? coinLeft <= 0 : inkLeft <= 0) || isLooting}
              onClick={() => startLootChannel(nearCoin || nearInk)}
              className="h-9 rounded-xl text-[11px] flex items-center justify-center gap-1.5"
            >
              {nearCoin ? <Coins size={13} /> : <Droplet size={13} />}
              {isLooting ? `Looting (${lootProgress}%)` : nearCoin ? `Loot ${coinLeft}c` : `Sip ${inkLeft} ink`}
            </ClayButton>
          </ClayPanel>
        </div>
      )}

      {!hud.outcome && (
        <div className="fixed top-20 right-16 z-[160] flex flex-col items-end gap-2 pointer-events-none">
          {patrolArmed && hud.robotHitting && hud.robotCatchProgress > 0 && robotStunCountdown <= 0 && (
            <div className="pointer-events-none px-4 py-2 rounded-2xl bg-red-950/90 border border-red-400/60 min-w-[210px]">
              <p className="text-[10px] font-bold text-red-200">Robot catching… hold still or hit it</p>
              <div className="mt-1 w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded-full"
                  style={{ width: `${Math.min(100, (hud.robotCatchProgress / ROBOT_CATCH_HOLD_SECONDS) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-red-100/80 tabular-nums mt-1">
                {Math.min(ROBOT_CATCH_HOLD_SECONDS, hud.robotCatchProgress).toFixed(1)} / {ROBOT_CATCH_HOLD_SECONDS}s
              </p>
            </div>
          )}
          {patrolArmed && nearRobotDist <= ROBOT_HIT_RANGE + 0.25 && robotStunCountdown <= 0 && (
            <button
              onClick={hitRobot}
              className="pointer-events-auto px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold text-xs shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:brightness-110 flex items-center gap-2 animate-bounce transition-all active:scale-95"
            >
              <Zap size={15} className="fill-black" />
              <span>[F / SPACE] KICK ROBOT ({ROBOT_STUN_SECONDS}s sleep)</span>
            </button>
          )}

          {robotStunCountdown > 0 && (
            <div className="pointer-events-auto px-4 py-2 rounded-2xl bg-cyan-950/90 border border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.4)] backdrop-blur-md flex flex-col gap-1.5 min-w-[210px]">
              <div className="flex items-center justify-between gap-3 text-cyan-300 text-xs font-mono font-bold">
                <div className="flex items-center gap-1.5">
                  <ZapOff size={14} className="text-cyan-400" />
                  <span>ROBOT ASLEEP</span>
                </div>
                <span className="text-white text-sm tabular-nums">
                  {robotStunCountdown.toFixed(1)}s
                </span>
              </div>
              <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-cyan-500/30">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all duration-100 ease-linear rounded-full"
                  style={{ width: `${Math.min(100, (robotStunCountdown / ROBOT_STUN_SECONDS) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-cyan-200/70 font-sans">
                Safe to loot for {ROBOT_STUN_SECONDS}s
              </p>
            </div>
          )}
        </div>
      )}

      {!hud.outcome && (
        <ActionPrompt
          lines={[
            patrolArmed && nearRobotDist <= ROBOT_HIT_RANGE && robotStunCountdown <= 0 ? `F / Space · KICK ROBOT (${ROBOT_STUN_SECONDS}s sleep)` : null,
            robotStunCountdown > 0 ? `⚡ Robot Offline: ${robotStunCountdown.toFixed(1)}s (Safe to loot)` : null,
            nearCoin && coinLeft > 0 ? 'E · steal coins' : null,
            nearInk && inkLeft > 0 ? 'E · steal ink' : null,
            nearCoin && coinLeft <= 0 ? 'Vault empty' : null,
            nearInk && inkLeft <= 0 ? 'Ink empty' : null,
          ]}
        />
      )}

      <LootFloatFX
        items={lootFloats}
        onDone={(id) => setLootFloats((prev) => prev.filter((f) => f.id !== id))}
      />

      <SideRaidPanel
        lockedCamo={lockedCamo}
        remaining={hud.remaining}
        isAlarmTriggered={hud.alarm}
        sessionLog={sessionLog}
        paintedTiles={paintedTiles}
        searchlightLevel={targetMeta?.level || 1}
        outcome={hud.outcome}
        wallHits={hud.wallHits}
        elapsedSeconds={hud.elapsed}
      />

      {isLooting && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-3xl bg-black/85 backdrop-blur-md border border-amber-400/50 shadow-[0_0_35px_rgba(245,158,11,0.5)] text-amber-300">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="#222" strokeWidth="5" fill="none" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="#f59e0b"
                  strokeWidth="5"
                  strokeDasharray={163}
                  strokeDashoffset={163 - (163 * lootProgress) / 100}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <span className="absolute font-mono text-sm font-bold text-amber-200">{lootProgress}%</span>
            </div>
            <span className="text-xs font-bold tracking-wider uppercase text-amber-300">
              Looting Vault...
            </span>
          </div>
        </div>
      )}

      <RansomModal
        isOpen={showRansomModal}
        isPrisoner={true}
        attackerId={userId}
        defenderId={targetMeta?.ownerId || raidTargetId || 105}
        attackerName={`Player ${String(userId).padStart(5, '0')}`}
        defenderName={targetMeta?.name || 'Base Warden'}
        playerCoins={1000}
        onRelease={handleRansomReleased}
        onDecline={handleRansomDeclined}
      />
    </div>
  );
}
