package com.shadowpalette.service;

import com.shadowpalette.dto.*;
import com.shadowpalette.observer.DetectionEvent;
import com.shadowpalette.strategy.CamouflageStrategyFactory;
import com.shadowpalette.strategy.LootCalculationStrategy;
import com.shadowpalette.util.StealthConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RaidValidatorTest {

    private RaidValidator raidValidator;
    private LootCalculationStrategy lootStrategy;

    @BeforeEach
    void setUp() {
        CamouflageStrategyFactory factory = new CamouflageStrategyFactory();
        lootStrategy = new LootCalculationStrategy();
        raidValidator = new RaidValidator(factory, lootStrategy);
    }

    private List<SessionLogTickDto> stationaryGateChannel(int frames) {
        List<SessionLogTickDto> ticks = new ArrayList<>();
        // tick index = frame #; log every 8 frames like the client
        for (int f = 8; f <= frames; f += 8) {
            ticks.add(SessionLogTickDto.builder()
                    .tick(f)
                    .xPos(StealthConstants.GATE_X)
                    .yPos(StealthConstants.GATE_Y)
                    .build());
        }
        return ticks;
    }

    @Test
    @DisplayName("Extraction channel at gate → SILENT with greed loot")
    void testSilentExtractionChannel() {
        // 4s * 60fps = 240 frames → enough samples for CHANNEL_DURATION
        List<SessionLogTickDto> ticks = stationaryGateChannel(280);
        RaidCompleteRequest request = RaidCompleteRequest.builder()
                .attackerId(12L)
                .defenderId(34L)
                .durationSeconds(40)
                .sessionLog(ticks)
                .clientReportedOutcome(ClientReportedOutcomeDto.builder().isDetected(false).outcome("SILENT").build())
                .build();

        ValidatedOutcomeDto outcome = raidValidator.validateSession(request, "BLUE", 500, 100);

        assertFalse(outcome.isDetected());
        assertEquals("SILENT", outcome.getOutcome());
        // 40s → 4 intervals * 5% = 20% of 500/100
        assertEquals(100, outcome.getCoinsLooted());
        assertEquals(20, outcome.getInkLooted());
    }

    @Test
    @DisplayName("No extraction channel → INCOMPLETE with zero loot")
    void testIncompleteWithoutChannel() {
        List<SessionLogTickDto> ticks = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            ticks.add(SessionLogTickDto.builder().tick(i * 8).xPos(10.0).yPos(10.0).build());
        }
        RaidCompleteRequest request = RaidCompleteRequest.builder()
                .attackerId(12L)
                .defenderId(34L)
                .durationSeconds(30)
                .sessionLog(ticks)
                .build();

        ValidatedOutcomeDto outcome = raidValidator.validateSession(request, "BLUE", 500, 100);
        assertEquals("INCOMPLETE", outcome.getOutcome());
        assertEquals(0, outcome.getCoinsLooted());
        assertEquals(0, outcome.getInkLooted());
    }

    @Test
    @DisplayName("Channel interrupted by movement → INCOMPLETE")
    void testChannelInterruptedByMovement() {
        List<SessionLogTickDto> ticks = new ArrayList<>();
        for (int f = 8; f <= 120; f += 8) {
            // oscillate away from gate — never hold still long enough
            double x = StealthConstants.GATE_X + (f % 16 == 0 ? 0 : 1.2);
            ticks.add(SessionLogTickDto.builder().tick(f).xPos(x).yPos(StealthConstants.GATE_Y).build());
        }
        RaidCompleteRequest request = RaidCompleteRequest.builder()
                .attackerId(12L)
                .defenderId(34L)
                .durationSeconds(20)
                .sessionLog(ticks)
                .build();

        ValidatedOutcomeDto outcome = raidValidator.validateSession(request, "BLUE", 500, 100);
        assertEquals("INCOMPLETE", outcome.getOutcome());
        assertEquals(0, outcome.getCoinsLooted());
    }

    @Test
    @DisplayName("CAUGHT yields zero loot")
    void testCaughtYieldsZeroLoot() {
        ValidatedOutcomeDto outcome = raidValidator.award(true, true, 500, 100);
        assertEquals("CAUGHT", outcome.getOutcome());
        assertEquals(0, outcome.getCoinsLooted());
        assertEquals(0, outcome.getInkLooted());
    }

    @Test
    @DisplayName("LootCalculationStrategy caps at MAX_LOOT_PERCENT")
    void testLootCap() {
        double pct = lootStrategy.accumulatedLootPercent(999);
        assertEquals(StealthConstants.MAX_LOOT_PERCENT, pct, 0.0001);
        var loot = lootStrategy.compute(999, 1000, 200, "SILENT");
        assertEquals(450, loot.coinsLooted());
        assertEquals(90, loot.inkLooted());
    }

    @Test
    @DisplayName("ESCAPED multiplies greed loot by 1.5×")
    void testEscapedMultiplier() {
        var loot = lootStrategy.compute(40, 500, 100, "ESCAPED");
        assertEquals(150, loot.coinsLooted());
        assertEquals(30, loot.inkLooted());
    }

    @Test
    @DisplayName("INCOMPLETE / CAUGHT zero the loot multiplier")
    void testIncompleteZeroLoot() {
        assertEquals(0, lootStrategy.compute(40, 500, 100, "INCOMPLETE").coinsLooted());
        assertEquals(0, lootStrategy.compute(40, 500, 100, "CAUGHT").inkLooted());
    }

    @Test
    @DisplayName("Difficulty constants: rise up, fall down, shorter suspicious grace")
    void testDifficultyConstants() {
        assertEquals(41, StealthConstants.METER_RISE_PER_SEC, 0.001);
        assertEquals(15, StealthConstants.METER_FALL_PER_SEC, 0.001);
        assertEquals(7, StealthConstants.MATCH_METER_FALL_PER_SEC, 0.001);
        assertEquals(34, StealthConstants.COLOR_MATCH_BONUS);
        assertEquals(16, StealthConstants.SHADOW_TILE_BONUS);
        assertEquals(2, StealthConstants.SUSPICIOUS_TICKS_TO_ALERT);
    }

    @Test
    @DisplayName("Alarm escalation scales with searchlight tier")
    void testAlarmEscalationByLevel() {
        assertEquals(1.25, StealthConstants.alarmSweepMult(1), 0.001);
        assertEquals(1.4, StealthConstants.alarmSweepMult(2), 0.001);
        assertEquals(1.55, StealthConstants.alarmSweepMult(3), 0.001);
        assertTrue(StealthConstants.alarmRangeBonus(3) > StealthConstants.alarmRangeBonus(1));
    }

    @Test
    @DisplayName("Risk escalation stacks onto meter rise")
    void testRiskEscalation() {
        assertEquals(41, StealthConstants.effectiveMeterRisePerSec(0), 0.001);
        assertEquals(45, StealthConstants.effectiveMeterRisePerSec(30), 0.001);
        assertEquals(49, StealthConstants.effectiveMeterRisePerSec(60), 0.001);
    }

    @Test
    @DisplayName("Beam range grows per second from START_RATIO and caps at MAX_RATIO")
    void testBeamRangeGrowth() {
        double configured = StealthConstants.SEARCHLIGHT_RANGE;
        assertEquals(
                StealthConstants.BEAM_RANGE_START_RATIO * configured,
                StealthConstants.effectiveBeamRangeTiles(configured, 0, 0),
                0.0001
        );
        assertEquals(
                StealthConstants.BEAM_RANGE_START_RATIO,
                StealthConstants.beamRangeRatio(0),
                0.0001
        );
        // Smooth per-second growth
        double at10 = StealthConstants.BEAM_RANGE_START_RATIO
                + 10 * StealthConstants.BEAM_RANGE_GROWTH_PER_SECOND;
        assertEquals(at10, StealthConstants.beamRangeRatio(10), 0.0001);
        assertEquals(at10 * configured, StealthConstants.effectiveBeamRangeTiles(configured, 10, 0), 0.0001);
        // Long session caps at MAX
        assertEquals(StealthConstants.BEAM_RANGE_MAX_RATIO, StealthConstants.beamRangeRatio(999), 0.0001);
        assertEquals(
                StealthConstants.BEAM_RANGE_MAX_RATIO * configured,
                StealthConstants.effectiveBeamRangeTiles(configured, 999, 0),
                0.0001
        );
        // Alarm bonus is additive, not ratio-scaled
        double bonus = StealthConstants.alarmRangeBonus(1);
        assertEquals(
                at10 * configured + bonus,
                StealthConstants.effectiveBeamRangeTiles(configured, 10, bonus),
                0.0001
        );
    }

    @Test
    @DisplayName("Robot chase speed stays above walk")
    void testRobotChaseAboveWalk() {
        assertTrue(StealthConstants.ROBOT_CHASE_SPEED > StealthConstants.PLAYER_WALK_SPEED);
        assertEquals(4.5, StealthConstants.ROBOT_CHASE_SPEED, 0.001);
        assertEquals(4.5, StealthConstants.ROBOT_HIT_SPEED, 0.001);
    }

    @Test
    @DisplayName("CORE_ZONE enters CHASING on the first processDetection tick")
    void testInstantChaseOnCoreZone() {
        com.shadowpalette.state.PatrolRobotContext robot = new com.shadowpalette.state.PatrolRobotContext();
        assertEquals("PATROL", robot.getCurrentStateName());
        robot.processDetection(DetectionEvent.builder()
                .playerX(6.0)
                .playerY(5.0)
                .reason("CORE_ZONE")
                .build());
        assertEquals("CHASING", robot.getCurrentStateName());
        assertEquals(6.0, robot.getLastSeenPlayerX(), 0.001);
        assertEquals(5.0, robot.getLastSeenPlayerY(), 0.001);
    }

    @Test
    @DisplayName("Mismatch under beam latches alarm instantly; range grows into farther tiles")
    void testExposureAlarmWithGrownRange() {
        double range = StealthConstants.effectiveBeamRangeTiles(StealthConstants.SEARCHLIGHT_RANGE, 0, 0);
        double px = StealthConstants.SEARCHLIGHT_X;
        double py = StealthConstants.SEARCHLIGHT_Y + range * 0.5;

        var beam = com.shadowpalette.stealth.SearchlightColorEngine.evaluateBeam(
                StealthConstants.SEARCHLIGHT_X,
                StealthConstants.SEARCHLIGHT_Y,
                0,
                StealthConstants.SEARCHLIGHT_CONE,
                range,
                px,
                py
        );
        assertTrue(beam.inBeam());

        var tick = com.shadowpalette.stealth.SearchlightColorEngine.evaluateTick(
                beam, "RED", "BLUE", 0.016, 0, false, 0
        );
        assertTrue(tick.exposed());
        assertTrue(tick.alarmLatched());
        assertEquals(StealthConstants.ALARM_AT, tick.meter(), 0.001);

        // Farther than start range at t=0…
        double pastStart = StealthConstants.SEARCHLIGHT_RANGE * 0.95;
        double earlyPx = StealthConstants.SEARCHLIGHT_X;
        double earlyPy = StealthConstants.SEARCHLIGHT_Y + pastStart;
        var outsideEarly = com.shadowpalette.stealth.SearchlightColorEngine.evaluateBeam(
                StealthConstants.SEARCHLIGHT_X,
                StealthConstants.SEARCHLIGHT_Y,
                0,
                StealthConstants.SEARCHLIGHT_CONE,
                StealthConstants.effectiveBeamRangeTiles(StealthConstants.SEARCHLIGHT_RANGE, 0, 0),
                earlyPx,
                earlyPy
        );
        assertFalse(outsideEarly.inBeam());

        // …inside once continuous growth reaches full configured range (~75s)
        var insideLate = com.shadowpalette.stealth.SearchlightColorEngine.evaluateBeam(
                StealthConstants.SEARCHLIGHT_X,
                StealthConstants.SEARCHLIGHT_Y,
                0,
                StealthConstants.SEARCHLIGHT_CONE,
                StealthConstants.effectiveBeamRangeTiles(StealthConstants.SEARCHLIGHT_RANGE, 75, 0),
                earlyPx,
                earlyPy
        );
        assertTrue(insideLate.inBeam());
    }
}
