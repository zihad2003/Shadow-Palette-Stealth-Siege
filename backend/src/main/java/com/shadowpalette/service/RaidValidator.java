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
     * Alarm escalation (sweep + range) scales with defender Searchlight level (GDD §9).
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
        int surroundingBand = 3; // Default ground luminance band
        int lightLevel = StealthConstants.clampLevel(
                request.getSearchlightLevel() == null ? 1 : request.getSearchlightLevel()
        );

        List<SessionLogTickDto> ticks = request.getSessionLog();
        boolean isDetected = false;
        boolean isCaught = false;

        PatrolRobotContext robotContext = new PatrolRobotContext();

        double lhX = 10.0;
        double lhY = 2.0;
        double coneAngle = 60.0;
        double coneRange = 7.0;
        double sweepSpeedMult = 1.0;

        if (ticks != null && !ticks.isEmpty()) {
            for (SessionLogTickDto tickDto : ticks) {
                int tick = tickDto.getTick();
                double px = tickDto.getXPos();
                double py = tickDto.getYPos();

                if (isDetected) {
                    coneRange = 7.0 + StealthConstants.alarmRangeBonus(lightLevel);
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

                if ("CHASING".equals(robotContext.getCurrentStateName())) {
                    double robotDist = Math.hypot(px - robotContext.getX(), py - robotContext.getY());
                    // Catch radius left at 0.5 — tightening raised Caught-rate too harshly in playtests.
                    if (robotDist <= 0.5) {
                        isCaught = true;
                        break;
                    }
                }
            }
        }

        return award(isCaught, isDetected, defenderCoins, defenderInk);
    }

    /**
     * Replays movement against stored defender tile colors and the locked raid camo.
     * Client loot amounts are ignored — server computes steal from defender balances.
     */
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
        double meter = 0;
        List<SessionLogTickDto> ticks = request.getSessionLog();

        if (ticks != null) {
            for (int i = 0; i < ticks.size(); i++) {
                SessionLogTickDto tick = ticks.get(i);
                double px = tick.getXPos();
                double py = tick.getYPos();
                double sweep = StealthConstants.SEARCHLIGHT_SWEEP_DEG
                        * (alarm ? StealthConstants.alarmSweepMult(lightLevel) : 1.0);
                double beam = (tick.getTick() * sweep / 8.0) % 360.0;
                double range = StealthConstants.SEARCHLIGHT_RANGE
                        + (alarm ? StealthConstants.alarmRangeBonus(lightLevel) : 0.0);

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

        return award(caught, alarm, defenderCoins, defenderInk);
    }

    /**
     * Steals up to {@link StealthConstants#RAID_LOOT_FRACTION} of defender coins/ink,
     * scaled by outcome multiplier (SILENT 1.0×, ESCAPED 1.5×, CAUGHT 0×).
     */
    ValidatedOutcomeDto award(boolean caught, boolean detected, int defenderCoins, int defenderInk) {
        int coinPool = defenderCoins > 0 ? defenderCoins : StealthConstants.DEFENDER_COINS_FALLBACK;
        int inkPool = defenderInk > 0 ? defenderInk : StealthConstants.DEFENDER_INK_FALLBACK;
        int baseCoins = (int) Math.floor(coinPool * StealthConstants.RAID_LOOT_FRACTION);
        int baseInk = (int) Math.floor(inkPool * StealthConstants.RAID_LOOT_FRACTION);

        if (caught) {
            return ValidatedOutcomeDto.builder()
                    .isDetected(true)
                    .outcome("CAUGHT")
                    .chipsAwarded(0)
                    .coinsLooted(0)
                    .inkLooted(0)
                    .build();
        }
        if (detected) {
            return ValidatedOutcomeDto.builder()
                    .isDetected(true)
                    .outcome("ESCAPED")
                    .chipsAwarded(0)
                    .coinsLooted((int) Math.round(baseCoins * 1.5))
                    .inkLooted((int) Math.round(baseInk * 1.5))
                    .build();
        }
        return ValidatedOutcomeDto.builder()
                .isDetected(false)
                .outcome("SILENT")
                .chipsAwarded(0)
                .coinsLooted(baseCoins)
                .inkLooted(baseInk)
                .build();
    }
}
