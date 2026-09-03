package com.shadowpalette.stealth;

import com.shadowpalette.util.StealthConstants;

public final class SearchlightColorEngine {

    private SearchlightColorEngine() {}

    public static BeamResult evaluateBeam(
            double lightX, double lightY,
            double beamAngleDeg, double coneAngleDeg, double coneRangeTiles,
            double playerX, double playerY
    ) {
        double dx = playerX - lightX;
        double dy = playerY - lightY;
        double distance = Math.hypot(dx, dy);
        if (distance > coneRangeTiles) {
            return new BeamResult(false, false, "OUTSIDE_RANGE");
        }
        double playerAngleDeg = Math.toDegrees(Math.atan2(dx, dy));
        double angleDiff = Math.abs(normalizeAngleDiff(playerAngleDeg - beamAngleDeg));
        if (angleDiff > coneAngleDeg / 2.0) {
            return new BeamResult(true, false, "OUTSIDE_CONE");
        }
        return new BeamResult(true, true, "IN_BEAM");
    }

    public static int computeStealthScore(boolean colorMatch, boolean shadowTile) {
        int score = StealthConstants.BASE_VISIBILITY;
        if (colorMatch) score -= StealthConstants.COLOR_MATCH_BONUS;
        if (shadowTile) score -= StealthConstants.SHADOW_TILE_BONUS;
        return Math.max(0, score);
    }

    public static TickResult evaluateTick(
            BeamResult beam,
            String attackerColor,
            String tileColor,
            double dt,
            double meter,
            boolean alarmLatched
    ) {
        boolean match = ColorMatchSystem.isMatch(attackerColor, tileColor);
        boolean exposed = beam.inBeam() && !match;
        int stealthScore = computeStealthScore(match, false);
        double next = meter;
        if (alarmLatched) {
            next = Math.max(meter, StealthConstants.ALARM_AT);
        } else if (exposed) {
            next = meter + StealthConstants.METER_RISE_PER_SEC * (stealthScore / (double) StealthConstants.BASE_VISIBILITY) * dt;
        } else if (beam.inBeam() && match) {
            next = meter - StealthConstants.MATCH_METER_FALL_PER_SEC * dt;
        } else {
            next = meter - StealthConstants.METER_FALL_PER_SEC * dt;
        }
        next = Math.max(0, Math.min(StealthConstants.ALARM_AT, next));
        boolean alarm = alarmLatched || next >= StealthConstants.ALARM_AT;
        String reason = !beam.inBeam() ? beam.reason() : (match ? "CAMOUFLAGE_MATCH" : "COLOR_MISMATCH");
        return new TickResult(beam.inBeam(), match, exposed, stealthScore, next, alarm, reason);
    }

    private static double normalizeAngleDiff(double diff) {
        double d = diff;
        while (d > 180) d -= 360;
        while (d < -180) d += 360;
        return d;
    }

    public record BeamResult(boolean inRange, boolean inBeam, String reason) {}

    public record TickResult(
            boolean inBeam,
            boolean colorMatch,
            boolean exposed,
            int stealthScore,
            double meter,
            boolean alarmLatched,
            String reason
    ) {}
}
