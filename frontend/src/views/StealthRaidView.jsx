import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
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
import { generateDefenderTiles, tileColorAt } from '../raid/defenderLayouts.js';
import { RAID_DURATION_SECONDS, DETECTION_STATES } from '../raid/stealthConstants.js';
import { chipsForOutcome, resolveRaidOutcome } from '../raid/RaidSession.js';
import { GATE_SPAWN_TILE, MAP_COLS, MAP_ROWS, SEARCHLIGHT_TILE } from '../gamemap/mapConfig.js';
import { GAME_COLORS } from '../colors.js';

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
  } = useGameState();

  const lockedCamo = raidSession?.camoColor || camoColor;
  const sceneApi = useRef(null);
  const paintedTiles = useMemo(() => generateDefenderTiles(raidTargetId || 34), [raidTargetId]);
  const detection = useRef(new DetectionSystem());
  const sessionLog = useRef([]);
  const robot = useRef({
    column: SEARCHLIGHT_TILE.column,
    row: SEARCHLIGHT_TILE.row,
    chasing: false,
    caught: false,
  });

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
  });

  const alarmSystem = useRef(null);
  if (!alarmSystem.current) {
    alarmSystem.current = createAlarmSystem({
      onAlarmTriggered() {
        robot.current.chasing = true;
      },
    });
  }

  useEffect(() => {
    const started = Date.now();
    let raf = 0;
    let last = performance.now();
    let tickN = 0;

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
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
        sceneApi.current?.setAlarm?.(true);
        showToast('SIREN — patrol robot activated', 'error');
      }

      if (robot.current.chasing && !robot.current.caught) {
        const dx = pos.column - robot.current.column;
        const dy = pos.row - robot.current.row;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.55) {
          robot.current.caught = true;
        } else {
          const step = 1.6 * dt;
          robot.current.column += (dx / dist) * step;
          robot.current.row += (dy / dist) * step;
        }
      }

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
        if (robot.current.caught) {
          return {
            ...prev,
            meter: result.meter,
            state: DETECTION_STATES.ALARM,
            alarm: true,
            remaining: 0,
            outcome: 'CAUGHT',
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
        };
      });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [lockedCamo, paintedTiles, showToast]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (hud.outcome) return;
      let { column, row } = attackerRef.current;
      let moved = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        row = Math.max(0, row - 1);
        moved = true;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        row = Math.min(MAP_ROWS - 1, row + 1);
        moved = true;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        column = Math.max(0, column - 1);
        moved = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        column = Math.min(MAP_COLS - 1, column + 1);
        moved = true;
      }
      if (!moved) return;
      e.preventDefault();
      setAttacker((prev) => ({ ...prev, column, row }));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hud.outcome]);

  const settled = useRef(false);
  const finishRaid = (forcedOutcome) => {
    if (settled.current) return;
    settled.current = true;
    const outcome = forcedOutcome || hud.outcome || resolveRaidOutcome({ alarmTriggered: hud.alarm, caught: robot.current.caught });
    const base = raidLoot?.chips || 200;
    const awarded = chipsForOutcome(outcome, base);
    setChips((prev) => prev + awarded);
    showToast(
      outcome === 'CAUGHT' ? 'Caught — 0 chips' : outcome === 'ESCAPED' ? `Escaped with 1.5× loot (+${awarded})` : `Silent extraction (+${awarded})`,
      outcome === 'CAUGHT' ? 'error' : 'success'
    );
    transitionTo('BASE_BUILDER');
  };

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
        apiRef={sceneApi}
        paintedTiles={paintedTiles}
        showSearchlight
        attacker={attacker}
      />

      <header className="absolute top-4 left-5 right-5 z-50 flex items-center justify-between pointer-events-none gap-3 flex-nowrap">
        <HudBanner icon="⚔️" title="Stealth Raid" subtitle={`Camo locked · ${lockedCamo}`} />
        <NavigationTabs />
        <TopResourceBar />
      </header>

      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-2">
        <ClayPanel className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide ${stateTone}`}>
          CAMO: {lockedCamo} · {hud.state} · {Math.ceil(hud.remaining)}s · WASD move
        </ClayPanel>
        <div className="w-56 h-2 rounded-full clay-inset overflow-hidden">
          <motion.div
            className={`h-full ${hud.exposed ? 'bg-clay-danger' : hud.shimmer ? 'bg-clay-success' : 'bg-clay-accent'}`}
            animate={{ width: `${hud.meter}%` }}
            transition={{ duration: 0.12, ease: 'linear' }}
          />
        </div>
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
              🚨 SIREN — ROBOT ACTIVE
            </ClayPanel>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hud.outcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[70] flex items-center justify-center bg-[#0d1b1e]/75 pointer-events-auto"
          >
            <ClayPanel depth="deep" className="p-6 rounded-[28px] w-[360px] max-w-[90vw] flex flex-col gap-3 text-center">
              <p className="text-[10px] font-heading font-bold uppercase tracking-[0.24em] text-clay-accent">Raid complete</p>
              <h2 className="font-heading font-extrabold text-xl text-clay-text">
                {hud.outcome === 'SILENT' ? 'Silent Extraction' : hud.outcome === 'ESCAPED' ? 'Detected — Escaped' : 'Caught'}
              </h2>
              <p className="text-xs text-clay-muted">
                Camo stayed {lockedCamo}. Loot {hud.outcome === 'CAUGHT' ? '0×' : hud.outcome === 'ESCAPED' ? '1.5×' : '1.0×'}.
              </p>
              <ClayButton variant="success" onClick={() => finishRaid(hud.outcome)} className="w-full py-2.5 rounded-2xl text-xs">
                Return to base
              </ClayButton>
            </ClayPanel>
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
        onExtract={() => finishRaid(resolveRaidOutcome({ alarmTriggered: hud.alarm, caught: robot.current.caught }))}
      />
    </div>
  );
}
