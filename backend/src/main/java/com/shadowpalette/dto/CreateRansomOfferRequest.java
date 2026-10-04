package com.shadowpalette.dto;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRansomOfferRequest {
    @Min(0)
    private int coins;
    @Min(0)
    private int ink;
    @Min(0)
    private int chips;
    private String message;
}
