package com.shadowpalette.service;

import com.shadowpalette.dto.*;
import com.shadowpalette.strategy.CamouflageStrategyFactory;
import com.shadowpalette.util.StealthConstants;
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
    @DisplayName("RaidValidator: Undetected session log yields SILENT with 20% coin/ink loot")
    void testSilentRaidValidation() {
        List<SessionLogTickDto> ticks = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            ticks.add(SessionLogTickDto.builder().tick(i).xPos(i * 0.5).yPos(19.0).build());
        }

        RaidCompleteRequest request = RaidCompleteRequest.builder()
                .attackerId(12L)
                .defenderId(34L)
                .durationSeconds(20)
                .sessionLog(ticks)
                .clientReportedOutcome(ClientReportedOutcomeDto.builder().isDetected(false).outcome("SILENT").build())
                .build();

        // Defender holds 500 coins / 100 ink → 20% = 100 coins / 20 ink at SILENT 1.0×
        ValidatedOutcomeDto outcome = raidValidator.validateSession(request, "BLUE", 500, 100);

        assertFalse(outcome.isDetected());
        assertEquals("SILENT", outcome.getOutcome());
        assertEquals(100, outcome.getCoinsLooted());
        assertEquals(20, outcome.getInkLooted());
        assertEquals(0, outcome.getChipsAwarded());
    }

    @Test
    @DisplayName("RaidValidator: Detected session log yields ESCAPED with 1.5× loot multiplier")
    void testEscapedRaidValidation() {
        List<SessionLogTickDto> ticks = new ArrayList<>();
        ticks.add(SessionLogTickDto.builder().tick(60).xPos(10.0).yPos(5.0).build());

        RaidCompleteRequest request = RaidCompleteRequest.builder()
                .attackerId(12L)
                .defenderId(34L)
                .durationSeconds(30)
                .sessionLog(ticks)
                .clientReportedOutcome(ClientReportedOutcomeDto.builder().isDetected(true).outcome("ESCAPED").build())
                .build();

        ValidatedOutcomeDto outcome = raidValidator.validateSession(request, "BLUE", 500, 100);

        assertTrue(outcome.isDetected());
        assertEquals("ESCAPED", outcome.getOutcome());
        assertEquals(150, outcome.getCoinsLooted(), "Escaped awards 1.5× of 20% coins (500*0.2*1.5=150)");
        assertEquals(30, outcome.getInkLooted(), "Escaped awards 1.5× of 20% ink (100*0.2*1.5=30)");
    }

    @Test
    @DisplayName("RaidValidator: CAUGHT yields zero loot")
    void testCaughtYieldsZeroLoot() {
        ValidatedOutcomeDto outcome = raidValidator.award(true, true, 500, 100);
        assertEquals("CAUGHT", outcome.getOutcome());
        assertEquals(0, outcome.getCoinsLooted());
        assertEquals(0, outcome.getInkLooted());
    }

    @Test
    @DisplayName("RaidValidator: empty defender balances fall back to default pools")
    void testLootFallbackPools() {
        ValidatedOutcomeDto outcome = raidValidator.award(false, false, 0, 0);
        assertEquals("SILENT", outcome.getOutcome());
        assertEquals((int) Math.floor(StealthConstants.DEFENDER_COINS_FALLBACK * StealthConstants.RAID_LOOT_FRACTION),
                outcome.getCoinsLooted());
        assertEquals((int) Math.floor(StealthConstants.DEFENDER_INK_FALLBACK * StealthConstants.RAID_LOOT_FRACTION),
                outcome.getInkLooted());
    }

    @Test
    @DisplayName("StealthConstants: alarm escalation uses GDD +25% sweep")
    void testAlarmEscalationBaseline() {
        assertEquals(1.25, StealthConstants.alarmSweepMult(1), 0.001);
        assertEquals(1.25, StealthConstants.alarmSweepMult(3), 0.001);
        assertEquals(1.0, StealthConstants.alarmRangeBonus(1), 0.001);
    }
}
