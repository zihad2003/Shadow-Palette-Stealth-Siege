import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Minus, DoorOpen, Hammer, Bot } from 'lucide-react';
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
import { generateDefenderBase, tileColorAt } from '../raid/defenderLayouts.js';
import { RAID_DURATION_SECONDS, DETECTION_STATES } from '../raid/stealthConstants.js';
import { chipsForOutcome, resolveRaidOutcome } from '../raid/RaidSession.js';
import { GATE_SPAWN_TILE, SEARCHLIGHT_TILE, WALK_TILE_SECONDS } from '../gamemap/mapConfig.js';
import { collectSolidTiles, isWallBreakSpot } from '../gamemap/occupancy.js';
import { stepDirection, attemptStep, TURN_RATE } from '../character/gridMover.js';
import { listDecorOccupiedTiles } from '../gamemap/MapDecor.js';
import { GAME_COLORS } from '../colors.js';
import { RAID_TARGETS } from '../data/raidTargets.js';
import { createSprintMeter, SPRINT_SPEED_MULT } from '../character/sprint.js';
import StaminaBar from '../components/hud/StaminaBar.jsx';

const WALL_BREAK_HITS = 4;
const RAID_DECOR_SEED = 41;

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
        sceneApi.current?.setPatrolChase?.(true, {
          column: attackerRef.current.column,
          row: attackerRef.current.row,
        });
      },
    });
  }

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
        const pair = solidsPairRef.current;
        solidRef.current = gateLockedRef.current || hudRef.current.gateLocked ? pair.locked : pair.open;
        const yaw = sceneApi.current?.getFacingYaw?.() ?? Math.PI;
        const dir = stepDirection(yaw, forward, strafe);
        const step = attemptStep(attackerRef.current, dir, solidRef.current);
        if (step.ok) {
          moveCooldown = WALK_TILE_SECONDS * (step.diagonal ? Math.SQRT2 : 1) / sprintMul;
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
        showToast('Siren · break wall', 'error');
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
      outcome === 'CAUGHT' ? 'Caught' : outcome === 'ESCAPED' ? `Escaped +${awarded}` : `Silent +${awarded}`,
      outcome === 'CAUGHT' ? 'error' : 'success'
    );
    transitionTo('BASE_BUILDER');
  };

  const climbGate = () => {
    if (hudRef.current.outcome) return;
    if (!isAtGate(attackerRef.current.column, attackerRef.current.row)) {
      showToast('South gate', 'info');
      return;
    }
    if (hudRef.current.gateLocked || hudRef.current.alarm) {
      showToast('Gate locked', 'error');
      return;
    }
    finishRaid('SILENT');
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
    if (final) soundEngine.playSuccessSound();

    window.setTimeout(() => {
      if (final) {
        showToast('Open', 'success');
        setHud((prev) => ({
          ...prev,
          outcome: 'ESCAPED',
          remaining: 0,
          breaking: false,
          breakFlash: false,
        }));
      } else {
        showToast(`${hits}/${WALL_BREAK_HITS}`, 'info');
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
    if (isWallBreakSpot(column, row) && (hudRef.current.alarm || hudRef.current.gateLocked)) {
      hitWall();
      return;
    }
    if (isAtGate(column, row)) {
      showToast('Wall', 'error');
      return;
    }
    showToast('F · gate or wall', 'info');
  };
  actionRef.current = tryAction;

  const atGate = isAtGate(attacker.column, attacker.row);
  const atWall = isWallBreakSpot(attacker.column, attacker.row);
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
      />

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
          {raidDefenses.length > 0 && (
            <Bot size={13} className={hud.robotEngaged ? 'text-clay-danger' : 'text-clay-muted'} />
          )}
          <span className="text-[11px] font-semibold whitespace-nowrap">
            {hud.alarm ? (hud.robotEngaged ? 'Chase' : 'Break wall') : hud.state} · {Math.ceil(hud.remaining)}s
          </span>
          <div className="w-16 h-1.5 rounded-full clay-inset overflow-hidden">
            <div
              className={`h-full rounded-full ${hud.exposed ? 'bg-clay-danger' : hud.shimmer ? 'bg-clay-success' : 'bg-clay-accent'}`}
              style={{ width: `${hud.meter}%` }}
            />
          </div>
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
            variant={canClimb ? 'success' : 'ghost'}
            disabled={!canClimb}
            onClick={climbGate}
            className="h-8 px-3 rounded-lg text-[11px] flex items-center gap-1"
          >
            <DoorOpen size={12} /> Gate
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
            <ClayPanel depth="deep" className="p-5 rounded-3xl w-[280px] max-w-[88vw] flex flex-col gap-3 text-center">
              <h2 className="font-heading font-semibold text-sm text-clay-text">
                {hud.outcome === 'SILENT' ? 'Silent' : hud.outcome === 'ESCAPED' ? 'Escaped' : 'Caught'}
              </h2>
              <p className="text-[11px] text-clay-muted">
                {hud.outcome === 'CAUGHT' ? 'Loot 0×' : hud.outcome === 'ESCAPED' ? 'Loot 1.5×' : 'Loot 1.0×'}
              </p>
              <ClayButton variant="success" onClick={() => finishRaid(hud.outcome)} className="w-full py-2 rounded-xl text-xs">
                Base
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
            showToast('Break wall', 'error');
            return;
          }
          finishRaid(resolveRaidOutcome({ alarmTriggered: hud.alarm, caught: false }));
        }}
      />
    </div>
  );
}
