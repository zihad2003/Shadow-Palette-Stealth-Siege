package com.shadowpalette.duo;

import com.shadowpalette.duo.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/duo")
@RequiredArgsConstructor
public class DuoController {

    private final DuoService duoService;

    @PostMapping("/invite")
    public ResponseEntity<DuoPartyState> invite(@RequestBody DuoInviteRequest request) {
        return ResponseEntity.ok(duoService.invite(request));
    }

    @PostMapping("/accept")
    public ResponseEntity<DuoPartyState> accept(@RequestBody DuoDecisionRequest request) {
        return ResponseEntity.ok(duoService.accept(request));
    }

    @PostMapping("/decline")
    public ResponseEntity<DuoPartyState> decline(@RequestBody DuoDecisionRequest request) {
        return ResponseEntity.ok(duoService.decline(request));
    }

    @PostMapping("/leave")
    public ResponseEntity<DuoPartyState> leave(@RequestBody DuoDecisionRequest request) {
        return ResponseEntity.ok(duoService.leave(request));
    }

    @PostMapping("/raid/start")
    public ResponseEntity<DuoPartyState> startRaid(@RequestBody DuoRaidStartRequest request) {
        return ResponseEntity.ok(duoService.startRaid(request));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<DuoPartyState> forUser(@PathVariable Long userId) {
        return ResponseEntity.ok(duoService.forUser(userId));
    }

    @GetMapping("/{partyId}")
    public ResponseEntity<DuoPartyState> get(@PathVariable String partyId) {
        return ResponseEntity.ok(duoService.getState(partyId));
    }

    @PostMapping("/{partyId}/caught")
    public ResponseEntity<DuoPartyState> caught(
            @PathVariable String partyId,
            @RequestBody DuoDecisionRequest request
    ) {
        return ResponseEntity.ok(duoService.markCaught(partyId, request != null ? request.getUserId() : null));
    }

    @MessageMapping("/duo/{partyId}/position")
    public DuoPartyState position(
            @DestinationVariable String partyId,
            @Payload DuoPositionMessage msg
    ) {
        return duoService.updatePosition(partyId, msg);
    }

    @MessageMapping("/duo/{partyId}/signal")
    public void signal(
            @DestinationVariable String partyId,
            @Payload DuoSignalMessage msg
    ) {
        duoService.relaySignal(partyId, msg);
    }
}
