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
public class DefensePlaceResponse {
    private boolean success;
    private Long defenseId;
    private String defenseType;
    private String error;
    private Integer successfulRaidsNeeded;
}
