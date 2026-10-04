package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RansomOfferDto {
    private Long id;
    private Long jailStayId;
    private String offeredBy;
    private int coins;
    private int ink;
    private int chips;
    private String message;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private int roundNumber;
}
