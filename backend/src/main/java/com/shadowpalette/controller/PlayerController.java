package com.shadowpalette.controller;

import com.shadowpalette.dto.PlayerPrestigeRequest;
import com.shadowpalette.dto.PlayerPrestigeResponse;
import com.shadowpalette.dto.PlayerSetupRequest;
import com.shadowpalette.dto.PlayerSetupResponse;
import com.shadowpalette.dto.SessionStartRequest;
import com.shadowpalette.dto.SessionStartResponse;
import com.shadowpalette.service.PlayerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PlayerController {

    private final PlayerService playerService;

    /**
     * Resolve or create a player identity. If the client supplies a valid userId that
     * exists in the database, it is returned. Otherwise the server generates a new
     * unique user ID, creates the User row, and returns it. The frontend must call
     * this on first load when it has no stored userId.
     */
    @PostMapping("/session/start")
    public ResponseEntity<SessionStartResponse> startSession(@RequestBody(required = false) SessionStartRequest request) {
        SessionStartResponse response = playerService.startSession(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/player/setup")
    public ResponseEntity<PlayerSetupResponse> setupPlayer(@Valid @RequestBody PlayerSetupRequest request) {
        PlayerSetupResponse response = playerService.setupPlayer(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/player/prestige")
    public ResponseEntity<PlayerPrestigeResponse> performPrestige(@Valid @RequestBody PlayerPrestigeRequest request) {
        PlayerPrestigeResponse response = playerService.performPrestige(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/player/save")
    public ResponseEntity<com.shadowpalette.dto.PlayerSaveResponse> saveProgress(@Valid @RequestBody com.shadowpalette.dto.PlayerSaveRequest request) {
        com.shadowpalette.dto.PlayerSaveResponse response = playerService.saveProgress(request);
        return ResponseEntity.ok(response);
    }
}
