package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminActionResponse {
    private boolean success;
    private String message;
    private AdminUserDto user;
    private Integer seeded;
}
