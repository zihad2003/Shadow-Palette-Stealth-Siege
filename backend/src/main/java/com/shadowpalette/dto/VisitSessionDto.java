package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisitSessionDto {
    private boolean success;
    private Long visitId;
    private Long hostId;
    private Long guestId;
    private String hostName;
    private String guestName;
    private Integer hostModel;
    private Integer guestModel;
    private String hostCamo;
    private String guestCamo;
    private boolean hostSeated;
    private boolean guestSeated;
    private int gear;
    private double trackT;
    private Map<String, Object> snapshot;
    private String status;
    private String message;
}
