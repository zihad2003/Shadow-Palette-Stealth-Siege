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
        if (plotRepository.count() == 0) {
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
        for (int y = 0; y < 5; y++) {
            for (int x = 0; x < 5; x++) {
                starterPlots.add(Plot.builder()
                        .xCoord(x)
                        .yCoord(y)
                        .ownerId(null)
                        .isOccupied(false)
                        .build());
            }
        }
        plotRepository.saveAll(starterPlots);
    }
}
