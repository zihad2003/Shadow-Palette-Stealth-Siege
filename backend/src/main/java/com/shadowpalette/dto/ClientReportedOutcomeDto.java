package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientReportedOutcomeDto {
    private boolean isDetected;
    private String outcome; // SILENT, ESCAPED, CAUGHT
    /** Legacy field — server ignores client loot amounts and computes from defender balances. */
    private int chipsRequested;
    private Integer coinsRequested;
    private Integer inkRequested;
}
