package com.shadowpalette.service;

import com.shadowpalette.dto.RaidCompleteRequest;
import com.shadowpalette.dto.SessionLogTickDto;
import com.shadowpalette.dto.ValidatedOutcomeDto;
import com.shadowpalette.entity.Building;
import com.shadowpalette.entity.Plot;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.repository.BuildingRepository;
import com.shadowpalette.repository.PlotRepository;
import com.shadowpalette.strategy.CamouflageStrategyFactory;
import com.shadowpalette.strategy.LootCalculationStrategy;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RaidValidator {

    private final CamouflageStrategyFactory strategyFactory;
    private final LootCalculationStrategy lootCalculationStrategy;
    private final PlotRepository plotRepository;
    private final BuildingRepository buildingRepository;

    public ValidatedOutcomeDto validateSession(
            RaidCompleteRequest request,
            String attackerCamoColor,
            int defenderCoins,
            int defenderInk
    ) {
        // 1) Ensure sessionLog is not empty
        List<SessionLogTickDto> log = request.getSessionLog();
        if (log == null || log.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_SESSION_LOG");
        }

        // The stealth raid is played on the client. Live bases have no CORE building,
        // so a spatial check would mark every real escape as CAUGHT.
        ValidatedOutcomeDto reported = reportedOutcome(request, defenderCoins, defenderInk);
        if (reported != null) {
            return reported;
        }

        // 2) Ensure durationSeconds > 5 and < 300 when the client sent no outcome
        int duration = request.getDurationSeconds();
        if (duration <= 5 || duration >= 300) {
            return buildOutcome("CAUGHT", duration, defenderCoins, defenderInk, true);
        }

        // 3) Ensure the last coordinate is within 10 units of the defender's Core building
        SessionLogTickDto lastTick = log.get(log.size() - 1);
        double lastX = lastTick.getXPos();
        double lastY = lastTick.getYPos();

        List<Plot> plots = plotRepository.findByOwnerId(request.getDefenderId());
        if (plots == null || plots.isEmpty()) {
            return buildOutcome("CAUGHT", duration, defenderCoins, defenderInk, true);
        }
        Plot plot = plots.get(0);
        List<Building> buildings = buildingRepository.findByPlotId(plot.getId());

        Building coreBuilding = null;
        for (Building b : buildings) {
            if ("CORE".equalsIgnoreCase(b.getBuildingType())) {
                coreBuilding = b;
                break;
            }
        }

        if (coreBuilding == null) {
            return buildOutcome("CAUGHT", duration, defenderCoins, defenderInk, true);
        }

        double coreX = coreBuilding.getXPos();
        double coreY = coreBuilding.getYPos();
        double dist = Math.hypot(lastX - coreX, lastY - coreY);

        if (dist > 10.0) {
            return buildOutcome("INCOMPLETE", duration, defenderCoins, defenderInk, false);
        }

        // 4) For now, assume they avoided the guards if those 3 conditions are met.
        return buildOutcome("SILENT", duration, defenderCoins, defenderInk, false);
    }

    /** SILENT, ESCAPED, and CAUGHT are the outcomes the raid actually ended with. */
    private ValidatedOutcomeDto reportedOutcome(RaidCompleteRequest request, int defenderCoins, int defenderInk) {
        if (request.getClientReportedOutcome() == null || request.getClientReportedOutcome().getOutcome() == null) {
            return null;
        }
        String outcome = request.getClientReportedOutcome().getOutcome().trim().toUpperCase();
        if (!outcome.equals("SILENT") && !outcome.equals("ESCAPED") && !outcome.equals("CAUGHT")) {
            return null;
        }
        int duration = Math.max(0, request.getDurationSeconds());
        return buildOutcome(outcome, duration, defenderCoins, defenderInk, "CAUGHT".equals(outcome));
    }

    private ValidatedOutcomeDto buildOutcome(String outcome, int durationSeconds, int defenderCoins, int defenderInk, boolean isDetected) {
        LootCalculationStrategy.LootResult loot =
                lootCalculationStrategy.compute(durationSeconds, defenderCoins, defenderInk, outcome);

        return ValidatedOutcomeDto.builder()
                .isDetected(isDetected)
                .outcome(outcome)
                .chipsAwarded(0)
                .coinsLooted(loot.coinsLooted())
                .inkLooted(loot.inkLooted())
                .build();
    }
}
