package com.shadowpalette.duo.dto;

import lombok.Data;

@Data
public class DuoReadyRequest {
    private String partyId;
    private boolean ready;
    private Integer model;
    private String camo;
    private Long defenderId;
}
