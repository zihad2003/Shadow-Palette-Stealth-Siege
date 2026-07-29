package com.shadowpalette.repository;

import com.shadowpalette.entity.CoinGenerator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CoinGeneratorRepository extends JpaRepository<CoinGenerator, Long> {
    List<CoinGenerator> findByPlotId(Long plotId);
}
