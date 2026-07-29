package com.shadowpalette.repository;

import com.shadowpalette.entity.SleepHouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SleepHouseRepository extends JpaRepository<SleepHouse, Long> {
    List<SleepHouse> findByPlotId(Long plotId);
}
