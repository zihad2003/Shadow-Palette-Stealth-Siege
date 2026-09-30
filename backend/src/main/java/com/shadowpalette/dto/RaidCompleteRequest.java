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

    @NotNull(message = "defenderId is required")
    private Long defenderId;

    private int durationSeconds;
    private String raidId;
    /** Shared duo raid id. Each attacker still sends their own raidId. */
    private String potId;
    /** 2 during a duo raid so the defender is charged one shared pot, not twice. */
    private Integer partySize;
    private List<WallBreakEventDto> wallBreakEvents;
    private List<SessionLogTickDto> sessionLog;
    private ClientReportedOutcomeDto clientReportedOutcome;

    /** Locked when the raid starts. Server ignores later client color changes. */
    private String lockedCamoColor;

    /** Defender real tile colors keyed "column,row". Visual grayscale is ignored. */
    private Map<String, String> tileColors;

    private Integer searchlightLevel;
}
