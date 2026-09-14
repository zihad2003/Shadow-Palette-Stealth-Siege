import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Minus, DoorOpen, Hammer, Bot } from 'lucide-react';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import SideRaidPanel from '../components/hud/SideRaidPanel.jsx';
import HudBanner from '../components/ui/HudBanner.jsx';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import ClayButton from '../components/ui/ClayButton.jsx';
import GameMap from '../gamemap/GameMap.jsx';
import { useGameState } from '../state/GameStateContext.jsx';
import { soundEngine } from '../soundEngine.js';
import { DetectionSystem } from '../raid/DetectionSystem.js';
import { createAlarmSystem } from '../raid/AlarmSystem.js';
import { generateDefenderBase, tileColorAt } from '../raid/defenderLayouts.js';
import { RAID_DURATION_SECONDS, DETECTION_STATES } from '../raid/stealthConstants.js';
import { chipsForOutcome, resolveRaidOutcome } from '../raid/RaidSession.js';
import { GATE_SPAWN_TILE, MAP_COLS, MAP_ROWS, SEARCHLIGHT_TILE, WALK_TILE_SECONDS } from '../gamemap/mapConfig.js';
import { collectSolidTiles } from '../gamemap/occupancy.js';
import { stepDirection, attemptStep, TURN_RATE } from '../character/gridMover.js';
import { listDecorOccupiedTiles } from '../gamemap/MapDecor.js';
import { GAME_COLORS } from '../colors.js';
import { RAID_TARGETS } from '../data/raidTargets.js';
import { createSprintMeter, SPRINT_SPEED_MULT } from '../character/sprint.js';
import StaminaBar from '../components/hud/StaminaBar.jsx';

const WALL_BREAK_HITS = 4;
const RAID_DECOR_SEED = 41;

function isPerimeter(column, row) {
  return column === 0 || row === 0 || column === MAP_COLS - 1 || row === MAP_ROWS - 1;
}

function isAtGate(column, row) {
  return column === GATE_SPAWN_TILE.column && row === GATE_SPAWN_TILE.row;
}

export default function StealthRaidView() {
  const {
    raidTargetId,
    camoColor,
    raidSession,
    raidLoot,
    characterModel,
    showToast,
    setChips,
    transitionTo,
    recordRaidResult,
  } = useGameState();

  const lockedCamo = raidSession?.camoColor || camoColor;
  const sceneApi = useRef(null);
  const targetMeta = useMemo(
    () => RAID_TARGETS.find((t) => t.id === raidTargetId) || RAID_TARGETS[0],
    [raidTargetId]
  );
  const defenderBase = useMemo(
    () =>
      generateDefenderBase(raidTargetId || 34, {
        buildingCount: targetMeta?.buildings || 4,
        patrol: !!targetMeta?.patrol,
      }),
    [raidTargetId, targetMeta]
  );
  const paintedTiles = defenderBase.tiles;
  const raidBuildings = defenderBase.buildings;
  const raidDefenses = defenderBase.defenses;
  const solidTiles = useMemo(
    () =>
      collectSolidTiles({
        buildings: raidBuildings,
        decorTiles: listDecorOccupiedTiles(RAID_DECOR_SEED, raidBuildings),
      }),
    [raidBuildings]
  );
  const solidRef = useRef(solidTiles);
  solidRef.current = solidTiles;
  const detection = useRef(new DetectionSystem());
  const sessionLog = useRef([]);
  const wallHitsRef = useRef(0);
  const gateLockedRef = useRef(false);
  const keys = useRef(new Set());
  const actionRef = useRef(null);
  const sprintMeter = useRef(createSprintMeter());
  const [stamina, setStamina] = useState({ stamina: 1, sprinting: false, exhausted: false });

  const [attacker, setAttacker] = useState({
    column: GATE_SPAWN_TILE.column,
    row: GATE_SPAWN_TILE.row,
    camoColor: lockedCamo,
    characterModel: characterModel || 1,
  });
  const attackerRef = useRef(attacker);
  attackerRef.current = attacker;

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
  });
  const hudRef = useRef(hud);
  hudRef.current = hud;
  const [entered, setEntered] = useState(false);

  const alarmSystem = useRef(null);
  if (!alarmSystem.current) {
    alarmSystem.current = createAlarmSystem({
      onAlarmTriggered() {
        gateLockedRef.current = true;
        sceneApi.current?.lockGate?.();
        sceneApi.current?.setPatrolChase?.(true, {
          column: attackerRef.current.column,
          row: attackerRef.current.row,
        });
      },
    });
  }

  useEffect(() => {
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const started = Date.now();
    let raf = 0;
    let last = performance.now();
    let tickN = 0;
    let moveCooldown = 0;
    let lastSprintMul = 1;
    let lastHud = { stamina: 1, sprinting: false, exhausted: false };

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      moveCooldown = Math.max(0, moveCooldown - dt);

      const canMove = !hudRef.current.outcome && !hudRef.current.breaking;
      let forward = 0;
      let turn = 0;
      if (canMove) {
        if (keys.current.has('ArrowUp') || keys.current.has('w') || keys.current.has('W')) forward += 1;
        if (keys.current.has('ArrowDown') || keys.current.has('s') || keys.current.has('S')) forward -= 1;
        if (keys.current.has('ArrowLeft') || keys.current.has('a') || keys.current.has('A')) turn += 1;
        if (keys.current.has('ArrowRight') || keys.current.has('d') || keys.current.has('D')) turn -= 1;
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
      if (canMove && !mouseLocked && turn !== 0) sceneApi.current?.addLookYaw?.(turn * TURN_RATE * dt);

      if (canMove && moveCooldown <= 0 && (forward !== 0 || strafe !== 0)) {
        const yaw = sceneApi.current?.getFacingYaw?.() ?? Math.PI;
        const dir = stepDirection(yaw, forward, strafe);
        const step = attemptStep(attackerRef.current, dir, solidRef.current);
        if (step.ok) {
          moveCooldown = (WALK_TILE_SECONDS * (step.diagonal ? Math.SQRT2 : 1) / sprintMul) * 0.92;
          soundEngine.playFootstepSound(sp.sprinting);
          setAttacker((prev) => ({ ...prev, column: step.column, row: step.row }));
        } else if (step.blocked) {
          moveCooldown = 0.1;
          sceneApi.current?.playBump?.();
        }
      }

      const pos = attackerRef.current;
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
      });

      if (result.justAlarmed) {
        alarmSystem.current.trigger({
          playerX: pos.column,
          playerY: pos.row,
          reason: result.reason,
          camoColor: lockedCamo,
          tileColor,
        });
        soundEngine.playAlarmSound();
        soundEngine.playGateSlamSound();
        sceneApi.current?.setAlarm?.(true);
        sceneApi.current?.lockGate?.();
        sceneApi.current?.setPatrolChase?.(true, { column: pos.column, row: pos.row });
        showToast(
          raidDefenses.length
            ? 'SIREN — patrol engaged · break a wall to escape'
            : 'SIREN — gate locked · break a wall to escape',
          'error'
        );
      }

      if (result.alarmLatched) {
        sceneApi.current?.setPatrolChase?.(true, { column: pos.column, row: pos.row });
      }

      const patrolState = sceneApi.current?.getPatrolState?.() || {};
      const robotCaught = !!patrolState.caught;

      const remaining = Math.max(0, RAID_DURATION_SECONDS - (Date.now() - started) / 1000);
      tickN += 1;
      if (tickN % 8 === 0) {
        sessionLog.current.push({
          tick: tickN,
          xPos: pos.column,
          yPos: pos.row,
          beamAngleDeg: light?.beamAngleDeg ?? 0,
        });
      }

      setHud((prev) => {
        if (prev.outcome) return prev;
        if (robotCaught) {
          return {
            ...prev,
            meter: result.meter,
            state: DETECTION_STATES.ALARM,
            alarm: true,
            gateLocked: true,
            remaining: 0,
            outcome: 'CAUGHT',
            robotEngaged: true,
            robotHitting: true,
          };
        }
        if (remaining <= 0) {
          return {
            ...prev,
            remaining: 0,
            outcome: resolveRaidOutcome({ alarmTriggered: result.alarmLatched, caught: false }),
          };
        }
        return {
          meter: result.meter,
          state: result.state,
          colorMatch: result.colorMatch,
          inBeam: result.beam.canSee,
          remaining,
          alarm: result.alarmLatched,
          shimmer: result.beam.canSee && result.colorMatch,
          exposed: result.exposed,
          outcome: null,
          wallHits: wallHitsRef.current,
          gateLocked: gateLockedRef.current || result.alarmLatched,
          breaking: prev.breaking,
          robotEngaged: !!patrolState.chasing,
          robotHitting: !!patrolState.hitting,
        };
      });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedCamo, paintedTiles, showToast, raidDefenses.length]);

  useEffect(() => {
    const down = (e) => {
      keys.current.add(e.key);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'Shift'].includes(e.key)) {
        e.preventDefault();
      }
      if ((e.key === 'f' || e.key === 'F') && !e.repeat) {
        e.preventDefault();
        actionRef.current?.();
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

  const settled = useRef(false);
  const finishRaid = (forcedOutcome) => {
    if (settled.current) return;
    settled.current = true;
    if (document.pointerLockElement) document.exitPointerLock?.();
    const outcome =
      forcedOutcome ||
      hud.outcome ||
      resolveRaidOutcome({ alarmTriggered: hud.alarm, caught: hud.outcome === 'CAUGHT' });
    const base = raidLoot?.chips || 200;
    const awarded = chipsForOutcome(outcome, base);
    setChips((prev) => prev + awarded);
    recordRaidResult(outcome);
    showToast(
      outcome === 'CAUGHT'
        ? 'Caught — 0 chips · 5 min cooldown'
        : outcome === 'ESCAPED'
          ? `Escaped with 1.5× loot (+${awarded})`
          : `Silent extraction (+${awarded})`,
      outcome === 'CAUGHT' ? 'error' : 'success'
    );
    transitionTo('BASE_BUILDER');
  };

  const climbGate = () => {
    if (hudRef.current.outcome) return;
    if (!isAtGate(attackerRef.current.column, attackerRef.current.row)) {
      showToast('Reach the south gate to climb out', 'info');
      return;
    }
    if (hudRef.current.gateLocked || hudRef.current.alarm) {
      showToast('Gate locked by alarm — break a perimeter wall (F)', 'error');
      return;
    }
    finishRaid('SILENT');
  };

  const hitWall = () => {
    if (hudRef.current.outcome) return;
    if (hudRef.current.breaking) return;
    if (!isPerimeter(attackerRef.current.column, attackerRef.current.row)) {
      showToast('Stand on a perimeter tile to break the wall', 'info');
      return;
    }
    if (!hudRef.current.alarm && !hudRef.current.gateLocked) {
      showToast('Wall break is for escape after alarm — or climb the open gate (F)', 'info');
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
    if (final) soundEngine.playSuccessSound();

    window.setTimeout(() => {
      if (final) {
        showToast('Wall breached — escaping!', 'success');
        setHud((prev) => ({
          ...prev,
          outcome: 'ESCAPED',
          remaining: 0,
          breaking: false,
          breakFlash: false,
        }));
      } else {
        showToast(`Wall hit ${hits}/${WALL_BREAK_HITS} · keep pressing F`, 'info');
        setHud((prev) => ({ ...prev, breaking: false, breakFlash: false }));
      }
    }, final ? 900 : 420);
  };

  const tryAction = () => {
    if (hudRef.current.outcome) return;
    const { column, row } = attackerRef.current;
    if (isAtGate(column, row) && !hudRef.current.gateLocked && !hudRef.current.alarm) {
      climbGate();
      return;
    }
    if (isPerimeter(column, row) && (hudRef.current.alarm || hudRef.current.gateLocked)) {
      hitWall();
      return;
    }
    if (isAtGate(column, row)) {
      showToast('Gate locked — move to a wall and press F', 'error');
      return;
    }
    showToast('F: climb gate (open) or break bricks (after alarm)', 'info');
  };
  actionRef.current = tryAction;

  const atGate = isAtGate(attacker.column, attacker.row);
  const atWall = isPerimeter(attacker.column, attacker.row);
  const canClimb = atGate && !hud.gateLocked && !hud.alarm && !hud.outcome;
  const canBreak = atWall && (hud.alarm || hud.gateLocked) && !hud.outcome;

  const stateTone =
    hud.state === DETECTION_STATES.ALARM
      ? 'text-clay-danger clay-alarm'
      : hud.state === DETECTION_STATES.ALERT
        ? 'text-clay-danger'
        : hud.state === DETECTION_STATES.SUSPICIOUS
          ? 'text-clay-accent'
          : 'text-clay-accent';

  return (
    <motion.div
      className="relative w-full h-full overflow-hidden bg-[#141414]"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: entered ? 1 : 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
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
      />

      <header className="absolute top-4 left-5 right-5 z-50 flex items-center justify-between pointer-events-none gap-3 flex-nowrap">
        <HudBanner icon="⚔️" title="Stealth Raid" subtitle={`Grayscale fortress · Camo ${lockedCamo}`} />
        <NavigationTabs />
        <TopResourceBar />
      </header>

      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-2">
        <ClayPanel className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide ${stateTone}`}>
          CAMO: {lockedCamo} · {hud.state} · {Math.ceil(hud.remaining)}s · WASD · Shift · F
        </ClayPanel>
        <div className="w-56 h-2 rounded-full clay-inset overflow-hidden">
          <motion.div
            className={`h-full ${hud.exposed ? 'bg-clay-danger' : hud.shimmer ? 'bg-clay-success' : 'bg-clay-accent'}`}
            animate={{ width: `${hud.meter}%` }}
            transition={{ duration: 0.12, ease: 'linear' }}
          />
        </div>
        {hud.inBeam && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-[10px] font-bold tracking-wide ${hud.colorMatch ? 'text-clay-success' : 'text-clay-danger'}`}
          >
            {hud.colorMatch ? 'Beam on · camo match — invisible' : 'Beam on · color mismatch — ALARM'}
          </motion.p>
        )}
      </div>

      <AnimatePresence>
        {hud.shimmer && !hud.alarm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 pointer-events-none"
            style={{ boxShadow: `inset 0 0 80px ${GAME_COLORS[lockedCamo] || '#fff'}` }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hud.exposed && !hud.alarm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.28 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 pointer-events-none bg-clay-danger/20"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hud.alarm && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-36 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          >
            <ClayPanel depth="deep" className="px-6 py-2 rounded-full clay-alarm text-clay-danger font-heading font-extrabold text-sm tracking-widest">
              {hud.robotEngaged ? '🚨 SIREN · PATROL CHASING' : '🚨 SIREN — GATE LOCKED · BREAK WALL'}
            </ClayPanel>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hud.breakFlash && (
          <motion.div
            key={`break-${hud.wallHits}`}
            initial={{ opacity: 0.55, scale: 1.04 }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 z-30 pointer-events-none"
            style={{
              background:
                hud.wallHits >= WALL_BREAK_HITS
                  ? 'radial-gradient(circle at center, rgba(244,162,97,0.45), transparent 55%)'
                  : 'radial-gradient(circle at center, rgba(255,255,255,0.28), transparent 50%)',
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hud.robotHitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.45, 0.2] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 0.35 }}
            className="absolute inset-0 z-25 pointer-events-none bg-clay-danger/30"
          />
        )}
      </AnimatePresence>

      {!hud.outcome && (
        <StaminaBar
          stamina={stamina.stamina}
          sprinting={stamina.sprinting}
          exhausted={stamina.exhausted}
          className="absolute left-5 bottom-3 z-40"
        />
      )}

      {raidDefenses.length > 0 && (
        <ClayPanel className="absolute left-5 bottom-28 z-40 px-3 py-2 rounded-2xl pointer-events-none flex items-center gap-2">
          <Bot size={14} className={hud.robotEngaged ? 'text-clay-danger' : 'text-clay-muted'} />
          <span className="text-[10px] font-bold text-clay-text">
            {hud.robotEngaged ? (hud.robotHitting ? 'Patrol hitting!' : 'Patrol engaged') : 'Patrol on standby'}
          </span>
        </ClayPanel>
      )}

      {!hud.outcome && (
        <ClayPanel
          depth="deep"
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-50 px-3 py-2 rounded-2xl flex flex-col gap-1.5 pointer-events-auto min-w-[260px] opacity-95"
        >
          <span className="text-[11px] font-heading uppercase font-bold text-clay-accent text-center tracking-wider">
            Escape · press F
          </span>
          {(hud.alarm || hud.gateLocked) && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2.5 rounded-full clay-inset overflow-hidden flex gap-0.5 p-0.5">
                {Array.from({ length: WALL_BREAK_HITS }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`flex-1 rounded-sm ${i < hud.wallHits ? 'bg-clay-accent' : 'bg-transparent'}`}
                    animate={
                      i === hud.wallHits - 1 && hud.breakFlash
                        ? { scale: [1, 1.35, 1], opacity: [1, 0.6, 1] }
                        : { scale: 1 }
                    }
                    transition={{ duration: 0.35 }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold text-clay-muted whitespace-nowrap">
                {hud.wallHits}/{WALL_BREAK_HITS}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <ClayButton
              variant={canClimb ? 'success' : 'ghost'}
              disabled={!canClimb}
              onClick={climbGate}
              className="flex-1 py-2 rounded-2xl text-xs flex items-center justify-center gap-1"
            >
              <DoorOpen size={13} /> Gate (F)
            </ClayButton>
            <ClayButton
              variant={canBreak ? 'danger' : 'ghost'}
              disabled={!canBreak}
              onClick={hitWall}
              className="flex-1 py-2 rounded-2xl text-xs flex items-center justify-center gap-1"
            >
              <Hammer size={13} /> Bricks (F)
            </ClayButton>
          </div>
          <p className="text-[10px] text-clay-muted text-center">
            Over-shoulder · W/S move · A/D turn · solids block tiles · F action
          </p>
        </ClayPanel>
      )}

      <AnimatePresence>
        {hud.outcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[70] flex items-center justify-center bg-[#0d1b1e]/75 pointer-events-auto"
          >
            <motion.div
              initial={{ y: 24, scale: 0.94, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            >
              <ClayPanel depth="deep" className="p-6 rounded-[28px] w-[360px] max-w-[90vw] flex flex-col gap-3 text-center">
                <p className="text-[10px] font-heading font-bold uppercase tracking-[0.24em] text-clay-accent">Raid complete</p>
                <h2 className="font-heading font-extrabold text-xl text-clay-text">
                  {hud.outcome === 'SILENT' ? 'Silent Extraction' : hud.outcome === 'ESCAPED' ? 'Detected — Escaped' : 'Caught'}
                </h2>
                <p className="text-xs text-clay-muted">
                  Camo stayed {lockedCamo}. Loot {hud.outcome === 'CAUGHT' ? '0×' : hud.outcome === 'ESCAPED' ? '1.5×' : '1.0×'}.
                  {hud.outcome === 'CAUGHT' ? ' Capture cooldown started.' : ''}
                </p>
                <ClayButton variant="success" onClick={() => finishRaid(hud.outcome)} className="w-full py-2.5 rounded-2xl text-xs">
                  Return to base
                </ClayButton>
              </ClayPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute right-5 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 pointer-events-auto">
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

      <SideRaidPanel
        lockedCamo={lockedCamo}
        detectionState={hud.state}
        meter={hud.meter}
        remaining={hud.remaining}
        isAlarmTriggered={hud.alarm}
        sessionLog={sessionLog}
        paintedTiles={paintedTiles}
        onExtract={() => {
          if (hud.alarm || hud.gateLocked) {
            showToast('Alarm active — climb unavailable; break a wall', 'error');
            return;
          }
          finishRaid(resolveRaidOutcome({ alarmTriggered: hud.alarm, caught: false }));
        }}
      />
    </motion.div>
  );
}
