import React, { useEffect, useRef, useState } from 'react';
import GameMap from '../gamemap/GameMap.jsx';
import { useGameState } from '../state/GameStateContext.jsx';
import { GATE_SPAWN_TILE, SEARCHLIGHT_TILE, WALK_TILE_SECONDS } from '../gamemap/mapConfig.js';
import { noteKeyDown, noteKeyUp, walkAxes, bindKeyReleaseGuards } from '../character/walkInput.js';
import { attemptStep, stepDirection } from '../character/gridMover.js';
import { stompPublish, stompSubscribe, stompUnsubscribe, ensureStompConnected } from './stompClient.js';
import ClayPanel from '../components/ui/ClayPanel.jsx';
import HudHeader from '../components/ui/HudHeader.jsx';
import HudBanner from '../components/ui/HudBanner.jsx';

const PUBLISH_MS = 120;

/**
 * Minimal live-defense view: WASD moves the patrol robot; attacker pose comes from STOMP.
 */
export default function LiveDefenseView() {
  const { userId, liveDefense, clearLiveDefense, transitionTo, showToast } = useGameState();

  const raidId = liveDefense?.raidId;
  const sceneApi = useRef(null);
  const keys = useRef(new Set());
  const robotRef = useRef({
    column: SEARCHLIGHT_TILE.column,
    row: SEARCHLIGHT_TILE.row + 5,
  });
  const [attacker, setAttacker] = useState({
    column: GATE_SPAWN_TILE.column,
    row: Math.max(0, GATE_SPAWN_TILE.row - 3),
    camoColor: 'RED',
    characterModel: 1,
  });
  const [status, setStatus] = useState('Connecting…');
  const [outcome, setOutcome] = useState(null);

  useEffect(() => {
    const down = (e) => noteKeyDown(keys.current, e);
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

  useEffect(() => {
    if (!raidId || !userId) return undefined;
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
        setStatus('Live defense');
        await stompSubscribe(`/topic/live-raid/${raidId}/state`, (state) => {
          if (!state) return;
          if (state.attackerX != null && state.attackerY != null) {
            setAttacker((prev) => ({
              ...prev,
              column: state.attackerX,
              row: state.attackerY,
            }));
          }
          if (state.terminal && state.outcome === 'CAUGHT') {
            setOutcome('CAUGHT');
            setStatus('You caught the raider!');
            showToast?.('You caught the raider!', 'success');
          } else if (state.terminal) {
            setOutcome(state.outcome || 'ENDED');
            setStatus('Raid ended');
          } else if (state.joined) {
            setStatus('Hunting the raider');
          }
        });
      } catch {
        setStatus('Could not join live raid');
        showToast?.('Live join failed — AI will defend', 'info');
      }
    })();

    pubTimer = window.setInterval(() => {
      const pos = robotRef.current;
      stompPublish(`/app/live-raid/${raidId}/position`, {
        userId,
        role: 'DEFENDER',
        x: pos.column,
        y: pos.row,
      }).catch(() => {});
    }, PUBLISH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(pubTimer);
      stompUnsubscribe(`/topic/live-raid/${raidId}/state`);
    };
  }, [raidId, userId, showToast]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let moveCooldown = 0;
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      moveCooldown = Math.max(0, moveCooldown - dt);
      if (!outcome && moveCooldown <= 0) {
        const { forward, turn } = walkAxes(keys.current);
        if (forward !== 0 || turn !== 0) {
          const yaw = sceneApi.current?.getFacingYaw?.() ?? Math.PI;
          const dir = stepDirection(yaw, forward, -turn);
          const step = attemptStep(robotRef.current, dir, new Set());
          if (step.ok) {
            moveCooldown = WALK_TILE_SECONDS * (step.diagonal ? Math.SQRT2 : 1);
            const next = { column: step.column, row: step.row };
            robotRef.current = next;
            sceneApi.current?.setLivePatrolPosition?.(next.column, next.row);
          }
        }
      }
      sceneApi.current?.setLivePatrolPosition?.(robotRef.current.column, robotRef.current.row);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [outcome]);

  const leave = () => {
    clearLiveDefense?.();
    transitionTo('BASE_BUILDER');
  };

  return (
    <div className="relative w-full h-full">
      <GameMap
        grayscale
        apiRef={sceneApi}
        attacker={attacker}
        defenses={[{ id: 'live-patrol', type: 'PATROL_ROBOT', defenseType: 'PATROL_ROBOT' }]}
        buildings={[]}
        paintedTiles={{}}
      />
      <HudHeader left={<HudBanner title="Defend" subtitle={status} />} />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
        <ClayPanel className="px-4 py-2 rounded-2xl text-[11px] text-clay-muted">
          WASD move patrol · catch the raider
        </ClayPanel>
      </div>
      {outcome && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
          <ClayPanel depth="deep" className="px-6 py-5 rounded-2xl flex flex-col gap-3 items-center">
            <p className="text-sm font-heading font-semibold">
              {outcome === 'CAUGHT' ? 'You caught the raider!' : 'Raid ended'}
            </p>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-clay-accent text-white text-[12px] font-semibold"
              onClick={leave}
            >
              Back to base
            </button>
          </ClayPanel>
        </div>
      )}
    </div>
  );
}
