package com.shadowpalette.duo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DuoSignalMessage {
    private Long fromUserId;
    private String type; // offer | answer | ice
    private Object payload;
}
