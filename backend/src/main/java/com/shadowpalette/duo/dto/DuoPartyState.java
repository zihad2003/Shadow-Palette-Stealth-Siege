package com.shadowpalette.duo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DuoPartyState {
    private boolean success;
    private String partyId;
    private Long hostId;
    private Long guestId;
    private String hostName;
    private String guestName;
    private String status;
    private Long defenderId;
    private String raidId;
    /** Epoch millis. Both players enter together when this time is reached. */
    private Long launchAt;
    private Double hostX;
    private Double hostY;
    private Double guestX;
    private Double guestY;
    private boolean alarmLatched;
    private boolean hostCaught;
    private boolean guestCaught;
    private boolean hostReady;
    private boolean guestReady;
    private boolean guestJoined;
    private Integer hostModel;
    private Integer guestModel;
    private String hostCamo;
    private String guestCamo;
    private String message;
    private String type; // for invites: DUO_INVITE
}
