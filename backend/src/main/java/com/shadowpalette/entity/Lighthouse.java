package com.shadowpalette.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "lighthouse")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lighthouse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plot_id", unique = true, nullable = false)
    private Long plotId;

    private int modelVariant;

    private int coneAngle;

    private int coneRange;

    private float sweepSpeed;
}
