package com.shadowpalette.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "building")
@Inheritance(strategy = InheritanceType.JOINED)
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public abstract class Building {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long plotId;

    private String buildingType;

    private int modelVariant;

    private int level;

    private String hexColor;

    private int xPos;

    private int yPos;

    private int footprintWidth;

    private int footprintHeight;
}
