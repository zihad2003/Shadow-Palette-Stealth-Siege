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
  ESCAPE_HOLD_SECONDS,
} from './stealthConstants.js';
import { MAP_COLS, MAP_ROWS } from '../gamemap/mapConfig.js';
import { tileKey, isWallBreakSpot, isGateTile } from '../gamemap/occupancy.js';

export function distanceToGate(x, y) {
  return Math.hypot(Number(x) - GATE_X, Number(y) - GATE_Y);
}

export function inExtractionZone(x, y, point = null, radius = EXTRACTION_RADIUS) {
  if (point && point.column != null && point.row != null) {
    return Math.hypot(Number(x) - point.column, Number(y) - point.row) <= radius;
  }
  return distanceToGate(x, y) <= radius;
}

export function inEscapeTile(x, y, tile) {
  if (!tile) return false;
  return Math.round(Number(x)) === tile.column && Math.round(Number(y)) === tile.row;
}

/** Empty tile touching the outer wall, away from the south-gate spawn. */
export function pickEscapeTile(solids, seed = 1) {
  const used = solids instanceof Set ? solids : new Set();
  const candidates = [];
  for (let c = 1; c < MAP_COLS - 1; c += 1) {
    for (let r = 1; r < MAP_ROWS - 1; r += 1) {
      if (!isWallBreakSpot(c, r)) continue;
      if (isGateTile(c, r)) continue;
      if (used.has(tileKey(c, r))) continue;
      if (Math.abs(c - GATE_X) <= 4 && r >= MAP_ROWS - 4) continue;
      candidates.push({ column: c, row: r });
    }
  }
  if (!candidates.length) {
    return { column: 1, row: Math.max(2, Math.floor(MAP_ROWS / 2)) };
  }
  let n = Math.abs(Math.floor(Number(seed) || 1));
  n = (n * 1103515245 + 12345) >>> 0;
  return candidates[n % candidates.length];
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
  zoneX = GATE_X,
  zoneY = GATE_Y,
  zoneRadius = EXTRACTION_RADIUS,
  holdSeconds = CHANNEL_DURATION_SECONDS,
}) {
  const inZone = Math.hypot(Number(x) - zoneX, Number(y) - zoneY) <= zoneRadius;
  const moved = Math.hypot(Number(x) - Number(prevX), Number(y) - Number(prevY)) > CHANNEL_MOVE_EPSILON;
  let robotNear = false;
  if (robotX != null && robotY != null) {
    robotNear = Math.hypot(Number(x) - Number(robotX), Number(y) - Number(robotY)) <= CHASE_INTERRUPT_DISTANCE;
  }
  const interrupt = !inZone || moved || beamHit || (robotChasing && robotNear);
  const hold = Math.max(0.5, Number(holdSeconds) || CHANNEL_DURATION_SECONDS);

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

  const next = Math.min(hold, channelProgress + Math.max(0, dt));
  const complete = next >= hold;
  return {
    channelProgress: next,
    channeling: true,
    complete,
    interrupted: false,
    inZone: true,
    percent: Math.round((next / hold) * 100),
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

export { GATE_X, GATE_Y, EXTRACTION_RADIUS, CHANNEL_DURATION_SECONDS, ESCAPE_HOLD_SECONDS };
