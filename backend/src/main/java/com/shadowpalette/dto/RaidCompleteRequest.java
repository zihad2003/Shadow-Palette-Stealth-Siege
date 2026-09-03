package com.shadowpalette.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RaidCompleteRequest {
    @NotNull(message = "attackerId is required")
    private Long attackerId;

    @NotNull(message = "defenderId is required")
    private Long defenderId;

    private int durationSeconds;
    private List<WallBreakEventDto> wallBreakEvents;
    private List<SessionLogTickDto> sessionLog;
    private ClientReportedOutcomeDto clientReportedOutcome;

    /** Locked when the raid starts. Server ignores later client color changes. */
    private String lockedCamoColor;

    /** Defender real tile colors keyed "column,row". Visual grayscale is ignored. */
    private Map<String, String> tileColors;

    private Integer searchlightLevel;
}
