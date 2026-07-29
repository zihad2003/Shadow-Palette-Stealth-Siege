package com.shadowpalette.observer;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetectionEvent {
    private double playerX;
    private double playerY;
    private String reason; // CORE_ZONE, EDGE_ZONE_MISMATCH
    private long timestamp;
}
