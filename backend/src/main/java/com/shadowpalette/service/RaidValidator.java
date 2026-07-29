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
     */
    public ValidatedOutcomeDto validateSession(RaidCompleteRequest request, String attackerCamoColor, int defenderChipsAvailable) {
        int playerBand = strategyFactory.getLuminanceBandForColor(attackerCamoColor);
        int surroundingBand = 3; // Default ground luminance band

        List<SessionLogTickDto> ticks = request.getSessionLog();
        boolean isDetected = false;
        boolean isCaught = false;

        PatrolRobotContext robotContext = new PatrolRobotContext();

        // Default Lighthouse pos: (10.0, 2.0)
        double lhX = 10.0;
        double lhY = 2.0;
        double coneAngle = 60.0;
        double coneRange = 7.0;

        if (ticks != null && !ticks.isEmpty()) {
            for (SessionLogTickDto tickDto : ticks) {
                int tick = tickDto.getTick();
                double px = tickDto.getXPos();
                double py = tickDto.getYPos();

                // 1. Calculate Lighthouse beam sweep angle (1 rotation per 12s @ 20 ticks/s)
                double beamAngleDeg = (tick * (360.0 / 240.0)) % 360.0;

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

                // 3. Check Robot Chase distance
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
