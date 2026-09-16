package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminUserDetailDto {
    private boolean success;
    private AdminUserDto user;
    private List<AdminBuildingDto> buildings;
    private List<AdminRaidDto> recentRaids;
}
