import { SEARCHLIGHT_LEVELS, DEFAULT_SEARCHLIGHT_LEVEL } from '../raid/stealthConstants.js';

/**
 * Slow beam rotation for the decorative home-base lighthouse.
 * Combat sweep lives in gamemap/Searchlight.js — uses the same sweepDegPerSec.
 */
export function createBeamSweep(spotlightPivot, { level = DEFAULT_SEARCHLIGHT_LEVEL } = {}) {
  const spec = SEARCHLIGHT_LEVELS[level] || SEARCHLIGHT_LEVELS[1];
  const degPerSec = spec.sweepDegPerSec || 26;
  let yaw = 0;
  let detectFlash = 0;

  return {
    flashDetect(strength = 1) {
      detectFlash = Math.max(detectFlash, 0.45 * strength);
    },
    update(elapsed, dt = 0.016, { alarm = false } = {}) {
      const mult = alarm ? spec.alarmSweepMult || 1.25 : 1;
      yaw = (yaw + degPerSec * mult * (dt || 1 / 60)) % 360;
      // Prefer dt-based sweep; fall back to elapsed for legacy callers that only pass time.
      if (dt === undefined || dt === null) {
        spotlightPivot.rotation.y = elapsed * ((degPerSec * Math.PI) / 180);
      } else {
        spotlightPivot.rotation.y = (yaw * Math.PI) / 180;
      }
      detectFlash = Math.max(0, detectFlash - (dt || 0.016) * 2.2);
      if (spotlightPivot.userData?.beamMat) {
        const hot = detectFlash > 0.02 || alarm;
        spotlightPivot.userData.beamMat.color?.set?.(hot ? 0xff3b2e : 0xffe08a);
        if (spotlightPivot.userData.beamMat.opacity != null) {
          spotlightPivot.userData.beamMat.opacity = hot ? 0.55 : 0.28;
        }
      }
    },
  };
}
