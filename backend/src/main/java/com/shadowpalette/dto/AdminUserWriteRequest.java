package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminUserWriteRequest {
    private Long id;
    private String username;
    private Integer coins;
    private Integer inkEnergy;
    private Integer chips;
    private Integer characterModel;
    private String camoColor;
    private Integer prestigeLevel;
}
