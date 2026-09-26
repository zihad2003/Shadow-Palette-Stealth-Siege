package com.shadowpalette.duo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DuoRaidStartRequest {
    private String partyId;
    private Long hostId;
    private Long defenderId;
    private String raidId;
}
