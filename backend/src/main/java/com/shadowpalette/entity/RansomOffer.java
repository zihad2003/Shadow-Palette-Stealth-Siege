package com.shadowpalette.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ransom_offer")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RansomOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "jail_stay_id", nullable = false)
    private Long jailStayId;

    @Column(name = "offered_by", nullable = false, length = 32)
    private String offeredBy;

    @Column(name = "coins", nullable = false)
    private int coins;

    @Column(name = "ink", nullable = false)
    @Builder.Default
    private int ink = 0;

    @Column(name = "chips", nullable = false)
    @Builder.Default
    private int chips = 0;

    @Column(name = "message")
    private String message;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "round_number", nullable = false)
    @Builder.Default
    private int roundNumber = 1;
}
