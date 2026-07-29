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
public class BuildingUpgradeRequest {
    @NotNull(message = "userId is required")
    private Long userId;

    @NotNull(message = "targetId is required")
    private Long targetId;

    private String targetType; // "BUILDING"
}
