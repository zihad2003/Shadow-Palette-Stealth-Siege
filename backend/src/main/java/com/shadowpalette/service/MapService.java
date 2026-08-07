package com.shadowpalette.service;

import com.shadowpalette.dto.MapResponse;
import com.shadowpalette.dto.PlotDto;
import com.shadowpalette.entity.Plot;
import com.shadowpalette.repository.PlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MapService {

    private final PlotRepository plotRepository;

    @Transactional
    public MapResponse getMap() {
        if (plotRepository.count() < 64) {
            plotRepository.deleteAll();
            seedMapGrid();
        }

        List<PlotDto> plots = plotRepository.findAll().stream()
                .map(p -> PlotDto.builder()
                        .id(p.getId())
                        .xCoord(p.getXCoord())
                        .yCoord(p.getYCoord())
                        .ownerId(p.getOwnerId())
                        .isOccupied(p.isOccupied())
                        .build())
                .collect(Collectors.toList());

        return MapResponse.builder().plots(plots).build();
    }

    private void seedMapGrid() {
        List<Plot> starterPlots = new ArrayList<>();
        for (int y = 0; y < 8; y++) {
            for (int x = 0; x < 8; x++) {
                Long owner = null;
                boolean occupied = false;
                if (x == 3 && y == 3) { owner = 12L; occupied = true; } // Player base
                else if (x == 1 && y == 1) { owner = 34L; occupied = true; }
                else if (x == 5 && y == 2) { owner = 5L; occupied = true; }
                else if (x == 2 && y == 6) { owner = 20L; occupied = true; }
                else if (x == 6 && y == 5) { owner = 42L; occupied = true; }

                starterPlots.add(Plot.builder()
                        .xCoord(x)
                        .yCoord(y)
                        .ownerId(owner)
                        .isOccupied(occupied)
                        .build());
            }
        }
        plotRepository.saveAll(starterPlots);
    }
}
