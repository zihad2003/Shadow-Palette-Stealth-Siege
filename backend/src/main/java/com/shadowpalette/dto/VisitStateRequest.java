package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisitStateRequest {
    private Long visitId;
    private Long userId;
    private Boolean seated;
    private Integer gear;
    private Double trackT;
}
