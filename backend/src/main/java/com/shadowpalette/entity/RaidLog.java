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

    private boolean isDetected;

    private String outcome;

    private LocalDateTime timestamp;

    private int durationSeconds;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String sessionLogJson;
}
