package com.shadowpalette.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PlayerPrestigeResponse {
    private boolean success;
    private int newPrestigeLevel;
    private int stealthBonusPercent;
    private String error;
}
