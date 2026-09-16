package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminOverviewDto {
    private boolean success;
    private long userCount;
    private long occupiedPlots;
    private long raidCount;
    private long totalCoins;
    private long totalInk;
    private long totalChips;
}
