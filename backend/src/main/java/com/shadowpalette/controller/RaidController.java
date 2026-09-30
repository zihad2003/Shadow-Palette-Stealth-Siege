package com.shadowpalette.controller;

import com.shadowpalette.dto.RaidCompleteRequest;
import com.shadowpalette.dto.RaidCompleteResponse;
import com.shadowpalette.dto.RaidTargetResponse;
import com.shadowpalette.service.RaidService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.shadowpalette.dto.RaidTargetDto;
import com.shadowpalette.security.SecurityUtils;
import java.util.List;

@RestController
@RequestMapping("/api/raid")
@RequiredArgsConstructor
public class RaidController {

    private final RaidService raidService;

    @GetMapping("/targets")
    public ResponseEntity<List<RaidTargetDto>> getRaidTargets() {
        Long callerId = SecurityUtils.getCurrentUserId();
        List<RaidTargetDto> targets = raidService.getRaidTargets(callerId);
        return ResponseEntity.ok(targets);
    }

    @GetMapping("/history")
    public ResponseEntity<org.springframework.data.domain.Page<com.shadowpalette.dto.RaidHistoryDto>> getRaidHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(raidService.getHistoryForUser(userId, page, size));
    }

    @GetMapping("/target/{userId}")
    public ResponseEntity<RaidTargetResponse> getRaidTarget(
            @PathVariable Long userId,
            @RequestParam(required = false) Long attackerId
    ) {
        RaidTargetResponse response = raidService.getRaidTarget(userId, attackerId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/complete")
    public ResponseEntity<RaidCompleteResponse> completeRaid(@Valid @RequestBody RaidCompleteRequest request) {
        RaidCompleteResponse response = raidService.completeRaid(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/ransom/offer")
    public ResponseEntity<com.shadowpalette.dto.RansomResponse> offerRansom(@Valid @RequestBody com.shadowpalette.dto.RansomOfferRequest request) {
        return ResponseEntity.ok(raidService.handleRansomOffer(request));
    }

    @PostMapping("/ransom/settle")
    public ResponseEntity<com.shadowpalette.dto.RansomResponse> settleRansom(@Valid @RequestBody com.shadowpalette.dto.RansomSettleRequest request) {
        return ResponseEntity.ok(raidService.handleRansomSettle(request));
    }
}
