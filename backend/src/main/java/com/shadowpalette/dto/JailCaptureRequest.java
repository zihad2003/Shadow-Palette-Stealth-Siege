package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JailCaptureRequest {
    private Long captorId;
    private String raidId;
}
