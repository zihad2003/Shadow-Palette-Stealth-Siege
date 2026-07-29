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
public class BuildingPlaceResponse {
    private boolean success;
    private Long buildingId;
    private Integer inkRemaining;
    private String error;
    private Double colorUsagePercent;
}
