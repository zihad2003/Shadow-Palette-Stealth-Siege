package com.shadowpalette.util;

/** Keep numerically identical to frontend/src/raid/stealthConstants.js */
public final class StealthConstants {
    public static final int BASE_VISIBILITY = 100;
    public static final int COLOR_MATCH_BONUS = 40;
    public static final int SHADOW_TILE_BONUS = 20;
    public static final double METER_RISE_PER_SEC = 36;
    public static final double METER_FALL_PER_SEC = 18;
    public static final double MATCH_METER_FALL_PER_SEC = 8;
    public static final double SUSPICIOUS_AT = 25;
    public static final double ALERT_AT = 55;
    public static final double ALARM_AT = 100;

    public static final int RAID_DURATION_SECONDS = 150;

    /** Edge-zone mismatches in SuspiciousState before Alert (GDD §8). */
    public static final int SUSPICIOUS_TICKS_TO_ALERT = 3;

    /** Max fraction of defender coins / ink stealable during a raid. */
    public static final double RAID_LOOT_FRACTION = 0.20;
    public static final int DEFENDER_COINS_FALLBACK = 200;
    public static final int DEFENDER_INK_FALLBACK = 50;

    public static final double SEARCHLIGHT_X = 5.5;
    public static final double SEARCHLIGHT_Y = 4.5;
    public static final double SEARCHLIGHT_CONE = 48;
    public static final double SEARCHLIGHT_RANGE = 4.6;
    public static final double SEARCHLIGHT_SWEEP_DEG = 38;

    private StealthConstants() {}

    /** Alarm sweep multiplier (GDD §9 +25%). */
    public static double alarmSweepMult(int level) {
        return 1.25;
    }

    /** Extra cone tiles while alarmed. */
    public static double alarmRangeBonus(int level) {
        return 1.0;
    }

    public static int clampLevel(int level) {
        if (level < 1) return 1;
        if (level > 3) return 3;
        return level;
    }
}
