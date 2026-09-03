// Slow beam rotation — decorative on the home base; combat sweep lives in raids.
export function createBeamSweep(spotlightPivot) {
  return {
    update(elapsed) {
      spotlightPivot.rotation.y = elapsed * 0.35;
    },
  };
}
