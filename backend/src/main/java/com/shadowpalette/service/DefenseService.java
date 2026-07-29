package com.shadowpalette.service;

import com.shadowpalette.dto.DefensePlaceRequest;
import com.shadowpalette.dto.DefensePlaceResponse;
import com.shadowpalette.entity.Lighthouse;
import com.shadowpalette.entity.PatrolRobot;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.factory.DefenseFactory;
import com.shadowpalette.repository.LighthouseRepository;
import com.shadowpalette.repository.PatrolRobotRepository;
import com.shadowpalette.repository.RaidLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DefenseService {

    private final LighthouseRepository lighthouseRepository;
    private final PatrolRobotRepository patrolRobotRepository;
    private final RaidLogRepository raidLogRepository;
    private final DefenseFactory defenseFactory;

    @Transactional
    public DefensePlaceResponse placeDefense(DefensePlaceRequest request) {
        if (request.getDefenseType() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DEFENSE_TYPE");
        }

        String typeUpper = request.getDefenseType().trim().toUpperCase();

        if ("LIGHTHOUSE".equals(typeUpper)) {
            if (lighthouseRepository.existsByPlotId(request.getPlotId())) {
                throw new ApiException(HttpStatus.CONFLICT, "LIGHTHOUSE_ALREADY_PLACED");
            }

            Lighthouse lighthouse = defenseFactory.createLighthouse(request.getPlotId(), request.getModelVariant());
            Lighthouse saved = lighthouseRepository.save(lighthouse);

            return DefensePlaceResponse.builder()
                    .success(true)
                    .defenseId(saved.getId())
                    .defenseType("LIGHTHOUSE")
                    .build();
        }

        if ("PATROL_ROBOT".equals(typeUpper) || "PATROLROBOT".equals(typeUpper)) {
            if (patrolRobotRepository.existsByPlotId(request.getPlotId())) {
                throw new ApiException(HttpStatus.CONFLICT, "PATROLROBOT_ALREADY_PLACED");
            }

            long successfulRaids = raidLogRepository.countByAttackerIdAndOutcomeNot(request.getUserId(), "CAUGHT");
            if (successfulRaids < 3) {
                int needed = (int) (3 - successfulRaids);
                throw new ApiException(HttpStatus.FORBIDDEN, "PATROLROBOT_NOT_UNLOCKED", needed);
            }

            PatrolRobot robot = defenseFactory.createPatrolRobot(request.getPlotId());
            PatrolRobot saved = patrolRobotRepository.save(robot);

            return DefensePlaceResponse.builder()
                    .success(true)
                    .defenseId(saved.getId())
                    .defenseType("PATROL_ROBOT")
                    .build();
        }

        throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DEFENSE_TYPE");
    }
}
