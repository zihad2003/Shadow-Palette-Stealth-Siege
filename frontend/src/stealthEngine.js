import { evaluateBeam } from './raid/SearchlightSensor.js';
import { isMatch } from './raid/ColorMatchSystem.js';
import { evaluateDetectionTick, computeStealthScore } from './raid/DetectionSystem.js';

export { evaluateBeam, isMatch, evaluateDetectionTick, computeStealthScore };

export const CAMO_BANDS = {
  WHITE: 5,
  YELLOW: 4,
  GREEN: 3,
  RED: 2,
  BLUE: 1,
  PURPLE: 2,
};

export function getLuminanceBand(camoColor) {
  if (!camoColor) return CAMO_BANDS.BLUE;
  const key = camoColor.trim().toUpperCase();
  return CAMO_BANDS[key] || CAMO_BANDS.BLUE;
}

/**
 * Legacy luminance-band lighthouse check. New raids use SearchlightSensor + ColorMatchSystem.
 */
export function checkLighthouseDetection(lh, player, surroundingBand) {
  const dx = player.x - lh.x;
  const dy = player.y - lh.y;
  const distance = Math.hypot(dx, dy);

  if (distance > lh.coneRangeTiles) {
    return { isDetected: false, inCoreZone: false, inEdgeZone: false, reason: 'OUTSIDE_RANGE' };
  }

  const playerAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const angleDiffDeg = Math.abs(normalizeAngleDiff(playerAngleDeg - lh.beamAngleDeg));
  const halfConeAngle = lh.coneAngleDeg / 2.0;

  if (angleDiffDeg > halfConeAngle) {
    return { isDetected: false, inCoreZone: false, inEdgeZone: false, reason: 'OUTSIDE_CONE' };
  }

  const coreHalfAngle = (lh.coneAngleDeg * 0.6) / 2.0;

  if (angleDiffDeg <= coreHalfAngle) {
    return { isDetected: true, inCoreZone: true, inEdgeZone: false, reason: 'CORE_ZONE' };
  }

  const matched = player.camoBand === surroundingBand;
  return {
    isDetected: !matched,
    inCoreZone: false,
    inEdgeZone: true,
    reason: matched ? 'SAFE_EDGE_ZONE_MATCH' : 'EDGE_ZONE_MISMATCH',
  };
}

function normalizeAngleDiff(diff) {
  while (diff > 180.0) diff -= 360.0;
  while (diff < -180.0) diff += 360.0;
  return diff;
}
