package com.shadowpalette.service;

import com.shadowpalette.dto.*;
import com.shadowpalette.strategy.CamouflageStrategyFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RaidValidatorTest {

    private RaidValidator raidValidator;

    @BeforeEach
    void setUp() {
        CamouflageStrategyFactory factory = new CamouflageStrategyFactory();
        raidValidator = new RaidValidator(factory);
    }

    @Test
    @DisplayName("RaidValidator: Undetected session log yields SILENT outcome with 1.0x loot")
    void testSilentRaidValidation() {
        List<SessionLogTickDto> ticks = new ArrayList<>();
        // Move along safe bottom border (y = 19.0) outside Lighthouse range
        for (int i = 0; i < 20; i++) {
            ticks.add(SessionLogTickDto.builder().tick(i).xPos(i * 0.5).yPos(19.0).build());
        }

        RaidCompleteRequest request = RaidCompleteRequest.builder()
                .attackerId(12L)
                .defenderId(34L)
                .durationSeconds(20)
                .sessionLog(ticks)
                .clientReportedOutcome(ClientReportedOutcomeDto.builder().isDetected(false).outcome("SILENT").chipsRequested(100).build())
                .build();

        ValidatedOutcomeDto outcome = raidValidator.validateSession(request, "BLUE", 200);

        assertFalse(outcome.isDetected());
        assertEquals("SILENT", outcome.getOutcome());
        assertEquals(100, outcome.getChipsAwarded());
    }

    @Test
    @DisplayName("RaidValidator: Detected session log yields ESCAPED outcome with 1.5x loot multiplier")
    void testEscapedRaidValidation() {
        List<SessionLogTickDto> ticks = new ArrayList<>();
        // Move into core zone of Lighthouse (10, 2) at tick 60 (beam angle 90 deg, pointing straight down at y=5)
        ticks.add(SessionLogTickDto.builder().tick(60).xPos(10.0).yPos(5.0).build());

        RaidCompleteRequest request = RaidCompleteRequest.builder()
                .attackerId(12L)
                .defenderId(34L)
                .durationSeconds(30)
                .sessionLog(ticks)
                .clientReportedOutcome(ClientReportedOutcomeDto.builder().isDetected(true).outcome("ESCAPED").chipsRequested(100).build())
                .build();

        ValidatedOutcomeDto outcome = raidValidator.validateSession(request, "BLUE", 200);

        assertTrue(outcome.isDetected());
        assertEquals("ESCAPED", outcome.getOutcome());
        assertEquals(150, outcome.getChipsAwarded(), "Escaped outcome awards 1.5x requested chips (100 * 1.5 = 150)");
    }
}
