package com.shadowpalette.liveraid.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveRaidPositionMessage {
    /** ATTACKER or DEFENDER */
    private String role;
    private double x;
    private double y;
    private String status;
    private String outcome;
    /** Defender hold-F progress 0..1 while status is CATCH. */
    private Double catchProgress;
    private Integer model;
    private String camo;
}
