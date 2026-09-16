package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminUserDto {
    private Long id;
    private String username;
    private int coins;
    private int inkEnergy;
    private int chips;
    private int characterModel;
    private String camoColor;
    private int prestigeLevel;
    private String raidCooldownUntil;
    private Long plotId;
    private int buildingCount;
    private long raidAttempts;
    private long successfulRaids;
}
