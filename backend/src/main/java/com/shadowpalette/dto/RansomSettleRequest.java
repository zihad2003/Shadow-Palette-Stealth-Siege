package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RansomSettleRequest {
    private Long attackerId;
    private Long defenderId;
    private boolean accepted;
    private int agreedCoins;
}
