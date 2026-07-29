package com.shadowpalette.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "wall_block")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WallBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long plotId;

    private int xPos;

    private int yPos;

    private String hexColor;

    private boolean isGate;

    private boolean isLocked;

    private int breakProgress;
}
