package com.shadowpalette.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RaidTargetDto {
    private Long id;
    private Long ownerId;
    private String name;
    private String username;
    private boolean isBot;
    private boolean online;
    private LocalDateTime lastSeenAt;
    private String camoColor;
    private String camo;
    private int level;
    private int prestigeLevel;
    private int coins;
    private int ink;
    private int chips;
    private int buildingsCount;
    private boolean hasLighthouse;
    private boolean hasPatrol;
    private boolean hasJail;
}
