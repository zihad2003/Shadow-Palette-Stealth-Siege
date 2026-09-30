package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RaidHistoryDto {
    private Long id;
    private String raidId;
    private Long opponentId;
    private String opponentUsername;
    private String outcome;
    private int coinsLooted;
    private int inkLooted;
    private int chipsAwarded;
    private boolean isLive;
    private boolean defenderWasOnline;
    private int durationSeconds;
    private LocalDateTime timestamp;
    private String perspective; // "ATTACKER" or "DEFENDER"
    private String endedReason;
}
