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
    private Double robotX;
    private Double robotY;
    private String message;
}
