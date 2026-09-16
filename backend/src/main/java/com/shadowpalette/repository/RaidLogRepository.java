package com.shadowpalette.repository;

import com.shadowpalette.entity.RaidLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RaidLogRepository extends JpaRepository<RaidLog, Long> {
    List<RaidLog> findByAttackerId(Long attackerId);
    List<RaidLog> findByDefenderId(Long defenderId);
    long countByAttackerIdAndOutcomeNot(Long attackerId, String outcome);
    long countByAttackerId(Long attackerId);
    long countByAttackerIdAndOutcome(Long attackerId, String outcome);
    void deleteByAttackerId(Long attackerId);
    void deleteByDefenderId(Long defenderId);
}
