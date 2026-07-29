package com.shadowpalette.controller;

import com.shadowpalette.dto.DefensePlaceRequest;
import com.shadowpalette.dto.DefensePlaceResponse;
import com.shadowpalette.service.DefenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/defense")
@RequiredArgsConstructor
public class DefenseController {

    private final DefenseService defenseService;

    @PostMapping("/place")
    public ResponseEntity<DefensePlaceResponse> placeDefense(@Valid @RequestBody DefensePlaceRequest request) {
        DefensePlaceResponse response = defenseService.placeDefense(request);
        return ResponseEntity.ok(response);
    }
}
