package com.shadowpalette.util;

/** Keep numerically identical to frontend/src/raid/stealthConstants.js */
public final class StealthConstants {
    public static final int BASE_VISIBILITY = 100;
    /** Camo alone must not guarantee a hide — shaved ~15%. */
    public static final int COLOR_MATCH_BONUS = 34;
    public static final int SHADOW_TILE_BONUS = 16;
    /** +14% rise / −17% fall vs prior 36/18 — detection builds faster, forgives less. */
    public static final double METER_RISE_PER_SEC = 41;
    public static final double METER_FALL_PER_SEC = 15;
    public static final double MATCH_METER_FALL_PER_SEC = 7;
    public static final double SUSPICIOUS_AT = 25;
    public static final double ALERT_AT = 55;
    public static final double ALARM_AT = 100;

    public static final int RAID_DURATION_SECONDS = 150;

    /** Edge-zone mismatches in SuspiciousState before Alert (tightened from 3). */
    public static final int SUSPICIOUS_TICKS_TO_ALERT = 2;

    public static final int DEFENDER_COINS_FALLBACK = 200;
    public static final int DEFENDER_INK_FALLBACK = 50;

    /** South-gate extraction (48×40 board GATE_SPAWN_TILE). */
    public static final double GATE_X = 24.0;
    public static final double GATE_Y = 39.0;
    public static final double EXTRACTION_RADIUS = 1.75;
    public static final double CHANNEL_DURATION_SECONDS = 4.0;
    public static final double CHANNEL_MOVE_EPSILON = 0.22;
    public static final double CHASE_INTERRUPT_DISTANCE = 2.5;
    /** Session-log tick index is frame-based. */
    public static final double SESSION_TICKS_PER_SECOND = 60.0;

    public static final int RISK_ESCALATION_INTERVAL_SECONDS = 30;
    public static final double RISK_ESCALATION_PER_INTERVAL = 4.0;

    /**
     * Beam range grows continuously while the attacker stays in the base.
     * effectiveRange = configuredRange * rangeRatio + alarmBonus (bonus not ratio-scaled).
     */
    public static final double BEAM_RANGE_START_RATIO = 0.55;
    /** ~0.55 → 1.0 in ~37.5s (synced with FE). */
    public static final double BEAM_RANGE_GROWTH_PER_SECOND = 0.012;
    public static final double BEAM_RANGE_MAX_RATIO = 1.0;

    /** Patrol chase — a hair above walk; sprint still escapes. Synced with FE. */
    public static final double ROBOT_CHASE_SPEED = 3.95;
    public static final double ROBOT_HIT_SPEED = 4.15;
    /** Reference walk ≈ 1 / WALK_TILE_SECONDS on the frontend. */
    public static final double PLAYER_WALK_SPEED = 3.68;
    public static final double ROBOT_CATCH_DISTANCE = 0.65;
    public static final double ROBOT_CATCH_HOLD_SECONDS = 0.28;

    public static final int LOOT_INTERVAL_SECONDS = 10;
    public static final double LOOT_PERCENT_PER_INTERVAL = 0.05;
    public static final double MAX_LOOT_PERCENT = 0.45;

    /** @deprecated Prefer LOOT_* timer loot. */
    @Deprecated
    public static final double RAID_LOOT_FRACTION = MAX_LOOT_PERCENT;

    public static final double SEARCHLIGHT_X = 23.5;
    public static final double SEARCHLIGHT_Y = 19.5;
    public static final double SEARCHLIGHT_CONE = 48;
    public static final double SEARCHLIGHT_RANGE = 4.6;
    public static final double SEARCHLIGHT_SWEEP_DEG = 38;

    private StealthConstants() {}

    /** Alarm sweep multiplier — base +25%, then scales with searchlight tier. */
    public static double alarmSweepMult(int level) {
        int lv = clampLevel(level);
        return 1.25 + (lv - 1) * 0.15;
    }

    /** Extra cone tiles while alarmed — scales with searchlight tier. */
    public static double alarmRangeBonus(int level) {
        int lv = clampLevel(level);
        return 1.0 + lv * 0.6;
    }

    public static int clampLevel(int level) {
        if (level < 1) return 1;
        if (level > 3) return 3;
        return level;
    }

    public static double effectiveMeterRisePerSec(double elapsedSeconds) {
        int intervals = (int) Math.floor(Math.max(0, elapsedSeconds) / RISK_ESCALATION_INTERVAL_SECONDS);
        return METER_RISE_PER_SEC + intervals * RISK_ESCALATION_PER_INTERVAL;
    }

    /** Multiplier applied to configured searchlight range from raid elapsed time. */
    public static double beamRangeRatio(double elapsedSeconds) {
        double elapsed = Math.max(0, elapsedSeconds);
        return Math.min(
                BEAM_RANGE_MAX_RATIO,
                BEAM_RANGE_START_RATIO + elapsed * BEAM_RANGE_GROWTH_PER_SECOND
        );
    }

    /**
     * Live cone range: time-grown base + optional alarm bonus (never ratio-scaled).
     */
    public static double effectiveBeamRangeTiles(double configuredRange, double elapsedSeconds, double alarmRangeBonus) {
        return configuredRange * beamRangeRatio(elapsedSeconds) + alarmRangeBonus;
    }
}
