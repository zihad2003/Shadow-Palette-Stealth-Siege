import { DETECTION_STATES, STEALTH_CONSTANTS } from './stealthConstants.js';
import { isMatch } from './ColorMatchSystem.js';
import { evaluateBeam } from './SearchlightSensor.js';

export function computeStealthScore({ colorMatch, shadowTile = false }) {
  const { baseVisibility, colorMatchBonus, shadowTileBonus } = STEALTH_CONSTANTS;
  return Math.max(
    0,
    baseVisibility - (colorMatch ? colorMatchBonus : 0) - (shadowTile ? shadowTileBonus : 0)
  );
}

export function stateFromMeter(meter, alarmLatched) {
  if (alarmLatched || meter >= STEALTH_CONSTANTS.alarmAt) return DETECTION_STATES.ALARM;
  if (meter >= STEALTH_CONSTANTS.alertAt) return DETECTION_STATES.ALERT;
  if (meter >= STEALTH_CONSTANTS.suspiciousAt) return DETECTION_STATES.SUSPICIOUS;
  return DETECTION_STATES.NORMAL;
}

/**
 * Pipeline: beam → real tile color → locked camo → match → stealth score → meter.
 */
export function evaluateDetectionTick({
  light,
  player,
  attackerColor,
  tileColor,
  shadowTile = false,
  dt = 1 / 60,
  meter = 0,
  alarmLatched = false,
}) {
  const beam = evaluateBeam(light, player);
  const colorMatch = isMatch(attackerColor, tileColor);
  const stealthScore = computeStealthScore({ colorMatch, shadowTile });
  const exposed = beam.canSee && !colorMatch;

  let nextMeter = meter;
  if (alarmLatched) {
    nextMeter = Math.max(meter, STEALTH_CONSTANTS.alarmAt);
  } else if (exposed) {
    const exposure = stealthScore / STEALTH_CONSTANTS.baseVisibility;
    nextMeter = meter + STEALTH_CONSTANTS.meterRisePerSec * exposure * dt;
  } else if (beam.canSee && colorMatch) {
    nextMeter = meter - STEALTH_CONSTANTS.matchMeterFallPerSec * dt;
  } else {
    nextMeter = meter - STEALTH_CONSTANTS.meterFallPerSec * dt;
  }
  nextMeter = Math.max(0, Math.min(STEALTH_CONSTANTS.alarmAt, nextMeter));

  const nextAlarm = alarmLatched || nextMeter >= STEALTH_CONSTANTS.alarmAt;
  const state = stateFromMeter(nextMeter, nextAlarm);

  return {
    beam,
    colorMatch,
    exposed,
    stealthScore,
    meter: nextMeter,
    state,
    alarmLatched: nextAlarm,
    justAlarmed: !alarmLatched && nextAlarm,
    reason: !beam.canSee
      ? beam.reason
      : colorMatch
        ? 'CAMOUFLAGE_MATCH'
        : 'COLOR_MISMATCH',
  };
}

export class DetectionSystem {
  constructor() {
    this.meter = 0;
    this.state = DETECTION_STATES.NORMAL;
    this.alarmLatched = false;
    this.last = null;
  }

  reset() {
    this.meter = 0;
    this.state = DETECTION_STATES.NORMAL;
    this.alarmLatched = false;
    this.last = null;
  }

  tick(input) {
    const result = evaluateDetectionTick({
      ...input,
      meter: this.meter,
      alarmLatched: this.alarmLatched,
    });
    this.meter = result.meter;
    this.state = result.state;
    this.alarmLatched = result.alarmLatched;
    this.last = result;
    return result;
  }
}

export default DetectionSystem;
