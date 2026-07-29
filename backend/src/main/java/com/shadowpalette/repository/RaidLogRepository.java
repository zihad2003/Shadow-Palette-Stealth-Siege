package com.shadowpalette.repository;

import com.shadowpalette.entity.RaidLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RaidLogRepository extends JpaRepository<RaidLog, Long> {
    List<RaidLog> findByAttackerId(Long attackerId);
    List<RaidLog> findByDefenderId(Long defenderId);
}
