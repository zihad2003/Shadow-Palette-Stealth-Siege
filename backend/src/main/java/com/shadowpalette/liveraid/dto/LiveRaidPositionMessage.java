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
    private Long userId;
    /** ATTACKER or DEFENDER */
    private String role;
    private double x;
    private double y;
}
