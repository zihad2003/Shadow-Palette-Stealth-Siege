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

export const RAID_DURATION_SECONDS = 90;

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

/** Level changes radius + sweep speed, not the clay mesh size. */
export const SEARCHLIGHT_LEVELS = {
  1: { coneAngleDeg: 48, rangeTiles: 4.6, sweepDegPerSec: 38, alarmRangeBonus: 1 },
  2: { coneAngleDeg: 56, rangeTiles: 6.0, sweepDegPerSec: 52, alarmRangeBonus: 1 },
  3: { coneAngleDeg: 64, rangeTiles: 7.4, sweepDegPerSec: 68, alarmRangeBonus: 1 },
};

export const DEFAULT_SEARCHLIGHT_LEVEL = 1;
