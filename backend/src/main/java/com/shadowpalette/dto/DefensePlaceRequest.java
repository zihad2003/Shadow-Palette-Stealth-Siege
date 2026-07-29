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
public class DefensePlaceRequest {
    @NotNull(message = "userId is required")
    private Long userId;

    @NotNull(message = "plotId is required")
    private Long plotId;

    @NotNull(message = "defenseType is required")
    private String defenseType; // LIGHTHOUSE, PATROL_ROBOT, PATROLROBOT

    private int modelVariant;
}
