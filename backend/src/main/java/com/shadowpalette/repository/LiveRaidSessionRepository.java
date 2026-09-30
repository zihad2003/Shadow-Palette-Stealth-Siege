package com.shadowpalette.repository;

import com.shadowpalette.entity.LiveRaidSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LiveRaidSessionRepository extends JpaRepository<LiveRaidSessionEntity, String> {
    List<LiveRaidSessionEntity> findByAttackerId(Long attackerId);
    List<LiveRaidSessionEntity> findByDefenderId(Long defenderId);
    Optional<LiveRaidSessionEntity> findByRaidId(String raidId);
}
