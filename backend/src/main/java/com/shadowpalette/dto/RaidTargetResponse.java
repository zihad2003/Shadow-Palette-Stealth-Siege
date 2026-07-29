package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RaidTargetResponse {
    private Long defenderId;
    private Map<String, Object> layout;
    private int chipsAvailable;
}
