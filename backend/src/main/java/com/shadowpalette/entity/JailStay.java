package com.shadowpalette.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "jail_stay")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JailStay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "prisoner_id", nullable = false)
    private Long prisonerId;

    @Column(name = "captor_id", nullable = false)
    private Long captorId;

    @Column(name = "raid_id", length = 64)
    private String raidId;

    @Column(name = "jailed_at", nullable = false)
    private LocalDateTime jailedAt;

    @Column(name = "release_at", nullable = false)
    private LocalDateTime releaseAt;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "ransom_offer_count", nullable = false)
    @Builder.Default
    private int ransomOfferCount = 0;
}
