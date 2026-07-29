package com.shadowpalette.repository;

import com.shadowpalette.entity.CraftHouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CraftHouseRepository extends JpaRepository<CraftHouse, Long> {
    List<CraftHouse> findByPlotId(Long plotId);
}
