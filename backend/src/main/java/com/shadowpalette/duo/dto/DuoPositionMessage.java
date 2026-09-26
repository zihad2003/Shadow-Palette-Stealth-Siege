package com.shadowpalette.duo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DuoPositionMessage {
    private Long userId;
    private double x;
    private double y;
    private boolean alarm;
}
