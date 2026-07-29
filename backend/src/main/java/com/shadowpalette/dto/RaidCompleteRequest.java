package com.shadowpalette.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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
}
