package com.shadowpalette.service;

import com.shadowpalette.dto.*;
import com.shadowpalette.entity.Building;
import com.shadowpalette.entity.User;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.factory.BuildingFactory;
import com.shadowpalette.repository.BuildingRepository;
import com.shadowpalette.repository.UserRepository;
import com.shadowpalette.util.Colors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BuildingService {

    private final BuildingRepository buildingRepository;
    private final UserRepository userRepository;
    private final BuildingFactory buildingFactory;

    @Transactional
    public BuildingPlaceResponse placeBuilding(BuildingPlaceRequest request) {
        String targetColor = Colors.normalizeHex(request.getHexColor());
        List<Building> existingBuildings = buildingRepository.findByPlotId(request.getPlotId());

        // Calculate surface tile footprint of new building
        int newBuildingFootprint = getFootprintTiles(request.getBuildingType());

        // Calculate total tiles using this color on the plot
        int existingColorTiles = existingBuildings.stream()
                .filter(b -> targetColor.equalsIgnoreCase(Colors.normalizeHex(b.getHexColor())))
                .mapToInt(b -> b.getFootprintWidth() * b.getFootprintHeight())
                .sum();

        int totalColorTiles = existingColorTiles + newBuildingFootprint;
        double usagePercent = Colors.calculateUsagePercent(totalColorTiles, Colors.PLOT_TOTAL_TILES);

        if (usagePercent > Colors.MAX_COLOR_QUOTA_PERCENT) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "COLOR_QUOTA_EXCEEDED", usagePercent);
        }

        // ── Overlap check: ensure the new building's footprint does not overlap
        //    any existing building's tiles on this plot. ──
        int newW = getFootprintWidth(request.getBuildingType());
        int newH = getFootprintHeight(request.getBuildingType());
        int newX = request.getXPos();
        int newY = request.getYPos();

        for (Building existing : existingBuildings) {
            int exW = existing.getFootprintWidth() > 0 ? existing.getFootprintWidth() : 3;
            int exH = existing.getFootprintHeight() > 0 ? existing.getFootprintHeight() : 3;
            int exX = existing.getXPos();
            int exY = existing.getYPos();

            // Two axis-aligned rectangles overlap iff they overlap on both axes.
            boolean xOverlap = newX < exX + exW && newX + newW > exX;
            boolean yOverlap = newY < exY + exH && newY + newH > exY;
            if (xOverlap && yOverlap) {
                throw new ApiException(HttpStatus.CONFLICT, "TILE_OCCUPIED");
            }
        }

        User user = userRepository.findById(request.getUserId())
                .orElseGet(() -> userRepository.save(User.builder()
                        .id(request.getUserId())
                        .username("Player_" + request.getUserId())
                        .coins(500)
                        .inkEnergy(100)
                        .chips(0)
                        .prestigeLevel(1)
                        .build()));

        Building building = buildingFactory.createBuilding(
                request.getBuildingType(),
                request.getPlotId(),
                request.getModelVariant(),
                request.getXPos(),
                request.getYPos(),
                targetColor
        );

        Building savedBuilding = buildingRepository.save(building);

        // Deduct Ink Energy (e.g. 15 ink per building placed)
        int inkCost = 15;
        if (user.getInkEnergy() >= inkCost) {
            user.setInkEnergy(user.getInkEnergy() - inkCost);
        }
        userRepository.save(user);

        return BuildingPlaceResponse.builder()
                .success(true)
                .buildingId(savedBuilding.getId())
                .inkRemaining(user.getInkEnergy())
                .build();
    }

    @Transactional
    public BuildingUpgradeResponse upgradeBuilding(BuildingUpgradeRequest request) {
        Building building = buildingRepository.findById(request.getTargetId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BUILDING_NOT_FOUND"));

        User user = userRepository.findById(request.getUserId())
                .orElseGet(() -> userRepository.save(User.builder()
                        .id(request.getUserId())
                        .username("Player_" + request.getUserId())
                        .coins(500)
                        .inkEnergy(100)
                        .chips(0)
                        .prestigeLevel(1)
                        .build()));

        int newLevel = building.getLevel() + 1;
        building.setLevel(newLevel);
        buildingRepository.save(building);

        return BuildingUpgradeResponse.builder()
                .success(true)
                .newLevel(newLevel)
                .coinsRemaining(user.getCoins())
                .inkRemaining(user.getInkEnergy())
                .build();
    }

    private int getFootprintTiles(String buildingType) {
        if (buildingType == null) return 9;
        switch (buildingType.trim().toUpperCase()) {
            case "CRAFT_HOUSE":
            case "CRAFTHOUSE":
                return 16; // 4x4
            case "COIN_GENERATOR":
            case "COINGENERATOR":
                return 12; // 4x3
            case "INK_HOUSE":
            case "INKHOUSE":
            case "SLEEP_HOUSE":
            case "SLEEPHOUSE":
            default:
                return 9; // 3x3
        }
    }

    private int getFootprintWidth(String buildingType) {
        if (buildingType == null) return 3;
        switch (buildingType.trim().toUpperCase()) {
            case "CRAFT_HOUSE":
            case "CRAFTHOUSE":
                return 4;
            case "COIN_GENERATOR":
            case "COINGENERATOR":
                return 4;
            default:
                return 3;
        }
    }

    private int getFootprintHeight(String buildingType) {
        if (buildingType == null) return 3;
        switch (buildingType.trim().toUpperCase()) {
            case "CRAFT_HOUSE":
            case "CRAFTHOUSE":
                return 4;
            case "COIN_GENERATOR":
            case "COINGENERATOR":
                return 3;
            default:
                return 3;
        }
    }
}
