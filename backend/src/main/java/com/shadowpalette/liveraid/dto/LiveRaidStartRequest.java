package com.shadowpalette.liveraid.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveRaidStartRequest {
    private Long attackerId;
    private Long defenderId;
    /** Optional client-generated id; server generates one if blank. */
    private String raidId;
    private String attackerName;
}
