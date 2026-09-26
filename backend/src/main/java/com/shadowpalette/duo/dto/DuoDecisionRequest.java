package com.shadowpalette.duo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DuoDecisionRequest {
    private String partyId;
    private Long userId;
}
