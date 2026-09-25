package com.shadowpalette.liveraid.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RaidInviteMessage {
    private String type; // RAID_INVITE
    private String raidId;
    private Long attackerUserId;
    private String attackerName;
    private Long defenderUserId;
    private String joinDeadline;
    private int joinSeconds;
}
