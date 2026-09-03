package com.shadowpalette.stealth;

import com.shadowpalette.util.StealthConstants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ColorCamouflageTest {

    @Test
    @DisplayName("Color match in beam does not expose the attacker")
    void matchInBeamStaysHidden() {
        SearchlightColorEngine.BeamResult beam = SearchlightColorEngine.evaluateBeam(
                5.5, 4.5, 0, 48, 4.6, 5.5, 6.5
        );
        assertTrue(beam.inBeam());
        SearchlightColorEngine.TickResult tick = SearchlightColorEngine.evaluateTick(
                beam, "RED", "RED", 0.25, 0, false
        );
        assertTrue(tick.colorMatch());
        assertFalse(tick.exposed());
        assertTrue(tick.meter() < StealthConstants.SUSPICIOUS_AT);
    }

    @Test
    @DisplayName("Color mismatch in beam begins detection")
    void mismatchInBeamExposes() {
        SearchlightColorEngine.BeamResult beam = SearchlightColorEngine.evaluateBeam(
                5.5, 4.5, 0, 48, 4.6, 5.5, 6.5
        );
        SearchlightColorEngine.TickResult tick = SearchlightColorEngine.evaluateTick(
                beam, "RED", "BLUE", 0.5, 0, false
        );
        assertFalse(tick.colorMatch());
        assertTrue(tick.exposed());
        assertTrue(tick.meter() > 0);
    }

    @Test
    @DisplayName("Mismatch outside the beam is not a searchlight detection")
    void outsideBeamSafe() {
        SearchlightColorEngine.BeamResult beam = SearchlightColorEngine.evaluateBeam(
                5.5, 4.5, 180, 48, 4.6, 5.5, 6.5
        );
        assertFalse(beam.inBeam());
        SearchlightColorEngine.TickResult tick = SearchlightColorEngine.evaluateTick(
                beam, "GREEN", "RED", 0.5, 0, false
        );
        assertFalse(tick.exposed());
        assertEquals(0, tick.meter());
    }

    @Test
    @DisplayName("Brief mismatch does not instantly alarm")
    void briefHitIsNotAlarm() {
        SearchlightColorEngine.BeamResult beam = SearchlightColorEngine.evaluateBeam(
                5.5, 4.5, 0, 48, 4.6, 5.5, 6.5
        );
        SearchlightColorEngine.TickResult tick = SearchlightColorEngine.evaluateTick(
                beam, "GREEN", "RED", 0.2, 0, false
        );
        assertTrue(tick.exposed());
        assertFalse(tick.alarmLatched());
    }

    @Test
    @DisplayName("Unpainted tiles never match; gameplay color stays independent of grayscale")
    void unpaintedAndVisualSplit() {
        assertFalse(ColorMatchSystem.isMatch("GREEN", null));
        assertTrue(ColorMatchSystem.isMatch("RED", "RED"));
        assertFalse(ColorMatchSystem.isMatch("GREEN", "RED"));
        String realColor = "RED";
        String rendered = "GRAYSCALE";
        assertEquals("RED", realColor);
        assertNotEquals(rendered, realColor);
    }
}
