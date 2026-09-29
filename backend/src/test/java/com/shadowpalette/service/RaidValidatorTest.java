package com.shadowpalette.service;

import com.shadowpalette.dto.*;
import com.shadowpalette.entity.Building;
import com.shadowpalette.entity.Plot;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.repository.BuildingRepository;
import com.shadowpalette.repository.PlotRepository;
import com.shadowpalette.strategy.CamouflageStrategyFactory;
import com.shadowpalette.strategy.LootCalculationStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RaidValidatorTest {

    private RaidValidator raidValidator;
    private LootCalculationStrategy lootStrategy;
    private PlotRepository plotRepository;
    private BuildingRepository buildingRepository;

    @BeforeEach
    void setUp() {
        CamouflageStrategyFactory factory = new CamouflageStrategyFactory();
        lootStrategy = new LootCalculationStrategy();
        plotRepository = mock(PlotRepository.class);
        buildingRepository = mock(BuildingRepository.class);
        raidValidator = new RaidValidator(factory, lootStrategy, plotRepository, buildingRepository);
    }

    @Test
    void testNullSessionLogRejected() {
        RaidCompleteRequest request = RaidCompleteRequest.builder()
                .defenderId(34L)
                .durationSeconds(40)
                .sessionLog(null)
                .build();

        ApiException ex = assertThrows(
                ApiException.class,
                () -> raidValidator.validateSession(request, "BLUE", 500, 100)
        );
        assertEquals("EMPTY_SESSION_LOG", ex.getErrorCode());
    }

    @Test
    void testInvalidDurationSecondsCaught() {
        List<SessionLogTickDto> ticks = new ArrayList<>();
        ticks.add(SessionLogTickDto.builder().tick(1).xPos(0).yPos(0).build());

        RaidCompleteRequest request = RaidCompleteRequest.builder()
                .defenderId(34L)
                .durationSeconds(4) // < 5
                .sessionLog(ticks)
                .build();

        ValidatedOutcomeDto outcome = raidValidator.validateSession(request, "BLUE", 500, 100);
        assertEquals("CAUGHT", outcome.getOutcome());
    }

    @Test
    void testCoreProximitySilent() {
        List<SessionLogTickDto> ticks = new ArrayList<>();
        ticks.add(SessionLogTickDto.builder().tick(1).xPos(25).yPos(25).build()); // Near core (30,30)

        RaidCompleteRequest request = RaidCompleteRequest.builder()
                .defenderId(34L)
                .durationSeconds(40)
                .sessionLog(ticks)
                .build();

        Plot plot = new Plot();
        plot.setId(1L);
        plot.setOwnerId(34L);

        Building core = new Building() {
            @Override
            public String getBuildingType() { return "CORE"; }
            @Override
            public int getXPos() { return 30; }
            @Override
            public int getYPos() { return 30; }
        };

        when(plotRepository.findByOwnerId(34L)).thenReturn(List.of(plot));
        when(buildingRepository.findByPlotId(1L)).thenReturn(List.of(core));

        ValidatedOutcomeDto outcome = raidValidator.validateSession(request, "BLUE", 500, 100);
        assertEquals("SILENT", outcome.getOutcome());
    }

    @Test
    void testCoreTooFarIncomplete() {
        List<SessionLogTickDto> ticks = new ArrayList<>();
        ticks.add(SessionLogTickDto.builder().tick(1).xPos(0).yPos(0).build()); // Far from core (30,30)

        RaidCompleteRequest request = RaidCompleteRequest.builder()
                .defenderId(34L)
                .durationSeconds(40)
                .sessionLog(ticks)
                .build();

        Plot plot = new Plot();
        plot.setId(1L);
        plot.setOwnerId(34L);

        Building core = new Building() {
            @Override
            public String getBuildingType() { return "CORE"; }
            @Override
            public int getXPos() { return 30; }
            @Override
            public int getYPos() { return 30; }
        };

        when(plotRepository.findByOwnerId(34L)).thenReturn(List.of(plot));
        when(buildingRepository.findByPlotId(1L)).thenReturn(List.of(core));

        ValidatedOutcomeDto outcome = raidValidator.validateSession(request, "BLUE", 500, 100);
        assertEquals("INCOMPLETE", outcome.getOutcome());
    }
}
