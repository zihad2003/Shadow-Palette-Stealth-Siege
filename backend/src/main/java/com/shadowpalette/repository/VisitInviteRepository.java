package com.shadowpalette.repository;

import com.shadowpalette.entity.VisitInvite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VisitInviteRepository extends JpaRepository<VisitInvite, Long> {
    List<VisitInvite> findByGuestIdAndStatus(Long guestId, String status);

    List<VisitInvite> findByHostIdAndStatus(Long hostId, String status);

    Optional<VisitInvite> findFirstByHostIdAndGuestIdAndStatus(Long hostId, Long guestId, String status);
}
