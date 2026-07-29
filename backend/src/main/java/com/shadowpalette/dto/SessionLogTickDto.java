package com.shadowpalette.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionLogTickDto {
    private int tick;

    @JsonProperty("xPos")
    private double xPos;

    @JsonProperty("yPos")
    private double yPos;
}
