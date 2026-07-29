package com.shadowpalette.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "patrol_robot")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatrolRobot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plot_id", unique = true, nullable = false)
    private Long plotId;

    private String currentState;

    private float baseSpeed;
}
