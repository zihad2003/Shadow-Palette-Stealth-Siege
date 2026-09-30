package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JailStayDto {
    private Long id;
    private Long prisonerId;
    private String prisonerUsername;
    private Long captorId;
    private String captorUsername;
    private String raidId;
    private LocalDateTime jailedAt;
    private LocalDateTime releaseAt;
    private long remainingSeconds;
    private String status;
    private int ransomOfferCount;
    private List<RansomOfferDto> offers;
    private boolean canOffer;
}
