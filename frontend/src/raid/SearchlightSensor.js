/**
 * Searchlight answers only: can the beam currently hit this attacker?
 * It does not alarm, chase, or score loot.
 * Core vs edge zones mirror backend LighthouseDetectionEngine (inner 60% = core).
 */
export function normalizeAngleDiff(diff) {
  let d = diff;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export function evaluateBeam(light, player) {
  const dx = player.x - light.x;
  const dy = player.y - light.y;
  const distance = Math.hypot(dx, dy);
  const range = light.coneRangeTiles;

  if (distance > range) {
    return {
      inRange: false,
      inBeam: false,
      canSee: false,
      inCoreZone: false,
      inEdgeZone: false,
      distance,
      reason: 'OUTSIDE_RANGE',
    };
  }

  const playerAngleDeg = (Math.atan2(dx, dy) * 180) / Math.PI;
  const angleDiffDeg = Math.abs(normalizeAngleDiff(playerAngleDeg - light.beamAngleDeg));
  const halfCone = light.coneAngleDeg / 2;

  if (angleDiffDeg > halfCone) {
    return {
      inRange: true,
      inBeam: false,
      canSee: false,
      inCoreZone: false,
      inEdgeZone: false,
      distance,
      reason: 'OUTSIDE_CONE',
    };
  }

  // Core = inner 60% of cone angle (always detects); edge = outer rim (camo-sensitive).
  const coreHalf = (light.coneAngleDeg * 0.6) / 2;
  const inCoreZone = angleDiffDeg <= coreHalf;

  return {
    inRange: true,
    inBeam: true,
    canSee: true,
    inCoreZone,
    inEdgeZone: !inCoreZone,
    distance,
    reason: 'IN_BEAM',
  };
}

/**
 * Robot-state-machine reason for PatrolRobotContext.processDetection.
 * Synced with backend LighthouseDetectionEngine CORE_ZONE / EDGE_ZONE_MISMATCH.
 */
export function robotDetectionReason(beam, colorMatch) {
  if (!beam?.canSee) return beam?.reason || 'OUTSIDE_RANGE';
  if (beam.inCoreZone) return 'CORE_ZONE';
  if (beam.inEdgeZone) return colorMatch ? 'SAFE_EDGE_ZONE_MATCH' : 'EDGE_ZONE_MISMATCH';
  // Fallback if zone flags missing: full-beam mismatch is a strong contact.
  return colorMatch ? 'SAFE_EDGE_ZONE_MATCH' : 'CORE_ZONE';
}

/** True when a map tile sits inside the current cone (for color reveal). */
export function isTileInBeam(light, column, row) {
  return evaluateBeam(light, { x: column, y: row }).inBeam;
}

export const SearchlightSensor = { evaluateBeam, normalizeAngleDiff, isTileInBeam, robotDetectionReason };
export default SearchlightSensor;
