package com.shadowpalette.service;

import com.shadowpalette.dto.RaidCompleteRequest;
import com.shadowpalette.dto.SessionLogTickDto;
import com.shadowpalette.dto.ValidatedOutcomeDto;
import com.shadowpalette.dto.WallBreakEventDto;
import com.shadowpalette.observer.DetectionEvent;
import com.shadowpalette.state.PatrolRobotContext;
import com.shadowpalette.stealth.DetectionResult;
import com.shadowpalette.stealth.LighthouseDetectionEngine;
import com.shadowpalette.stealth.SearchlightColorEngine;
import com.shadowpalette.strategy.CamouflageStrategyFactory;
import com.shadowpalette.strategy.LootCalculationStrategy;
import com.shadowpalette.util.Colors;
import com.shadowpalette.util.StealthConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RaidValidator {

    private final CamouflageStrategyFactory strategyFactory;
    private final LootCalculationStrategy lootCalculationStrategy;

    /**
     * Replays the client's session log ticks against detection rules and extraction channel.
     * SILENT / ESCAPED require a completed uninterrupted gate channel (or wall-break when alarmed).
     */
    public ValidatedOutcomeDto validateSession(
            RaidCompleteRequest request,
            String attackerCamoColor,
            int defenderCoins,
            int defenderInk
    ) {
        if (request.getLockedCamoColor() != null && request.getTileColors() != null) {
            return validateColorCamoSession(request, attackerCamoColor, defenderCoins, defenderInk);
        }
        int playerBand = strategyFactory.getLuminanceBandForColor(attackerCamoColor);
        int surroundingBand = 3;
        int lightLevel = StealthConstants.clampLevel(
                request.getSearchlightLevel() == null ? 1 : request.getSearchlightLevel()
        );

        List<SessionLogTickDto> ticks = request.getSessionLog();
        boolean isDetected = false;
        boolean isCaught = false;
        boolean extractionComplete = false;
        double channelAccum = 0;
        Integer prevTick = null;
        Double prevX = null;
        Double prevY = null;

        PatrolRobotContext robotContext = new PatrolRobotContext();

        double lhX = 10.0;
        double lhY = 2.0;
        double coneAngle = 60.0;
        double sweepSpeedMult = 1.0;

        if (ticks != null && !ticks.isEmpty()) {
            for (SessionLogTickDto tickDto : ticks) {
                int tick = tickDto.getTick();
                double px = tickDto.getXPos();
                double py = tickDto.getYPos();
                double dt = prevTick == null
                        ? 1.0 / StealthConstants.SESSION_TICKS_PER_SECOND
                        : Math.max(1.0 / StealthConstants.SESSION_TICKS_PER_SECOND,
                        (tick - prevTick) / StealthConstants.SESSION_TICKS_PER_SECOND);
                double elapsed = tick / StealthConstants.SESSION_TICKS_PER_SECOND;
                double coneRange = StealthConstants.effectiveBeamRangeTiles(
                        7.0,
                        elapsed,
                        isDetected ? StealthConstants.alarmRangeBonus(lightLevel) : 0.0
                );
                if (isDetected) {
                    sweepSpeedMult = StealthConstants.alarmSweepMult(lightLevel);
                }

                double beamAngleDeg = (tick * (360.0 / 240.0) * sweepSpeedMult) % 360.0;

                DetectionResult result = LighthouseDetectionEngine.evaluateDetection(
                        lhX, lhY, beamAngleDeg, coneAngle, coneRange, px, py, playerBand, surroundingBand
                );

                if (result.isDetected()) {
                    isDetected = true;
                }

                DetectionEvent event = DetectionEvent.builder()
                        .playerX(px)
                        .playerY(py)
                        .reason(result.getReason())
                        .timestamp(tick)
                        .build();
                robotContext.processDetection(event);

                boolean robotNear = false;
                if ("CHASING".equals(robotContext.getCurrentStateName())) {
                    double robotDist = Math.hypot(px - robotContext.getX(), py - robotContext.getY());
                    robotNear = robotDist <= StealthConstants.CHASE_INTERRUPT_DISTANCE;
                    if (robotDist <= StealthConstants.ROBOT_CATCH_DISTANCE) {
                        isCaught = true;
                        break;
                    }
                }

                boolean inZone = Math.hypot(px - StealthConstants.GATE_X, py - StealthConstants.GATE_Y)
                        <= StealthConstants.EXTRACTION_RADIUS;
                boolean moved = prevX != null
                        && Math.hypot(px - prevX, py - prevY) > StealthConstants.CHANNEL_MOVE_EPSILON;
                boolean beamHit = result.isDetected();

                if (inZone && !moved && !robotNear && !beamHit) {
                    channelAccum += dt;
                    if (channelAccum >= StealthConstants.CHANNEL_DURATION_SECONDS) {
                        extractionComplete = true;
                    }
                } else {
                    channelAccum = 0;
                }

                prevTick = tick;
                prevX = px;
                prevY = py;
            }
        }

        boolean wallEscape = hasCompletedWallBreak(request) && isDetected;
        boolean survivedFullRaid = request.getDurationSeconds() != null
                && request.getDurationSeconds() >= StealthConstants.RAID_DURATION_SECONDS;
        return award(isCaught, isDetected, extractionComplete || wallEscape || survivedFullRaid, defenderCoins, defenderInk,
                request.getDurationSeconds());
    }

    private ValidatedOutcomeDto validateColorCamoSession(
            RaidCompleteRequest request,
            String attackerCamoColor,
            int defenderCoins,
            int defenderInk
    ) {
        String locked = request.getLockedCamoColor() != null
                ? request.getLockedCamoColor().trim().toUpperCase()
                : (attackerCamoColor != null ? attackerCamoColor.trim().toUpperCase() : "BLUE");
        if (!Colors.ALLOWED_CAMO_COLORS.contains(locked)) {
            locked = "BLUE";
        }

        int lightLevel = StealthConstants.clampLevel(
                request.getSearchlightLevel() == null ? 1 : request.getSearchlightLevel()
        );

        boolean alarm = false;
        boolean caught = false;
        boolean extractionComplete = false;
        double channelAccum = 0;
        double meter = 0;
        Integer prevTick = null;
        Double prevX = null;
        Double prevY = null;
        // Robot starts parked away from the light; only pursues after alarm (mirrors FE).
        double robotX = 3.0;
        double robotY = 3.0;
        boolean robotHunting = false;
        List<SessionLogTickDto> ticks = request.getSessionLog();

        if (ticks != null) {
            for (int i = 0; i < ticks.size(); i++) {
                SessionLogTickDto tick = ticks.get(i);
                double px = tick.getXPos();
                double py = tick.getYPos();
                int t = tick.getTick();
                double dt = prevTick == null
                        ? 0.2
                        : Math.max(0.05, (t - prevTick) / StealthConstants.SESSION_TICKS_PER_SECOND);
                double elapsed = t / StealthConstants.SESSION_TICKS_PER_SECOND;

                double sweep = StealthConstants.SEARCHLIGHT_SWEEP_DEG
                        * (alarm ? StealthConstants.alarmSweepMult(lightLevel) : 1.0);
                double beam = (t * sweep / 8.0) % 360.0;
                double range = StealthConstants.effectiveBeamRangeTiles(
                        StealthConstants.SEARCHLIGHT_RANGE,
                        elapsed,
                        alarm ? StealthConstants.alarmRangeBonus(lightLevel) : 0.0
                );

                SearchlightColorEngine.BeamResult beamHit = SearchlightColorEngine.evaluateBeam(
                        StealthConstants.SEARCHLIGHT_X,
                        StealthConstants.SEARCHLIGHT_Y,
                        beam,
                        StealthConstants.SEARCHLIGHT_CONE,
                        range,
                        px,
                        py
                );

                int col = (int) Math.round(px);
                int row = (int) Math.round(py);
                String tileColor = request.getTileColors().get(col + "," + row);

                SearchlightColorEngine.TickResult result = SearchlightColorEngine.evaluateTick(
                        beamHit, locked, tileColor, dt, meter, alarm, elapsed
                );
                meter = result.meter();
                alarm = result.alarmLatched();

                if (alarm) {
                    robotHunting = true;
                }

                boolean robotNear = false;
                if (robotHunting) {
                    double rdx = px - robotX;
                    double rdy = py - robotY;
                    double robotDist = Math.hypot(rdx, rdy);
                    if (robotDist > 0.01) {
                        double step = StealthConstants.ROBOT_CHASE_SPEED * dt;
                        double move = Math.min(step, robotDist);
                        robotX += (rdx / robotDist) * move;
                        robotY += (rdy / robotDist) * move;
                        robotDist = Math.hypot(px - robotX, py - robotY);
                    }
                    robotNear = robotDist <= StealthConstants.CHASE_INTERRUPT_DISTANCE;
                    if (robotDist <= StealthConstants.ROBOT_CATCH_DISTANCE) {
                        caught = true;
                        break;
                    }
                }

                boolean inZone = Math.hypot(px - StealthConstants.GATE_X, py - StealthConstants.GATE_Y)
                        <= StealthConstants.EXTRACTION_RADIUS;
                boolean moved = prevX != null
                        && Math.hypot(px - prevX, py - prevY) > StealthConstants.CHANNEL_MOVE_EPSILON;
                // After alarm, beam no longer blocks extraction — player must escape (wall/gate rules).
                boolean exposed = !alarm && beamHit.inBeam() && result.exposed();

                if (inZone && !moved && !robotNear && !exposed) {
                    channelAccum += dt;
                    if (channelAccum >= StealthConstants.CHANNEL_DURATION_SECONDS) {
                        extractionComplete = true;
                    }
                } else {
                    channelAccum = 0;
                }

                prevTick = t;
                prevX = px;
                prevY = py;
            }
        }

        boolean wallEscape = hasCompletedWallBreak(request) && alarm;
        boolean survivedFullRaid = request.getDurationSeconds() != null
                && request.getDurationSeconds() >= StealthConstants.RAID_DURATION_SECONDS;
        return award(caught, alarm, extractionComplete || wallEscape || survivedFullRaid, defenderCoins, defenderInk,
                request.getDurationSeconds());
    }

    private boolean hasCompletedWallBreak(RaidCompleteRequest request) {
        if (request.getWallBreakEvents() == null || request.getWallBreakEvents().isEmpty()) {
            return false;
        }
        for (WallBreakEventDto event : request.getWallBreakEvents()) {
            if (event.getHits() >= 4) {
                return true;
            }
        }
        return false;
    }

    /**
     * Awards greed loot only when extraction (or wall-break escape) completed.
     */
    ValidatedOutcomeDto award(
            boolean caught,
            boolean detected,
            boolean extractionOk,
            int defenderCoins,
            int defenderInk,
            int durationSeconds
    ) {
        String outcome;
        if (caught) {
            outcome = "CAUGHT";
        } else if (!extractionOk) {
            outcome = "INCOMPLETE";
        } else if (detected) {
            outcome = "ESCAPED";
        } else {
            outcome = "SILENT";
        }

        LootCalculationStrategy.LootResult loot =
                lootCalculationStrategy.compute(durationSeconds, defenderCoins, defenderInk, outcome);

        return ValidatedOutcomeDto.builder()
                .isDetected(caught || detected)
                .outcome(outcome)
                .chipsAwarded(0)
                .coinsLooted(loot.coinsLooted())
                .inkLooted(loot.inkLooted())
                .build();
    }

    /** Test helper — assumes successful silent extraction. */
    ValidatedOutcomeDto award(boolean caught, boolean detected, int defenderCoins, int defenderInk) {
        return award(caught, detected, !caught, defenderCoins, defenderInk, 40);
    }
}
