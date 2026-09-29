package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RansomOfferRequest {
    private Long attackerId;
    private Long defenderId;
    private int coins;
    private int chips;
    private String message;
    private boolean voiceRequested;
}
