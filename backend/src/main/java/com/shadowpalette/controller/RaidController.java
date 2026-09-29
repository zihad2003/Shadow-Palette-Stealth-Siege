package com.shadowpalette.controller;

import com.shadowpalette.dto.RaidCompleteRequest;
import com.shadowpalette.dto.RaidCompleteResponse;
import com.shadowpalette.dto.RaidTargetResponse;
import com.shadowpalette.service.RaidService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/raid")
@RequiredArgsConstructor
public class RaidController {

    private final RaidService raidService;

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
