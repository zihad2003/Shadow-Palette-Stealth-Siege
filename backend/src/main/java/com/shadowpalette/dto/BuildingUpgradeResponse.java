package com.shadowpalette.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BuildingUpgradeResponse {
    private boolean success;
    private Integer newLevel;
    private Integer coinsRemaining;
    private Integer inkRemaining;
    private String error;
}
