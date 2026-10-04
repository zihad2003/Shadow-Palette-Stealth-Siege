package com.shadowpalette.service;

import com.shadowpalette.entity.*;
import com.shadowpalette.factory.BuildingFactory;
import com.shadowpalette.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class BotSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PlotRepository plotRepository;
    private final BuildingRepository buildingRepository;
    private final BuildingFactory buildingFactory;
    private final LighthouseRepository lighthouseRepository;
    private final PatrolRobotRepository patrolRobotRepository;

    public record BotBuildingConfig(String type, int x, int y, int level, String hexColor) {}

    public record BotConfig(
            long id,
            String name,
            String camo,
            int level,
            int coins,
            int ink,
            int chips,
            boolean lighthouse,
            boolean patrol,
            List<BotBuildingConfig> buildings
    ) {}

    public static final List<BotConfig> BOT_CONFIGS = List.of(
            new BotConfig(
                    101L, "Crimson Citadel", "RED", 2, 450, 90, 280, true, true,
                    List.of(
                            new BotBuildingConfig("COIN_GENERATOR", 21, 18, 3, "#E53E3E"),
                            new BotBuildingConfig("INK_HOUSE", 3, 3, 2, "#FF6B6B"),
                            new BotBuildingConfig("INK_HOUSE", 42, 34, 2, "#FF6B6B"),
                            new BotBuildingConfig("CRAFT_HOUSE", 42, 3, 2, "#C53030"),
                            new BotBuildingConfig("SLEEP_HOUSE", 3, 34, 2, "#9B2C2C")
                    )
            ),
            new BotConfig(
                    102L, "Emerald Vault", "GREEN", 1, 350, 70, 200, false, true,
                    List.of(
                            new BotBuildingConfig("COIN_GENERATOR", 2, 2, 2, "#38A169"),
                            new BotBuildingConfig("COIN_GENERATOR", 43, 35, 2, "#38A169"),
                            new BotBuildingConfig("INK_HOUSE", 24, 3, 1, "#48BB78"),
                            new BotBuildingConfig("SLEEP_HOUSE", 3, 20, 1, "#2F855A")
                    )
            ),
            new BotConfig(
                    103L, "Cobalt Bastion", "BLUE", 3, 680, 130, 420, true, true,
                    List.of(
                            new BotBuildingConfig("COIN_GENERATOR", 3, 3, 3, "#3182CE"),
                            new BotBuildingConfig("COIN_GENERATOR", 42, 3, 3, "#3182CE"),
                            new BotBuildingConfig("INK_HOUSE", 3, 34, 3, "#4299E1"),
                            new BotBuildingConfig("INK_HOUSE", 42, 34, 3, "#4299E1"),
                            new BotBuildingConfig("CRAFT_HOUSE", 21, 3, 2, "#2B6CB0"),
                            new BotBuildingConfig("SLEEP_HOUSE", 21, 34, 2, "#2C5282")
                    )
            ),
            new BotConfig(
                    104L, "Amber Refinery", "YELLOW", 2, 520, 80, 310, true, true,
                    List.of(
                            new BotBuildingConfig("COIN_GENERATOR", 16, 16, 2, "#D69E2E"),
                            new BotBuildingConfig("COIN_GENERATOR", 26, 16, 3, "#ECC94B"),
                            new BotBuildingConfig("COIN_GENERATOR", 21, 26, 2, "#D69E2E"),
                            new BotBuildingConfig("INK_HOUSE", 3, 3, 2, "#FAF089"),
                            new BotBuildingConfig("CRAFT_HOUSE", 42, 34, 2, "#B7791F")
                    )
            ),
            new BotConfig(
                    105L, "Amethyst Sanctum", "PURPLE", 4, 950, 180, 580, true, true,
                    List.of(
                            new BotBuildingConfig("COIN_GENERATOR", 21, 3, 4, "#805AD5"),
                            new BotBuildingConfig("JAIL", 21, 18, 3, "#553C9A"),
                            new BotBuildingConfig("INK_HOUSE", 3, 18, 3, "#9F7AEA"),
                            new BotBuildingConfig("INK_HOUSE", 42, 18, 3, "#9F7AEA"),
                            new BotBuildingConfig("CRAFT_HOUSE", 3, 34, 3, "#6B46C1"),
                            new BotBuildingConfig("SLEEP_HOUSE", 42, 34, 3, "#44337A")
                    )
            )
    );

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedBots();
    }

    @Transactional
    public void seedBots() {
        for (BotConfig cfg : BOT_CONFIGS) {
            seedBot(cfg);
        }
    }

    private void seedBot(BotConfig cfg) {
        User user = userRepository.findById(cfg.id()).orElse(null);
        if (user == null) {
            user = User.builder()
                    .id(cfg.id())
                    .username(cfg.name())
                    .camoColor(cfg.camo())
                    .characterModel(1)
                    .coins(cfg.coins())
                    .inkEnergy(cfg.ink())
                    .chips(cfg.chips())
                    .prestigeLevel(cfg.level())
                    .termsAccepted(true)
                    .isBot(true)
                    .build();
            userRepository.save(user);
            log.info("Seeded bot user {} ({})", cfg.name(), cfg.id());
        } else if (!user.isBot()) {
            user.setBot(true);
            userRepository.save(user);
        }

        List<Plot> existingPlots = plotRepository.findByOwnerId(cfg.id());
        Plot plot;
        if (existingPlots == null || existingPlots.isEmpty()) {
            plot = plotRepository.save(Plot.builder()
                    .ownerId(cfg.id())
                    .isOccupied(true)
                    .xCoord((int) cfg.id())
                    .yCoord(0)
                    .build());
            log.info("Seeded plot for bot {} ({})", cfg.name(), cfg.id());
        } else {
            plot = existingPlots.get(0);
        }

        List<Building> existingBuildings = buildingRepository.findByPlotId(plot.getId());
        if (existingBuildings.isEmpty()) {
            for (BotBuildingConfig bCfg : cfg.buildings()) {
                Building b = buildingFactory.createBuilding(
                        bCfg.type(),
                        plot.getId(),
                        1,
                        bCfg.x(),
                        bCfg.y(),
                        bCfg.hexColor()
                );
                b.setLevel(bCfg.level());
                buildingRepository.save(b);
            }
            log.info("Seeded {} buildings for bot {}", cfg.buildings().size(), cfg.name());
        }

        if (cfg.lighthouse()) {
            if (lighthouseRepository.findByPlotId(plot.getId()).isEmpty()) {
                lighthouseRepository.save(Lighthouse.builder()
                        .plotId(plot.getId())
                        .modelVariant(1)
                        .coneAngle(60)
                        .coneRange(7)
                        .sweepSpeed(1.0f)
                        .build());
            }
        }

        if (cfg.patrol()) {
            if (patrolRobotRepository.findByPlotId(plot.getId()).isEmpty()) {
                patrolRobotRepository.save(PatrolRobot.builder()
                        .plotId(plot.getId())
                        .currentState("PATROLLING")
                        .baseSpeed(1.0f)
                        .build());
            }
        }
    }
}
