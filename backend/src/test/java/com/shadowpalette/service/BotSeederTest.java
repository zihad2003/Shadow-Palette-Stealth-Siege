package com.shadowpalette.service;

import com.shadowpalette.dto.RaidCompleteRequest;
import com.shadowpalette.entity.*;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class BotSeederTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PlotRepository plotRepository;

    @Autowired
    private BuildingRepository buildingRepository;

    @Autowired
    private LighthouseRepository lighthouseRepository;

    @Autowired
    private PatrolRobotRepository patrolRobotRepository;

    @Autowired
    private BotSeeder botSeeder;

    @Autowired
    private BotRegenJob botRegenJob;

    @Autowired
    private RaidService raidService;

    @Test
    @DisplayName("Startup seeder creates all 5 bot accounts with real plots, buildings, and defenses")
    void testBotsSeeded() {
        for (long botId = 101L; botId <= 105L; botId++) {
            User bot = userRepository.findById(botId).orElse(null);
            assertNotNull(bot, "Bot " + botId + " should exist");
            assertTrue(bot.isBot(), "Bot " + botId + " should have isBot=true");

            List<Plot> plots = plotRepository.findByOwnerId(botId);
            assertEquals(1, plots.size(), "Bot " + botId + " should have exactly 1 plot");
            Plot plot = plots.get(0);
            assertTrue(plot.isOccupied());

            List<Building> buildings = buildingRepository.findByPlotId(plot.getId());
            assertFalse(buildings.isEmpty(), "Bot " + botId + " should have buildings");
        }

        // Verify Bot 101 (Crimson Citadel)
        User b101 = userRepository.findById(101L).orElseThrow();
        assertEquals("Crimson Citadel", b101.getUsername());
        assertEquals("RED", b101.getCamoColor());
        assertEquals(450, b101.getCoins());
        assertEquals(90, b101.getInkEnergy());
        assertEquals(280, b101.getChips());
        Plot p101 = plotRepository.findByOwnerId(101L).get(0);
        assertEquals(5, buildingRepository.findByPlotId(p101.getId()).size());
        assertTrue(lighthouseRepository.findByPlotId(p101.getId()).isPresent());
        assertTrue(patrolRobotRepository.findByPlotId(p101.getId()).isPresent());

        // Verify Bot 102 (Emerald Vault - no lighthouse)
        Plot p102 = plotRepository.findByOwnerId(102L).get(0);
        assertEquals(4, buildingRepository.findByPlotId(p102.getId()).size());
        assertTrue(lighthouseRepository.findByPlotId(p102.getId()).isEmpty());
        assertTrue(patrolRobotRepository.findByPlotId(p102.getId()).isPresent());

        // Verify Bot 104 (Amber Refinery - no patrol)
        Plot p104 = plotRepository.findByOwnerId(104L).get(0);
        assertEquals(5, buildingRepository.findByPlotId(p104.getId()).size());
        assertTrue(lighthouseRepository.findByPlotId(p104.getId()).isPresent());
        assertTrue(patrolRobotRepository.findByPlotId(p104.getId()).isEmpty());

        // Verify Bot 105 (Amethyst Sanctum - has JAIL)
        Plot p105 = plotRepository.findByOwnerId(105L).get(0);
        List<Building> b105List = buildingRepository.findByPlotId(p105.getId());
        assertEquals(6, b105List.size());
        assertTrue(b105List.stream().anyMatch(b -> "JAIL".equalsIgnoreCase(b.getBuildingType())));
    }

    @Test
    @DisplayName("Seeding again is idempotent and does not create duplicate rows")
    void testSeederIdempotence() {
        long initialUsers = userRepository.count();
        long initialPlots = plotRepository.count();
        long initialBuildings = buildingRepository.count();

        // Run again
        botSeeder.seedBots();

        assertEquals(initialUsers, userRepository.count());
        assertEquals(initialPlots, plotRepository.count());
        assertEquals(initialBuildings, buildingRepository.count());
    }

    @Test
    @DisplayName("BotRegenJob increases drained resources up to capped max")
    void testBotRegenJob() {
        User b101 = userRepository.findById(101L).orElseThrow();
        b101.setCoins(100);
        b101.setInkEnergy(20);
        b101.setChips(50);
        userRepository.save(b101);

        botRegenJob.regenerateBotResources();

        User reloaded = userRepository.findById(101L).orElseThrow();
        assertEquals(120, reloaded.getCoins());
        assertEquals(25, reloaded.getInkEnergy());
        assertEquals(60, reloaded.getChips());
    }

    @Test
    @DisplayName("RaidService throws 404 if defender does not exist in DB")
    void testRaidServiceRejectsMissingDefender() {
        ApiException ex = assertThrows(ApiException.class, () -> raidService.getRaidTarget(999999L, 101L));
        assertEquals("USER_NOT_FOUND", ex.getMessage());
    }
}
