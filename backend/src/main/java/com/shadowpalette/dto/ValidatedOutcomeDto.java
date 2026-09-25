package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ValidatedOutcomeDto {
    private boolean isDetected;
    private String outcome; // SILENT, ESCAPED, CAUGHT
    /** Kept for API compat; new raids award coins/ink instead. */
    private int chipsAwarded;
    private int coinsLooted;
    private int inkLooted;
}
