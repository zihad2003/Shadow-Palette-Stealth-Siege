/**
 * Searchlight answers only: can the beam currently hit this attacker?
 * It does not alarm, chase, or score loot.
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
      distance,
      reason: 'OUTSIDE_CONE',
    };
  }

  return {
    inRange: true,
    inBeam: true,
    canSee: true,
    distance,
    reason: 'IN_BEAM',
  };
}

export const SearchlightSensor = { evaluateBeam, normalizeAngleDiff };
export default SearchlightSensor;
