package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisitPositionMessage {
    private Long visitId;
    private Boolean seated;
    private Integer gear;
    private Double trackT;
    private Double column;
    private Double row;
    private String reaction;
    private String chat;
}
