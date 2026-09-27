package com.shadowpalette.duo;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class DuoParty {
    private String partyId;
    private Long hostId;
    private Long guestId;
    private String hostName;
    private String guestName;

    /** LOBBY | IN_RAID | ENDED */
    private String status;

    private Long defenderId;
    private String raidId;

    private Double hostX;
    private Double hostY;
    private Instant hostUpdatedAt;

    private Double guestX;
    private Double guestY;
    private Instant guestUpdatedAt;

    private boolean alarmLatched;
    private boolean hostCaught;
    private boolean guestCaught;

    private boolean hostReady;
    private boolean guestReady;
    private Integer hostModel;
    private Integer guestModel;
    private String hostCamo;
    private String guestCamo;

    private Instant createdAt;
}
