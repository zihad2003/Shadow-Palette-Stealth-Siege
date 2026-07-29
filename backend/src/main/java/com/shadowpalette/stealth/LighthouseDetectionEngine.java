package com.shadowpalette.stealth;

public class LighthouseDetectionEngine {

    /**
     * Evaluates stealth detection of a player against a Lighthouse spotlight beam.
     *
     * @param lhX Lighthouse tile X coordinate
     * @param lhY Lighthouse tile Y coordinate
     * @param beamAngleDeg Current center beam angle in degrees (0 to 360)
     * @param coneAngleDeg Total spotlight cone angle (e.g. 60 degrees)
     * @param coneRangeTiles Spotlight beam range in tiles (e.g. 7.0 tiles)
     * @param playerX Player tile X coordinate
     * @param playerY Player tile Y coordinate
     * @param playerBand Player camouflage luminance band (1 to 5)
     * @param surroundingBand Surrounding surface luminance band (1 to 5)
     * @return DetectionResult containing boolean state and detection reason
     */
    public static DetectionResult evaluateDetection(
            double lhX, double lhY,
            double beamAngleDeg,
            double coneAngleDeg,
            double coneRangeTiles,
            double playerX, double playerY,
            int playerBand,
            int surroundingBand
    ) {
        double dx = playerX - lhX;
        double dy = playerY - lhY;
        double distance = Math.hypot(dx, dy);

        // Distance Check
        if (distance > coneRangeTiles) {
            return DetectionResult.builder()
                    .isDetected(false)
                    .inCoreZone(false)
                    .inEdgeZone(false)
                    .reason("OUTSIDE_RANGE")
                    .build();
        }

        // Angle Check
        double playerAngleDeg = Math.toDegrees(Math.atan2(dy, dx));
        double angleDiffDeg = Math.abs(normalizeAngleDiff(playerAngleDeg - beamAngleDeg));

        double halfConeAngle = coneAngleDeg / 2.0;

        if (angleDiffDeg > halfConeAngle) {
            return DetectionResult.builder()
                    .isDetected(false)
                    .inCoreZone(false)
                    .inEdgeZone(false)
                    .reason("OUTSIDE_CONE")
                    .build();
        }

        // Core Zone vs Edge Zone
        // Core Zone = Inner 60% of cone angle
        double coreHalfAngle = (coneAngleDeg * 0.60) / 2.0;

        if (angleDiffDeg <= coreHalfAngle) {
            // Core Zone Always Detects
            return DetectionResult.builder()
                    .isDetected(true)
                    .inCoreZone(true)
                    .inEdgeZone(false)
                    .reason("CORE_ZONE")
                    .build();
        } else {
            // Edge Zone: Detects UNLESS shade matches
            boolean isMatch = (playerBand == surroundingBand);
            return DetectionResult.builder()
                    .isDetected(!isMatch)
                    .inCoreZone(false)
                    .inEdgeZone(true)
                    .reason(isMatch ? "SAFE_EDGE_ZONE_MATCH" : "EDGE_ZONE_MISMATCH")
                    .build();
        }
    }

    private static double normalizeAngleDiff(double diff) {
        while (diff > 180.0) diff -= 360.0;
        while (diff < -180.0) diff += 360.0;
        return diff;
    }
}
