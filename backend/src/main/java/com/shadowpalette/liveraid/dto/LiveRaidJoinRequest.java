package com.shadowpalette.liveraid.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveRaidJoinRequest {
    private Long userId;
    private String role; // DEFENDER
}
