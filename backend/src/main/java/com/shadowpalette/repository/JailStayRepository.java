package com.shadowpalette.repository;

import com.shadowpalette.entity.JailStay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface JailStayRepository extends JpaRepository<JailStay, Long> {
    Optional<JailStay> findFirstByPrisonerIdAndStatus(Long prisonerId, String status);
    List<JailStay> findByStatusAndReleaseAtLessThanEqual(String status, LocalDateTime now);
    Optional<JailStay> findByRaidId(String raidId);
}
