package com.shadowpalette.repository;

import com.shadowpalette.entity.RaidLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RaidLogRepository extends JpaRepository<RaidLog, Long> {
    List<RaidLog> findByAttackerId(Long attackerId);
    List<RaidLog> findByDefenderId(Long defenderId);
    java.util.Optional<RaidLog> findByRaidId(String raidId);
    org.springframework.data.domain.Page<RaidLog> findByAttackerIdOrDefenderIdOrderByTimestampDesc(
            Long attackerId, Long defenderId, org.springframework.data.domain.Pageable pageable);
    List<RaidLog> findByAttackerIdOrDefenderIdOrderByTimestampDesc(Long attackerId, Long defenderId);
    long countByAttackerIdAndOutcomeNot(Long attackerId, String outcome);
    long countByAttackerId(Long attackerId);
    long countByAttackerIdAndOutcome(Long attackerId, String outcome);
    void deleteByAttackerId(Long attackerId);
    void deleteByDefenderId(Long defenderId);
}
