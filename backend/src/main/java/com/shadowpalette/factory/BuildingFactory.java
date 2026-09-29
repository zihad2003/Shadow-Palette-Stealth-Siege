package com.shadowpalette.factory;

import com.shadowpalette.entity.*;
import com.shadowpalette.util.Colors;
import org.springframework.stereotype.Component;

@Component
public class BuildingFactory {

    public Building createBuilding(String buildingType, Long plotId, int modelVariant, int xPos, int yPos, String hexColor) {
        if (buildingType == null) {
            throw new IllegalArgumentException("INVALID_BUILDING_TYPE");
        }

        String typeUpper = buildingType.trim().toUpperCase();
        String normalizedColor = Colors.normalizeHex(hexColor);
        int variant = modelVariant > 0 ? modelVariant : 1;

        switch (typeUpper) {
            case "CRAFT_HOUSE":
            case "CRAFTHOUSE":
                return CraftHouse.builder()
                        .plotId(plotId)
                        .buildingType("CRAFT_HOUSE")
                        .modelVariant(variant)
                        .level(1)
                        .hexColor(normalizedColor)
                        .xPos(xPos)
                        .yPos(yPos)
                        .footprintWidth(4)
                        .footprintHeight(4)
                        .build();

            case "INK_HOUSE":
            case "INKHOUSE":
                return InkHouse.builder()
                        .plotId(plotId)
                        .buildingType("INK_HOUSE")
                        .modelVariant(variant)
                        .level(1)
                        .hexColor(normalizedColor)
                        .xPos(xPos)
                        .yPos(yPos)
                        .footprintWidth(3)
                        .footprintHeight(3)
                        .build();

            case "SLEEP_HOUSE":
            case "SLEEPHOUSE":
                return SleepHouse.builder()
                        .plotId(plotId)
                        .buildingType("SLEEP_HOUSE")
                        .modelVariant(variant)
                        .level(1)
                        .hexColor(normalizedColor)
                        .xPos(xPos)
                        .yPos(yPos)
                        .footprintWidth(3)
                        .footprintHeight(3)
                        .build();

            case "COIN_GENERATOR":
            case "COINGENERATOR":
                return CoinGenerator.builder()
                        .plotId(plotId)
                        .buildingType("COIN_GENERATOR")
                        .modelVariant(variant)
                        .level(1)
                        .hexColor(normalizedColor)
                        .xPos(xPos)
                        .yPos(yPos)
                        .footprintWidth(4)
                        .footprintHeight(3)
                        .build();

            case "JAIL":
            case "BASE_JAIL":
                return Jail.builder()
                        .plotId(plotId)
                        .buildingType("JAIL")
                        .modelVariant(variant)
                        .level(1)
                        .hexColor(normalizedColor)
                        .xPos(xPos)
                        .yPos(yPos)
                        .footprintWidth(3)
                        .footprintHeight(3)
                        .prisonerCapacity(1)
                        .build();

            default:
                throw new IllegalArgumentException("INVALID_BUILDING_TYPE");
        }
    }
}
