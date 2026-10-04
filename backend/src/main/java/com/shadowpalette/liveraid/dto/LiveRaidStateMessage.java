package com.shadowpalette.liveraid.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveRaidStateMessage {
    private String raidId;
    private boolean joined;
    private boolean terminal;
    private String outcome; // null | CAUGHT | DEFENDER_LEFT
    private Double attackerX;
    private Double attackerY;
    private Integer attackerModel;
    private String attackerCamo;
    private Double robotX;
    private Double robotY;
    private Integer defenderModel;
    private String defenderCamo;
    private String message;
    private String status;
    /** Defender hold-F progress 0..1 — attacker slows while grabbed. */
    private Double catchProgress;
    private String catchTarget;
}
