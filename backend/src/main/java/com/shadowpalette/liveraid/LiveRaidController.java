package com.shadowpalette.liveraid;

import com.shadowpalette.liveraid.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class LiveRaidController {

    private final LiveRaidService liveRaidService;

    /** Hook called when an attacker begins a raid — may push a live invite if defender is online. */
    @PostMapping("/api/raid/start")
    public ResponseEntity<LiveRaidStartResponse> startRaid(@RequestBody LiveRaidStartRequest request) {
        return ResponseEntity.ok(liveRaidService.startRaid(request));
    }

    @MessageMapping("/live-raid/{raidId}/join")
    public LiveRaidStateMessage join(
            @DestinationVariable String raidId,
            @Payload LiveRaidJoinRequest request,
            SimpMessageHeaderAccessor headers
    ) {
        return liveRaidService.join(raidId, request, headers.getSessionId());
    }

    @MessageMapping("/live-raid/{raidId}/position")
    public LiveRaidStateMessage position(
            @DestinationVariable String raidId,
            @Payload LiveRaidPositionMessage request,
            SimpMessageHeaderAccessor headers
    ) {
        return liveRaidService.updatePosition(raidId, request, headers.getSessionId());
    }
}
