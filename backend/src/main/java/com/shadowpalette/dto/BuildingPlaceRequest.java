package com.shadowpalette.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuildingPlaceRequest {
    @NotNull(message = "userId is required")
    private Long userId;

    @NotNull(message = "plotId is required")
    private Long plotId;

    private String action; // "PLACE_BUILDING"

    @NotNull(message = "buildingType is required")
    private String buildingType; // CRAFT_HOUSE, INK_HOUSE, SLEEP_HOUSE, COIN_GENERATOR

    private int modelVariant;

    private int xPos;

    private int yPos;

    private String hexColor;
}
