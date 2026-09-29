package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RansomResponse {
    private boolean success;
    private String status;
    private Long attackerId;
    private Long defenderId;
    private int coinsTransferred;
    private String message;
}
