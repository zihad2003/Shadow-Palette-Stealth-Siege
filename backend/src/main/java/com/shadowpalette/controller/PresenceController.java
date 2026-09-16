package com.shadowpalette.controller;

import com.shadowpalette.dto.PresenceHeartbeatRequest;
import com.shadowpalette.dto.PresenceHeartbeatResponse;
import com.shadowpalette.dto.PresenceOnlineResponse;
import com.shadowpalette.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/presence")
@RequiredArgsConstructor
public class PresenceController {

    private final PresenceService presenceService;

    @PostMapping
    public ResponseEntity<PresenceHeartbeatResponse> heartbeat(@RequestBody PresenceHeartbeatRequest request) {
        return ResponseEntity.ok(presenceService.heartbeat(request));
    }

    @GetMapping("/online")
    public ResponseEntity<PresenceOnlineResponse> online(@RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(presenceService.listOnline(userId));
    }
}
