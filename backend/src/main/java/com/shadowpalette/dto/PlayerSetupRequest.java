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
public class PlayerSetupRequest {
    @NotNull(message = "userId is required")
    private Long userId;

    private int characterModel; // 1-3

    private String camoColor; // RED/GREEN/BLUE/YELLOW/PURPLE
}
