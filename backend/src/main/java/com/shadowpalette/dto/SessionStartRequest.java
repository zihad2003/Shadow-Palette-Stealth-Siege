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
public class SessionStartRequest {
    /** Optional — if the client already has a persisted userId, send it for validation. */
    private Long userId;

    /** Optional — if player wants to login or register by username. */
    private String username;

    /** Optional passcode for the player account. */
    private String password;
}
