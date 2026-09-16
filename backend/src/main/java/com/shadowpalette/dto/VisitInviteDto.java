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
public class VisitInviteDto {
    private boolean success;
    private Long id;
    private Long hostId;
    private Long guestId;
    private String hostName;
    private String guestName;
    private String status;
    private String expiresAt;
    private Map<String, Object> snapshot;
    private String message;
}
