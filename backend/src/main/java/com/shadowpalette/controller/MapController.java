package com.shadowpalette.controller;

import com.shadowpalette.dto.MapResponse;
import com.shadowpalette.service.MapService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MapController {

    private final MapService mapService;

    @GetMapping("/map")
    public ResponseEntity<MapResponse> getMap() {
        MapResponse response = mapService.getMap();
        return ResponseEntity.ok(response);
    }
}
