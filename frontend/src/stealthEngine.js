// Shared Stealth & Lighthouse Detection Engine (Client-Side ES Module)

export const CAMO_BANDS = {
  WHITE: 5,
  YELLOW: 4,
  GREEN: 3,
  RED: 2,
  BLUE: 1,
};

export function getLuminanceBand(camoColor) {
  if (!camoColor) return CAMO_BANDS.WHITE;
  const key = camoColor.trim().toUpperCase();
  return CAMO_BANDS[key] || CAMO_BANDS.WHITE;
}

/**
 * Evaluates Lighthouse spotlight detection.
 *
 * @param {Object} lh - { x, y, beamAngleDeg, coneAngleDeg, coneRangeTiles }
 * @param {Object} player - { x, y, camoBand }
 * @param {number} surroundingBand - Luminance band (1-5) of floor/surface
 * @returns {Object} { isDetected, inCoreZone, inEdgeZone, reason }
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
  } else {
    const isMatch = player.camoBand === surroundingBand;
    return {
      isDetected: !isMatch,
      inCoreZone: false,
      inEdgeZone: true,
      reason: isMatch ? 'SAFE_EDGE_ZONE_MATCH' : 'EDGE_ZONE_MISMATCH',
    };
  }
}

function normalizeAngleDiff(diff) {
  while (diff > 180.0) diff -= 360.0;
  while (diff < -180.0) diff += 360.0;
  return diff;
}
