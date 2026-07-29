package com.shadowpalette.repository;

import com.shadowpalette.entity.InkHouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InkHouseRepository extends JpaRepository<InkHouse, Long> {
    List<InkHouse> findByPlotId(Long plotId);
}
