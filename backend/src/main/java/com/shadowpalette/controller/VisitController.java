package com.shadowpalette.controller;

import com.shadowpalette.dto.*;
import com.shadowpalette.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/visit")
@RequiredArgsConstructor
public class VisitController {

    private final PresenceService presenceService;

    @PostMapping("/invite")
    public ResponseEntity<VisitInviteDto> invite(@RequestBody VisitInviteRequest request) {
        return ResponseEntity.ok(presenceService.createInvite(request));
    }

    @PostMapping("/accept")
    public ResponseEntity<VisitSessionDto> accept(@RequestBody VisitDecisionRequest request) {
        return ResponseEntity.ok(presenceService.acceptInvite(request));
    }

    @PostMapping("/decline")
    public ResponseEntity<VisitInviteDto> decline(@RequestBody VisitDecisionRequest request) {
        return ResponseEntity.ok(presenceService.declineInvite(request));
    }

    @GetMapping("/inbox/{userId}")
    public ResponseEntity<VisitInboxResponse> inbox(@PathVariable Long userId) {
        return ResponseEntity.ok(presenceService.inbox(userId));
    }

    @GetMapping("/session/{visitId}")
    public ResponseEntity<VisitSessionDto> session(@PathVariable Long visitId) {
        return ResponseEntity.ok(presenceService.getSession(visitId));
    }

    @PostMapping("/state")
    public ResponseEntity<VisitSessionDto> state(@RequestBody VisitStateRequest request) {
        return ResponseEntity.ok(presenceService.updateState(request));
    }

    @PostMapping("/end")
    public ResponseEntity<VisitSessionDto> end(@RequestBody VisitDecisionRequest request) {
        return ResponseEntity.ok(presenceService.endVisit(request));
    }
}
