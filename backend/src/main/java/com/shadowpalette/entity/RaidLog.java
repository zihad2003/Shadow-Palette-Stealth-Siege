package com.shadowpalette.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "raid_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RaidLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long attackerId;

    private Long defenderId;

    private int stolenChips;

    private int stolenCoins;

    private int stolenInk;

    private boolean isDetected;

    private String outcome;

    private LocalDateTime timestamp;

    private int durationSeconds;

    @Column(columnDefinition = "TEXT")
    private String sessionLogJson;

    @Column(name = "is_live", nullable = false)
    @Builder.Default
    private boolean isLive = false;

    @Column(name = "defender_was_online", nullable = false)
    @Builder.Default
    private boolean defenderWasOnline = false;

    @Column(name = "raid_id", unique = true)
    private String raidId;

    @Column(name = "ended_reason", length = 100)
    private String endedReason;
}
