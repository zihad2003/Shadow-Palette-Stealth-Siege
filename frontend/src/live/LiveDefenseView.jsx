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
import RansomModal from '../components/raid/RansomModal.jsx';
import { Lock, ShieldAlert } from 'lucide-react';

const PUBLISH_MS = 120;

/**
 * Minimal live-defense view: WASD moves the patrol robot; attacker pose comes from STOMP.
 */
export default function LiveDefenseView() {
  const { userId, liveDefense, clearLiveDefense, transitionTo, showToast, buildings, paintedTiles, setCoins } = useGameState();

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
  const [showRansom, setShowRansom] = useState(false);

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
    const started = performance.now();
    let moveCooldown = 0;
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      sceneApi.current?.setRaidElapsed?.((now - started) / 1000);
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
        buildings={buildings || []}
        paintedTiles={paintedTiles || {}}
      />
      <HudHeader left={<HudBanner title="Defend" subtitle={status} />} />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
        <ClayPanel className="px-4 py-2 rounded-2xl text-[11px] text-clay-muted">
          WASD move patrol · catch the raider
        </ClayPanel>
      </div>
      {outcome && !showRansom && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <ClayPanel depth="deep" className="px-6 py-5 rounded-3xl flex flex-col gap-3.5 items-center max-w-sm text-center border border-white/10 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              {outcome === 'CAUGHT' ? <ShieldAlert size={28} /> : <Lock size={26} />}
            </div>
            <p className="text-base font-heading font-extrabold text-white">
              {outcome === 'CAUGHT' ? 'Intruder Captured!' : 'Raid Ended'}
            </p>
            <p className="text-xs text-clay-muted">
              {outcome === 'CAUGHT'
                ? 'You have intercepted the raider! As base owner, you have the authority to throw them in your Base Jail and demand a financial ransom.'
                : 'The raid session has finished.'}
            </p>
            <div className="flex flex-col gap-2 w-full mt-2">
              {outcome === 'CAUGHT' && (
                <button
                  type="button"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg hover:brightness-110 flex items-center justify-center gap-2 transition-all active:scale-95"
                  onClick={() => setShowRansom(true)}
                >
                  <Lock size={14} />
                  <span>Send to Base Jail & Demand Ransom</span>
                </button>
              )}
              <button
                type="button"
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-clay-muted hover:text-white text-xs font-semibold transition-all"
                onClick={leave}
              >
                Back to base
              </button>
            </div>
          </ClayPanel>
        </div>
      )}

      <RansomModal
        isOpen={showRansom}
        isPrisoner={false}
        attackerId={liveDefense?.attackerUserId || attacker?.id || 12}
        defenderId={userId}
        attackerName="Intruder"
        defenderName="Base Owner (You)"
        playerCoins={1000}
        onRelease={(coins) => {
          if (coins > 0) {
            setCoins((c) => c + coins);
            showToast?.(`Ransom payout received: +${coins} coins!`, 'success');
          }
          setShowRansom(false);
          leave();
        }}
        onDecline={() => {
          showToast?.('Ransom negotiation ended. Intruder imprisoned.', 'info');
          setShowRansom(false);
          leave();
        }}
      />
    </div>
  );
}
