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
public class PlayerSaveRequest {
    @NotNull(message = "userId is required")
    private Long userId;

    private String worldSaveJson;
    private Integer coins;
    private Integer inkEnergy;
    private Integer chips;
    private Integer prestigeLevel;
    private Boolean termsAccepted;
}
