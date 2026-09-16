package com.shadowpalette.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "visit_invite")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisitInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long hostId;

    private Long guestId;

    private String status;

    private LocalDateTime expiresAt;

    private LocalDateTime createdAt;
}
