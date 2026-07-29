package com.shadowpalette.service;

import com.shadowpalette.dto.RaidCompleteRequest;
import com.shadowpalette.dto.SessionLogTickDto;
import com.shadowpalette.dto.ValidatedOutcomeDto;
import com.shadowpalette.observer.DetectionEvent;
import com.shadowpalette.state.PatrolRobotContext;
import com.shadowpalette.stealth.DetectionResult;
import com.shadowpalette.stealth.LighthouseDetectionEngine;
import com.shadowpalette.strategy.CamouflageStrategyFactory;
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
                    DetectionEvent event = DetectionEvent.builder()
                            .playerX(px)
                            .playerY(py)
                            .reason(result.getReason())
                            .timestamp(tick)
                            .build();
                    robotContext.processDetection(event);
                }

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

        int requestedChips = request.getClientReportedOutcome() != null ? request.getClientReportedOutcome().getChipsRequested() : 0;
        int baseChips = Math.min(requestedChips, defenderChipsAvailable > 0 ? defenderChipsAvailable : 200);

        if (isCaught) {
            return ValidatedOutcomeDto.builder()
                    .isDetected(true)
                    .outcome("CAUGHT")
                    .chipsAwarded(0)
                    .build();
        } else if (isDetected) {
            // Detected but Escaped -> 1.5x loot multiplier per GDD 10
            int awarded = (int) Math.round(baseChips * 1.5);
            return ValidatedOutcomeDto.builder()
                    .isDetected(true)
                    .outcome("ESCAPED")
                    .chipsAwarded(awarded)
                    .build();
        } else {
            // Silent Extraction -> 1.0x loot multiplier
            return ValidatedOutcomeDto.builder()
                    .isDetected(false)
                    .outcome("SILENT")
                    .chipsAwarded(baseChips)
                    .build();
        }
    }
}
