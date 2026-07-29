package com.shadowpalette.controller;

import com.shadowpalette.dto.*;
import com.shadowpalette.service.BuildingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/building")
@RequiredArgsConstructor
public class BuildingController {

    private final BuildingService buildingService;

    @PostMapping("/place")
    public ResponseEntity<BuildingPlaceResponse> placeBuilding(@Valid @RequestBody BuildingPlaceRequest request) {
        BuildingPlaceResponse response = buildingService.placeBuilding(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/upgrade")
    public ResponseEntity<BuildingUpgradeResponse> upgradeBuilding(@Valid @RequestBody BuildingUpgradeRequest request) {
        BuildingUpgradeResponse response = buildingService.upgradeBuilding(request);
        return ResponseEntity.ok(response);
    }
}
