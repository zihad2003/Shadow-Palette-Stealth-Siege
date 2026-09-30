package com.shadowpalette.repository;

import com.shadowpalette.entity.RansomOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RansomOfferRepository extends JpaRepository<RansomOffer, Long> {
    List<RansomOffer> findByJailStayIdOrderByCreatedAtAsc(Long jailStayId);
    List<RansomOffer> findByJailStayIdAndStatus(Long jailStayId, String status);
}
