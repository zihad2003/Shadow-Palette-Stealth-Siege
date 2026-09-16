package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PresencePlayerDto {
    private Long userId;
    private String username;
    private Integer characterModel;
    private String camoColor;
}
