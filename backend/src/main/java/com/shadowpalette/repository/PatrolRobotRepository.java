package com.shadowpalette.repository;

import com.shadowpalette.entity.PatrolRobot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PatrolRobotRepository extends JpaRepository<PatrolRobot, Long> {
    Optional<PatrolRobot> findByPlotId(Long plotId);
    boolean existsByPlotId(Long plotId);
}
