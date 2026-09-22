/** Sprint tuning shared by base walk + raid. */
export const SPRINT_SPEED_MULT = 1.9;
/** Full bar lasts this many seconds of sprinting. */
export const SPRINT_SECONDS = 10;
/** Seconds to refill from empty. */
export const SPRINT_REGEN_SECONDS = 8;
/** Pause before regen starts after releasing sprint. */
export const SPRINT_REGEN_DELAY = 0.7;
/** Need at least this much to start a fresh sprint (avoids stutter). */
export const SPRINT_MIN_START = 0.2;
/** After hitting zero, stay winded until refilled to this level. */
export const SPRINT_RECOVER_AT = 0.35;

export function createSprintMeter() {
  const st = { stamina: 1, sprinting: false, exhausted: false, delay: 0 };

  return {
    get state() {
      return st;
    },
    /**
     * @param {number} dt seconds
     * @param {boolean} wantsSprint Shift held
     * @param {boolean} moving forward/back input active
     */
    tick(dt, wantsSprint, moving) {
      const canStart = st.sprinting || st.stamina > SPRINT_MIN_START;
      if (wantsSprint && moving && !st.exhausted && canStart) {
        st.sprinting = true;
        st.delay = SPRINT_REGEN_DELAY;
        st.stamina -= dt / SPRINT_SECONDS;
        if (st.stamina <= 0) {
          st.stamina = 0;
          st.sprinting = false;
          st.exhausted = true;
        }
      } else {
        st.sprinting = false;
        if (st.delay > 0) {
          st.delay -= dt;
        } else if (st.stamina < 1) {
          st.stamina = Math.min(1, st.stamina + dt / SPRINT_REGEN_SECONDS);
        }
        if (st.exhausted && st.stamina >= SPRINT_RECOVER_AT) st.exhausted = false;
      }
      return st;
    },
  };
}
