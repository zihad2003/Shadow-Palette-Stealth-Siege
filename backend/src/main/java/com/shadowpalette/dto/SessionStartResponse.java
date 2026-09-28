package com.shadowpalette.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SessionStartResponse {
    private boolean success;
    /** The server-authoritative userId — may be newly generated or validated from client input. */
    private Long userId;
    private String username;
    private boolean newUser;
    private String worldSaveJson;
    private Integer coins;
    private Integer inkEnergy;
    private Integer chips;
    private Integer characterModel;
    private String camoColor;
    private Integer prestigeLevel;
    private Boolean termsAccepted;
}
