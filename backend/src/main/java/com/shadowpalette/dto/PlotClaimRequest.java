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
public class PlotClaimRequest {
    @NotNull(message = "userId is required")
    private Long userId;

    @NotNull(message = "plotId is required")
    private Long plotId;
}
