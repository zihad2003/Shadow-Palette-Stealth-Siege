package com.shadowpalette.repository;

import com.shadowpalette.entity.Lighthouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LighthouseRepository extends JpaRepository<Lighthouse, Long> {
    Optional<Lighthouse> findByPlotId(Long plotId);
    boolean existsByPlotId(Long plotId);
}
