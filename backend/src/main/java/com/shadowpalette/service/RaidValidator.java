package com.shadowpalette.service;

import com.shadowpalette.dto.RaidCompleteRequest;
import com.shadowpalette.dto.SessionLogTickDto;
import com.shadowpalette.dto.ValidatedOutcomeDto;
import com.shadowpalette.observer.DetectionEvent;
import com.shadowpalette.state.PatrolRobotContext;
import com.shadowpalette.stealth.DetectionResult;
import com.shadowpalette.stealth.LighthouseDetectionEngine;
import com.shadowpalette.stealth.SearchlightColorEngine;
import com.shadowpalette.strategy.CamouflageStrategyFactory;
import com.shadowpalette.util.Colors;
import com.shadowpalette.util.StealthConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RaidValidator {

    private final CamouflageStrategyFactory strategyFactory;

    /**
     * Replays the client's session log ticks against the server-side detection rules,
     * Lighthouse beam rotation, and PatrolRobot state machine.
     * Applies GDD Section 9 Alarm Escalation (+25% Lighthouse sweep speed, +1 tile cone range).
     */
    public ValidatedOutcomeDto validateSession(RaidCompleteRequest request, String attackerCamoColor, int defenderChipsAvailable) {
        if (request.getLockedCamoColor() != null && request.getTileColors() != null) {
            return validateColorCamoSession(request, attackerCamoColor, defenderChipsAvailable);
        }
        int playerBand = strategyFactory.getLuminanceBandForColor(attackerCamoColor);
        int surroundingBand = 3; // Default ground luminance band

        List<SessionLogTickDto> ticks = request.getSessionLog();
        boolean isDetected = false;
        boolean isCaught = false;

        PatrolRobotContext robotContext = new PatrolRobotContext();

        // Base Lighthouse configuration
        double lhX = 10.0;
        double lhY = 2.0;
        double coneAngle = 60.0;
        double coneRange = 7.0; // Base 7 tiles range
        double sweepSpeedMult = 1.0;

        if (ticks != null && !ticks.isEmpty()) {
            for (SessionLogTickDto tickDto : ticks) {
                int tick = tickDto.getTick();
                double px = tickDto.getXPos();
                double py = tickDto.getYPos();

                // Alarm Escalation Buff per GDD Section 9
                if (isDetected) {
                    coneRange = 8.0; // +1 tile range on alarm
                    sweepSpeedMult = 1.25; // +25% sweep speed on alarm
                }

                // 1. Calculate Lighthouse beam sweep angle
                double beamAngleDeg = (tick * (360.0 / 240.0) * sweepSpeedMult) % 360.0;

                // 2. Evaluate Lighthouse stealth detection
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

                // 3. Check Robot Chase distance (Player speed is 1.25x robot speed)
                if ("CHASING".equals(robotContext.getCurrentStateName())) {
                    double robotDist = Math.hypot(px - robotContext.getX(), py - robotContext.getY());
                    if (robotDist <= 0.5) { // Caught by robot!
                        isCaught = true;
                        break;
                    }
                }
            }
        }

        return award(isCaught, isDetected, request, defenderChipsAvailable);
    }

    /**
     * Replays movement against stored defender tile colors and the locked raid camo.
     * Client isDetected / stolen chips are ignored.
     */
    private ValidatedOutcomeDto validateColorCamoSession(
            RaidCompleteRequest request,
            String attackerCamoColor,
            int defenderChipsAvailable
    ) {
        String locked = request.getLockedCamoColor() != null
                ? request.getLockedCamoColor().trim().toUpperCase()
                : (attackerCamoColor != null ? attackerCamoColor.trim().toUpperCase() : "BLUE");
        if (!Colors.ALLOWED_CAMO_COLORS.contains(locked)) {
            locked = "BLUE";
        }

        boolean alarm = false;
        boolean caught = false;
        double meter = 0;
        List<SessionLogTickDto> ticks = request.getSessionLog();

        if (ticks != null) {
            for (int i = 0; i < ticks.size(); i++) {
                SessionLogTickDto tick = ticks.get(i);
                double px = tick.getXPos();
                double py = tick.getYPos();
                double sweep = StealthConstants.SEARCHLIGHT_SWEEP_DEG * (alarm ? 1.25 : 1.0);
                double beam = (tick.getTick() * sweep / 8.0) % 360.0;
                double range = StealthConstants.SEARCHLIGHT_RANGE + (alarm ? 1.0 : 0.0);

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
                        beamHit, locked, tileColor, 0.2, meter, alarm
                );
                meter = result.meter();
                alarm = result.alarmLatched();

                if (alarm && i > 8) {
                    double robotX = StealthConstants.SEARCHLIGHT_X;
                    double robotY = StealthConstants.SEARCHLIGHT_Y;
                    if (Math.hypot(px - robotX, py - robotY) <= 0.55) {
                        caught = true;
                        break;
                    }
                }
            }
        }

        return award(caught, alarm, request, defenderChipsAvailable);
    }

    private ValidatedOutcomeDto award(boolean caught, boolean detected, RaidCompleteRequest request, int defenderChipsAvailable) {
        int requestedChips = request.getClientReportedOutcome() != null ? request.getClientReportedOutcome().getChipsRequested() : 0;
        int baseChips = Math.min(requestedChips, defenderChipsAvailable > 0 ? defenderChipsAvailable : 200);

        if (caught) {
            return ValidatedOutcomeDto.builder().isDetected(true).outcome("CAUGHT").chipsAwarded(0).build();
        }
        if (detected) {
            return ValidatedOutcomeDto.builder()
                    .isDetected(true)
                    .outcome("ESCAPED")
                    .chipsAwarded((int) Math.round(baseChips * 1.5))
                    .build();
        }
        return ValidatedOutcomeDto.builder().isDetected(false).outcome("SILENT").chipsAwarded(baseChips).build();
    }
}
