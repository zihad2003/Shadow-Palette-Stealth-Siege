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
        // Cooldown enforcement on attacker
        if (attackerId != null) {
            userRepository.findById(attackerId).ifPresent(attacker -> {
                if (attacker.getRaidCooldownUntil() != null && attacker.getRaidCooldownUntil().isAfter(LocalDateTime.now())) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "RAID_COOLDOWN_ACTIVE");
                }
            });
        }

        User defender = userRepository.findById(defenderId)
                .orElse(null);

        int chipsAvailable = (defender != null && defender.getChips() > 0) ? defender.getChips() : 200;

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
                .build();
    }

    @Transactional
    public RaidCompleteResponse completeRaid(RaidCompleteRequest request) {
        User attacker = userRepository.findById(request.getAttackerId())
                .orElseGet(() -> User.builder().id(request.getAttackerId()).username("Player" + request.getAttackerId()).camoColor("BLUE").chips(200).build());

        User defender = userRepository.findById(request.getDefenderId())
                .orElseGet(() -> User.builder().id(request.getDefenderId()).username("Defender" + request.getDefenderId()).chips(200).build());

        // Validate session log
        ValidatedOutcomeDto validated = raidValidator.validateSession(
                request, attacker.getCamoColor(), defender.getChips()
        );

        // Outcome Match Check
        if (request.getClientReportedOutcome() != null) {
            String clientOutcome = request.getClientReportedOutcome().getOutcome();
            if (clientOutcome != null && !clientOutcome.equalsIgnoreCase(validated.getOutcome())) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "OUTCOME_MISMATCH", validated);
            }
        }

        // Handle CAUGHT penalty (5-minute cooldown per GDD Section 11)
        if ("CAUGHT".equalsIgnoreCase(validated.getOutcome())) {
            attacker.setRaidCooldownUntil(LocalDateTime.now().plusMinutes(5));
        }

        // Persist WallBlock breakProgress in DB
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

        // Award chips to attacker
        attacker.setChips(attacker.getChips() + validated.getChipsAwarded());
        userRepository.save(attacker);

        // Persist RaidLog
        RaidLog raidLog = RaidLog.builder()
                .attackerId(attacker.getId())
                .defenderId(defender.getId())
                .outcome(validated.getOutcome())
                .durationSeconds(request.getDurationSeconds())
                .sessionLogJson(request.getSessionLog() != null ? request.getSessionLog().toString() : "[]")
                .build();

        RaidLog savedLog = raidLogRepository.save(raidLog);

        return RaidCompleteResponse.builder()
                .success(true)
                .validatedOutcome(validated)
                .raidLogId(savedLog.getId())
                .build();
    }
}
