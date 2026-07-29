package com.shadowpalette.controller;

import com.shadowpalette.dto.PlayerPrestigeRequest;
import com.shadowpalette.dto.PlayerPrestigeResponse;
import com.shadowpalette.dto.PlayerSetupRequest;
import com.shadowpalette.dto.PlayerSetupResponse;
import com.shadowpalette.service.PlayerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/player")
@RequiredArgsConstructor
public class PlayerController {

    private final PlayerService playerService;

    @PostMapping("/setup")
    public ResponseEntity<PlayerSetupResponse> setupPlayer(@Valid @RequestBody PlayerSetupRequest request) {
        PlayerSetupResponse response = playerService.setupPlayer(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/prestige")
    public ResponseEntity<PlayerPrestigeResponse> performPrestige(@Valid @RequestBody PlayerPrestigeRequest request) {
        PlayerPrestigeResponse response = playerService.performPrestige(request);
        return ResponseEntity.ok(response);
    }
}
