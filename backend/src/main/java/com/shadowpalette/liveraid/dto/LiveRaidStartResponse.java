package com.shadowpalette.liveraid.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveRaidStartResponse {
    private boolean success;
    private String raidId;
    /** True when defender was online and an invite was pushed over STOMP. */
    private boolean liveInviteSent;
    private String joinDeadline;
    private String message;
}
