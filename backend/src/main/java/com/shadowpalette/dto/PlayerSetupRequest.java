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
    private int characterModel; // 1 male, 2 female

    private String camoColor; // RED/GREEN/BLUE/YELLOW/PURPLE

    private String username;
}
