/**
 * Client-side extraction channel + greed loot helpers.
 * Must mirror backend RaidValidator extraction replay + LootCalculationStrategy.
 */
import {
  GATE_X,
  GATE_Y,
  EXTRACTION_RADIUS,
  CHANNEL_DURATION_SECONDS,
  CHANNEL_MOVE_EPSILON,
  CHASE_INTERRUPT_DISTANCE,
  LOOT_INTERVAL_SECONDS,
  LOOT_PERCENT_PER_INTERVAL,
  MAX_LOOT_PERCENT,
  RAID_OUTCOMES,
} from './stealthConstants.js';

export function distanceToGate(x, y) {
  return Math.hypot(Number(x) - GATE_X, Number(y) - GATE_Y);
}

export function inExtractionZone(x, y) {
  return distanceToGate(x, y) <= EXTRACTION_RADIUS;
}

/**
 * Advance or reset channelProgress (seconds, 0 → CHANNEL_DURATION_SECONDS).
 * Interrupt if: leave zone, move too much, robot near, or beam hits (exposed).
 */
export function tickExtractionChannel({
  channelProgress = 0,
  x,
  y,
  prevX = x,
  prevY = y,
  dt = 1 / 60,
  robotX = null,
  robotY = null,
  beamHit = false,
  robotChasing = false,
}) {
  const inZone = inExtractionZone(x, y);
  const moved = Math.hypot(Number(x) - Number(prevX), Number(y) - Number(prevY)) > CHANNEL_MOVE_EPSILON;
  let robotNear = false;
  if (robotX != null && robotY != null) {
    robotNear = Math.hypot(Number(x) - Number(robotX), Number(y) - Number(robotY)) <= CHASE_INTERRUPT_DISTANCE;
  }
  const interrupt = !inZone || moved || beamHit || (robotChasing && robotNear);

  if (interrupt) {
    return {
      channelProgress: 0,
      channeling: false,
      complete: false,
      interrupted: channelProgress > 0.05,
      inZone,
      percent: 0,
    };
  }

  const next = Math.min(CHANNEL_DURATION_SECONDS, channelProgress + Math.max(0, dt));
  const complete = next >= CHANNEL_DURATION_SECONDS;
  return {
    channelProgress: next,
    channeling: true,
    complete,
    interrupted: false,
    inZone: true,
    percent: Math.round((next / CHANNEL_DURATION_SECONDS) * 100),
  };
}

/** Pure greed percent from time spent in base (capped). Continuous so the HUD
 * never sits at 0 for the first LOOT_INTERVAL_SECONDS (which looked like
 * “loot wiped when I entered the light”). */
export function estimateLootPercent(elapsedSeconds = 0) {
  const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
  return Math.min(
    MAX_LOOT_PERCENT,
    (elapsed / LOOT_INTERVAL_SECONDS) * LOOT_PERCENT_PER_INTERVAL
  );
}

export function estimateLootAmounts(elapsedSeconds, { coins = 0, ink = 0 } = {}, outcome = 'SILENT') {
  const pct = estimateLootPercent(elapsedSeconds);
  const mult = RAID_OUTCOMES[outcome]?.lootMultiplier ?? 0;
  return {
    percent: pct,
    coins: Math.round(Math.max(0, coins) * pct * mult),
    ink: Math.round(Math.max(0, ink) * pct * mult),
  };
}

export { GATE_X, GATE_Y, EXTRACTION_RADIUS, CHANNEL_DURATION_SECONDS };
