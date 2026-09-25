package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminRaidDto {
    private Long id;
    private Long attackerId;
    private Long defenderId;
    private String outcome;
    private int stolenChips;
    private int stolenCoins;
    private int stolenInk;
    private boolean detected;
    private int durationSeconds;
    private String timestamp;
}
