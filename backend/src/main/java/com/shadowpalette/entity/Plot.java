package com.shadowpalette.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "plot")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Plot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int xCoord;

    private int yCoord;

    private Long ownerId;

    private boolean isOccupied;

    @Version
    private Long version;
}
