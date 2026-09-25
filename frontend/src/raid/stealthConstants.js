import { MAP_COLS, MAP_ROWS } from '../gamemap/mapConfig.js';

/**
 * Configurable stealth / searchlight / extraction / loot numbers.
 * Keep numerically identical to backend StealthConstants.java.
 */
export const STEALTH_CONSTANTS = {
  baseVisibility: 100,
  // Camo alone must not guarantee a hide — shaved ~15% so mismatch still matters in shadows.
  colorMatchBonus: 34,
  shadowTileBonus: 16,
  // +14% rise / −17% fall: detection builds faster and forgives less when you leave the beam.
  meterRisePerSec: 41,
  meterFallPerSec: 15,
  matchMeterFallPerSec: 7,
  suspiciousAt: 25,
  alertAt: 55,
  alarmAt: 100,
};

export const RAID_DURATION_SECONDS = 150;

/** South-gate extraction zone (matches GATE_SPAWN_TILE on the 48×40 board). */
export const GATE_X = Math.floor(MAP_COLS / 2);
export const GATE_Y = MAP_ROWS - 1;
export const EXTRACTION_RADIUS = 1.75;
/** Seconds the attacker must hold still in the gate zone to extract. */
export const CHANNEL_DURATION_SECONDS = 4;
/** Max tile movement between samples while channeling (≈ stationary). */
export const CHANNEL_MOVE_EPSILON = 0.22;
/** Robot within this distance interrupts the channel. */
export const CHASE_INTERRUPT_DISTANCE = 2.5;

/**
 * Time pressure: every interval spent inside without extracting raises meter rise.
 * Stacks on top of alarm sweep/range escalation.
 */
export const RISK_ESCALATION_INTERVAL_SECONDS = 30;
export const RISK_ESCALATION_PER_INTERVAL = 4;

/**
 * Beam range grows continuously while the attacker stays in the base.
 * effectiveRange = configuredRange * rangeRatio + (alarm ? alarmRangeBonus : 0)
 * — ratio applies to base only; alarm bonus stays additive.
 */
export const BEAM_RANGE_START_RATIO = 0.55;
/** ~0.55 → 1.0 in ~37.5s (faster pressure than the old 0.006). */
export const BEAM_RANGE_GROWTH_PER_SECOND = 0.012;
export const BEAM_RANGE_MAX_RATIO = 1.0;

/**
 * Patrol chase tiles/sec — a hair above walk so it can close if you keep walking;
 * sprint (~6.99) still outruns it. Tuned slower than 4.5 for readability.
 */
export const ROBOT_CHASE_SPEED = 3.95;
export const ROBOT_HIT_SPEED = 4.15;
/** Reference walk ≈ 1 / WALK_TILE_SECONDS (mapConfig). */
export const PLAYER_WALK_SPEED = 3.68;
/** Robot must be this close (tiles) to catch / interrupt extract. */
export const ROBOT_CATCH_DISTANCE = 0.65;
/** Hold this long while overlapping to lock CAUGHT. */
export const ROBOT_CATCH_HOLD_SECONDS = 0.28;

/** Greed loot lock-in — only awarded after extract / surviving the full timer. */
export const LOOT_INTERVAL_SECONDS = 10;
export const LOOT_PERCENT_PER_INTERVAL = 0.05;
export const MAX_LOOT_PERCENT = 0.45;

/** @deprecated Prefer LOOT_* timer loot; kept for older house-steal UI. */
export const RAID_LOOT_FRACTION = MAX_LOOT_PERCENT;

/** Session-log tick index is frame-based; assume 60fps for backend replay. */
export const SESSION_TICKS_PER_SECOND = 60;

export const RAID_OUTCOMES = {
  SILENT: { id: 'SILENT', label: 'Silent Extraction', chipMultiplier: 1.0, lootMultiplier: 1.0 },
  ESCAPED: { id: 'ESCAPED', label: 'Detected but Escaped', chipMultiplier: 1.5, lootMultiplier: 1.5 },
  CAUGHT: { id: 'CAUGHT', label: 'Detected and Caught', chipMultiplier: 0, lootMultiplier: 0 },
  INCOMPLETE: { id: 'INCOMPLETE', label: 'Raid Abandoned', chipMultiplier: 0, lootMultiplier: 0 },
};

export const DETECTION_STATES = {
  NORMAL: 'NORMAL',
  SUSPICIOUS: 'SUSPICIOUS',
  ALERT: 'ALERT',
  ALARM: 'ALARM',
};

/**
 * 100% = center → farthest wall (the long half-axis of the 48×40 board).
 * L1/L2 are 50% / 75% of that radius, so L1 reaches halfway to the side walls.
 */
export const SEARCHLIGHT_FULL_RANGE_TILES = Math.max((MAP_COLS - 1) / 2, (MAP_ROWS - 1) / 2);

/**
 * Level 1 = 50% radius, 2 = 75%, 3 = 100%.
 * Architecture (watch-lamp → turret → lighthouse) follows the same level.
 * alarmSweepMult / alarmRangeBonus scale so upgraded bases are meaningfully harder.
 */
export const SEARCHLIGHT_LEVELS = {
  1: { cover: 0.5, coneAngleDeg: 42, sweepDegPerSec: 26, alarmSweepMult: 1.25, alarmRangeBonus: 1.6, spotIntensity: 2.1 },
  2: { cover: 0.75, coneAngleDeg: 50, sweepDegPerSec: 34, alarmSweepMult: 1.4, alarmRangeBonus: 2.2, spotIntensity: 2.7 },
  3: { cover: 1, coneAngleDeg: 56, sweepDegPerSec: 42, alarmSweepMult: 1.55, alarmRangeBonus: 2.8, spotIntensity: 3.3 },
};

export const SEARCHLIGHT_UPGRADE_COSTS = {
  1: { coins: 180, ink: 22 },
  2: { coins: 420, ink: 40 },
};

export const DEFAULT_SEARCHLIGHT_LEVEL = 1;

export function clampSearchlightLevel(level) {
  const n = Number(level) || 1;
  return Math.max(1, Math.min(3, Math.round(n)));
}

export function searchlightRangeTiles(level) {
  const spec = SEARCHLIGHT_LEVELS[clampSearchlightLevel(level)];
  return SEARCHLIGHT_FULL_RANGE_TILES * spec.cover;
}

export function searchlightSpec(level) {
  const lv = clampSearchlightLevel(level);
  const raw = SEARCHLIGHT_LEVELS[lv];
  return {
    ...raw,
    level: lv,
    rangeTiles: SEARCHLIGHT_FULL_RANGE_TILES * raw.cover,
  };
}

/** Effective meter rise including greed/time pressure. */
export function effectiveMeterRisePerSec(elapsedSeconds = 0) {
  const intervals = Math.floor(Math.max(0, elapsedSeconds) / RISK_ESCALATION_INTERVAL_SECONDS);
  return STEALTH_CONSTANTS.meterRisePerSec + intervals * RISK_ESCALATION_PER_INTERVAL;
}

/** Multiplier applied to configured searchlight range from raid elapsed time. */
export function beamRangeRatio(elapsedSeconds = 0) {
  const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
  return Math.min(
    BEAM_RANGE_MAX_RATIO,
    BEAM_RANGE_START_RATIO + elapsed * BEAM_RANGE_GROWTH_PER_SECOND
  );
}

/**
 * Live cone range: time-grown base + optional alarm bonus (never ratio-scaled).
 * @param {number} configuredRange base tiles from searchlightSpec / SEARCHLIGHT_RANGE
 * @param {number} elapsedSeconds seconds since raid start
 * @param {number} [alarmRangeBonus=0] additive tiles while alarmed
 */
export function effectiveBeamRangeTiles(configuredRange, elapsedSeconds = 0, alarmRangeBonus = 0) {
  return configuredRange * beamRangeRatio(elapsedSeconds) + alarmRangeBonus;
}
