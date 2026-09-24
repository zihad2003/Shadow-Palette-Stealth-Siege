package com.shadowpalette.service;

import com.shadowpalette.dto.*;
import com.shadowpalette.entity.*;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RaidService {

    private final UserRepository userRepository;
    private final PlotRepository plotRepository;
    private final BuildingRepository buildingRepository;
    private final LighthouseRepository lighthouseRepository;
    private final PatrolRobotRepository patrolRobotRepository;
    private final WallBlockRepository wallBlockRepository;
    private final RaidLogRepository raidLogRepository;
    private final RaidValidator raidValidator;

    @Transactional(readOnly = true)
    public RaidTargetResponse getRaidTarget(Long defenderId, Long attackerId) {
        if (attackerId != null) {
            userRepository.findById(attackerId).ifPresent(attacker -> {
                if (attacker.getRaidCooldownUntil() != null && attacker.getRaidCooldownUntil().isAfter(LocalDateTime.now())) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "RAID_COOLDOWN_ACTIVE");
                }
            });
        }

        User defender = userRepository.findById(defenderId).orElse(null);

        int chipsAvailable = (defender != null && defender.getChips() > 0) ? defender.getChips() : 200;
        int coinsAvailable = (defender != null && defender.getCoins() > 0) ? defender.getCoins() : 200;
        int inkAvailable = (defender != null && defender.getInkEnergy() > 0) ? defender.getInkEnergy() : 50;

        List<Plot> plots = plotRepository.findByOwnerId(defenderId);
        Plot plot = (plots != null && !plots.isEmpty()) ? plots.get(0) : null;

        Map<String, Object> layout = new HashMap<>();

        if (plot != null) {
            List<Building> buildings = buildingRepository.findByPlotId(plot.getId());
            List<WallBlock> walls = wallBlockRepository.findByPlotId(plot.getId());
            Lighthouse lighthouse = lighthouseRepository.findByPlotId(plot.getId()).orElse(null);
            PatrolRobot patrolRobot = patrolRobotRepository.findByPlotId(plot.getId()).orElse(null);

            layout.put("buildings", buildings);
            layout.put("walls", walls);
            layout.put("lighthouse", lighthouse != null ? lighthouse : Map.of("xPos", 10, "yPos", 2, "coneAngle", 60, "coneRange", 7));
            layout.put("patrolRobot", patrolRobot);
        } else {
            layout.put("buildings", Collections.emptyList());
            layout.put("walls", Collections.emptyList());
            layout.put("lighthouse", Map.of("xPos", 10, "yPos", 2, "coneAngle", 60, "coneRange", 7));
            layout.put("patrolRobot", null);
        }

        return RaidTargetResponse.builder()
                .defenderId(defenderId)
                .layout(layout)
                .chipsAvailable(chipsAvailable)
                .coinsAvailable(coinsAvailable)
                .inkAvailable(inkAvailable)
                .build();
    }

    @Transactional
    public RaidCompleteResponse completeRaid(RaidCompleteRequest request) {
        User attacker = userRepository.findById(request.getAttackerId())
                .orElseGet(() -> User.builder()
                        .id(request.getAttackerId())
                        .username("Player" + request.getAttackerId())
                        .camoColor("BLUE")
                        .coins(500)
                        .inkEnergy(100)
                        .chips(200)
                        .build());

        User defender = userRepository.findById(request.getDefenderId())
                .orElseGet(() -> User.builder()
                        .id(request.getDefenderId())
                        .username("Defender" + request.getDefenderId())
                        .coins(200)
                        .inkEnergy(50)
                        .chips(200)
                        .build());

        ValidatedOutcomeDto validated = raidValidator.validateSession(
                request, attacker.getCamoColor(), defender.getCoins(), defender.getInkEnergy()
        );

        if (request.getClientReportedOutcome() != null) {
            String clientOutcome = request.getClientReportedOutcome().getOutcome();
            if (clientOutcome != null && !clientOutcome.equalsIgnoreCase(validated.getOutcome())) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "OUTCOME_MISMATCH", validated);
            }
        }

        if ("CAUGHT".equalsIgnoreCase(validated.getOutcome())) {
            attacker.setRaidCooldownUntil(LocalDateTime.now().plusMinutes(5));
        }

        if (request.getWallBreakEvents() != null) {
            for (WallBreakEventDto event : request.getWallBreakEvents()) {
                if (event.getWallBlockId() != null) {
                    wallBlockRepository.findById(event.getWallBlockId()).ifPresent(wall -> {
                        wall.setBreakProgress(event.getHits());
                        wallBlockRepository.save(wall);
                    });
                }
            }
        }

        int coinsLooted = Math.max(0, validated.getCoinsLooted());
        int inkLooted = Math.max(0, validated.getInkLooted());

        // Cap steal to what the defender actually holds right now.
        coinsLooted = Math.min(coinsLooted, Math.max(0, defender.getCoins()));
        inkLooted = Math.min(inkLooted, Math.max(0, defender.getInkEnergy()));

        defender.setCoins(Math.max(0, defender.getCoins() - coinsLooted));
        defender.setInkEnergy(Math.max(0, defender.getInkEnergy() - inkLooted));
        attacker.setCoins(attacker.getCoins() + coinsLooted);
        attacker.setInkEnergy(attacker.getInkEnergy() + inkLooted);
        if (validated.getChipsAwarded() > 0) {
            attacker.setChips(attacker.getChips() + validated.getChipsAwarded());
        }

        validated.setCoinsLooted(coinsLooted);
        validated.setInkLooted(inkLooted);

        userRepository.save(attacker);
        userRepository.save(defender);

        RaidLog raidLog = RaidLog.builder()
                .attackerId(attacker.getId())
                .defenderId(defender.getId())
                .outcome(validated.getOutcome())
                .isDetected(validated.isDetected())
                .stolenChips(validated.getChipsAwarded())
                .stolenCoins(coinsLooted)
                .stolenInk(inkLooted)
                .durationSeconds(request.getDurationSeconds())
                .timestamp(LocalDateTime.now())
                .sessionLogJson(request.getSessionLog() != null ? request.getSessionLog().toString() : "[]")
                .build();

        RaidLog savedLog = raidLogRepository.save(raidLog);

        return RaidCompleteResponse.builder()
                .success(true)
                .validatedOutcome(validated)
                .raidLogId(savedLog.getId())
                .attackerCoins(attacker.getCoins())
                .attackerInk(attacker.getInkEnergy())
                .build();
    }
}
