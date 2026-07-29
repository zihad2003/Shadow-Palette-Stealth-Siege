package com.shadowpalette.stealth;

import com.shadowpalette.strategy.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LighthouseDetectionEngineTest {

    @Test
    @DisplayName("Strategy Pattern: Concrete strategies return correct luminance bands")
    void testStrategyPatternLuminanceBands() {
        CamouflageStrategy white = new WhiteStrategy();
        CamouflageStrategy yellow = new YellowStrategy();
        CamouflageStrategy green = new GreenStrategy();
        CamouflageStrategy red = new RedStrategy();
        CamouflageStrategy blue = new BlueStrategy();

        assertEquals(5, white.getLuminanceBand());
        assertEquals(4, yellow.getLuminanceBand());
        assertEquals(3, green.getLuminanceBand());
        assertEquals(2, red.getLuminanceBand());
        assertEquals(1, blue.getLuminanceBand());

        assertTrue(blue.matchesSurrounding(1));
        assertFalse(blue.matchesSurrounding(3));
    }

    @Test
    @DisplayName("Lighthouse Engine: Player in Core Zone is ALWAYS detected")
    void testCoreZoneAlwaysDetects() {
        // Lighthouse at (10, 2), beam pointing 90 deg (straight down), coneAngle = 60 deg, range = 7 tiles
        // Core zone half angle = 18 deg
        // Player at (10, 5) -> angle = 90 deg, diff = 0 deg -> Core Zone!
        DetectionResult result = LighthouseDetectionEngine.evaluateDetection(
                10.0, 2.0,
                90.0, 60.0, 7.0,
                10.0, 5.0,
                1, 1 // Same shade (Blue)
        );

        assertTrue(result.isDetected(), "Core zone must detect even when shade matches");
        assertTrue(result.isInCoreZone());
        assertEquals("CORE_ZONE", result.getReason());
    }

    @Test
    @DisplayName("Lighthouse Engine: Player in Edge Zone WITH matching shade is SAFE")
    void testEdgeZoneMatchingShadeIsSafe() {
        // Lighthouse at (10, 2), beam pointing 90 deg
        // Player at (12, 5) -> distance ~ 3.6, angle ~ 56.3 deg -> angle diff ~ 33.7 deg -> Edge Zone (between 18 and 30 deg)!
        // Let's place player so angle diff is 25 deg (Edge zone)
        // Lighthouse at (0, 0), beam pointing 0 deg
        // Player at (4, 1.86) -> angle = 25 deg -> Edge Zone (core half = 18 deg, full half = 30 deg)
        DetectionResult result = LighthouseDetectionEngine.evaluateDetection(
                0.0, 0.0,
                0.0, 60.0, 7.0,
                4.0, 1.86,
                3, 3 // Matching shade (Green Band 3)
        );

        assertFalse(result.isDetected(), "Edge zone with matching shade must be SAFE");
        assertTrue(result.isInEdgeZone());
        assertEquals("SAFE_EDGE_ZONE_MATCH", result.getReason());
    }

    @Test
    @DisplayName("Lighthouse Engine: Player in Edge Zone WITH mismatched shade is DETECTED")
    void testEdgeZoneMismatchedShadeIsDetected() {
        // Player in Edge Zone (angle diff = 25 deg), but player shade is 5 (White) and surrounding shade is 1 (Blue)
        DetectionResult result = LighthouseDetectionEngine.evaluateDetection(
                0.0, 0.0,
                0.0, 60.0, 7.0,
                4.0, 1.86,
                5, 1 // Mismatched shade (White vs Blue)
        );

        assertTrue(result.isDetected(), "Edge zone with mismatched shade must be DETECTED");
        assertTrue(result.isInEdgeZone());
        assertEquals("EDGE_ZONE_MISMATCH", result.getReason());
    }

    @Test
    @DisplayName("Lighthouse Engine: Player outside cone or range is SAFE")
    void testOutsideConeAndRange() {
        // Player outside range (10 tiles > 7 tiles)
        DetectionResult rangeResult = LighthouseDetectionEngine.evaluateDetection(
                0.0, 0.0,
                0.0, 60.0, 7.0,
                10.0, 0.0,
                1, 5
        );
        assertFalse(rangeResult.isDetected());
        assertEquals("OUTSIDE_RANGE", rangeResult.getReason());

        // Player outside cone angle (diff = 45 deg > 30 deg)
        DetectionResult coneResult = LighthouseDetectionEngine.evaluateDetection(
                0.0, 0.0,
                0.0, 60.0, 7.0,
                3.0, 3.0,
                1, 5
        );
        assertFalse(coneResult.isDetected());
        assertEquals("OUTSIDE_CONE", coneResult.getReason());
    }
}
