package com.shadowpalette.stealth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetectionResult {
    private boolean isDetected;
    private boolean inCoreZone;
    private boolean inEdgeZone;
    private String reason; // "CORE_ZONE", "EDGE_ZONE_MISMATCH", "SAFE_EDGE_ZONE_MATCH", "OUTSIDE_RANGE", "OUTSIDE_CONE"
}
