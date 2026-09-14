import { MAP_COLS, MAP_ROWS } from '../gamemap/mapConfig.js';

/** Configurable stealth / searchlight numbers. Do not scatter these as literals. */
export const STEALTH_CONSTANTS = {
  baseVisibility: 100,
  colorMatchBonus: 40,
  shadowTileBonus: 20,
  meterRisePerSec: 36,
  meterFallPerSec: 18,
  matchMeterFallPerSec: 8,
  suspiciousAt: 25,
  alertAt: 55,
  alarmAt: 100,
};

export const RAID_DURATION_SECONDS = 150;

export const RAID_OUTCOMES = {
  SILENT: { id: 'SILENT', label: 'Silent Extraction', chipMultiplier: 1.0 },
  ESCAPED: { id: 'ESCAPED', label: 'Detected but Escaped', chipMultiplier: 1.5 },
  CAUGHT: { id: 'CAUGHT', label: 'Detected and Caught', chipMultiplier: 0 },
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
 */
export const SEARCHLIGHT_LEVELS = {
  1: { cover: 0.5, coneAngleDeg: 42, sweepDegPerSec: 26, alarmRangeBonus: 1.6, spotIntensity: 2.1 },
  2: { cover: 0.75, coneAngleDeg: 50, sweepDegPerSec: 34, alarmRangeBonus: 2.0, spotIntensity: 2.7 },
  3: { cover: 1, coneAngleDeg: 56, sweepDegPerSec: 42, alarmRangeBonus: 2.4, spotIntensity: 3.3 },
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
