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
public class PresenceHeartbeatRequest {
    private Long userId;
    private String username;
    private Integer characterModel;
    private String camoColor;
    private Map<String, Object> snapshot;
}
