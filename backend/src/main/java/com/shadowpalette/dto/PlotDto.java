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
public class PlotDto {
    private Long id;

    @JsonProperty("xCoord")
    private int xCoord;

    @JsonProperty("yCoord")
    private int yCoord;

    private Long ownerId;

    @JsonProperty("isOccupied")
    private boolean isOccupied;
}
