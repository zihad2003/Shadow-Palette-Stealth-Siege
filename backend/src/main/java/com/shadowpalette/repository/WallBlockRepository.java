package com.shadowpalette.repository;

import com.shadowpalette.entity.WallBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WallBlockRepository extends JpaRepository<WallBlock, Long> {
    List<WallBlock> findByPlotId(Long plotId);

    @Query("SELECT w FROM WallBlock w WHERE w.plotId = :plotId AND w.isGate = true")
    Optional<WallBlock> findGateByPlotId(@Param("plotId") Long plotId);
}
