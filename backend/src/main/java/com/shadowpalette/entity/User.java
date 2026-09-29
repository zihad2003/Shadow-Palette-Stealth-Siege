package com.shadowpalette.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "`user`")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(length = 255)
    private String password;

    @Column(length = 255)
    private String passwordHash;

    @Column(length = 255)
    private String guestSecretHash;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String worldSaveJson;

    private boolean termsAccepted;

    private int coins;

    private int inkEnergy;

    private int chips;

    private int characterModel;

    private String camoColor;

    private int prestigeLevel;

    private LocalDateTime raidCooldownUntil;
}
