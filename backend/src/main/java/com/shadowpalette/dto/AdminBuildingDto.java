package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminBuildingDto {
    private Long id;
    private String buildingType;
    private int level;
    private String hexColor;
    private int xPos;
    private int yPos;
}
