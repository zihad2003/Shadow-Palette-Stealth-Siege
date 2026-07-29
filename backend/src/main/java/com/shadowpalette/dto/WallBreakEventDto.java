package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WallBreakEventDto {
    private Long wallBlockId;
    private int hits;
    private boolean gateWasLocked;
}
