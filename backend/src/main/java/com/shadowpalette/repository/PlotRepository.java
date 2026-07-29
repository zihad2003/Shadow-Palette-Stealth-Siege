package com.shadowpalette.repository;

import com.shadowpalette.entity.Plot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlotRepository extends JpaRepository<Plot, Long> {
    List<Plot> findByOwnerId(Long ownerId);

    @Query("SELECT p FROM Plot p WHERE p.xCoord = :xCoord AND p.yCoord = :yCoord")
    Optional<Plot> findByXCoordAndYCoord(@Param("xCoord") int xCoord, @Param("yCoord") int yCoord);
}
