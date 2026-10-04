package com.shadowpalette.controller;

import com.shadowpalette.dto.CreateRansomOfferRequest;
import com.shadowpalette.dto.JailCaptureRequest;
import com.shadowpalette.dto.JailStayDto;
import com.shadowpalette.dto.RansomOfferDto;
import com.shadowpalette.dto.RansomResponse;
import com.shadowpalette.entity.JailStay;
import com.shadowpalette.security.SecurityUtils;
import com.shadowpalette.service.JailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/jail")
@RequiredArgsConstructor
public class JailController {

    private final JailService jailService;

    @GetMapping("/me")
    public ResponseEntity<JailStayDto> getMyJailStay() {
        Long callerId = SecurityUtils.getCurrentUserId();
        if (callerId == null) {
            return ResponseEntity.status(401).build();
        }
        Optional<JailStay> activeStay = jailService.getActiveJailStayForParticipant(callerId);
        if (activeStay.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(jailService.toDto(activeStay.get(), callerId));
    }

    /** Async raid catch — prisoner reports capture so negotiation can use persisted jail stay. */
    @PostMapping("/capture")
    public ResponseEntity<JailStayDto> capture(@RequestBody JailCaptureRequest request) {
        Long callerId = SecurityUtils.getCurrentUserId();
        if (callerId == null) {
            return ResponseEntity.status(401).build();
        }
        if (request == null || request.getCaptorId() == null) {
            return ResponseEntity.badRequest().build();
        }
        JailStay stay = jailService.createJailStay(callerId, request.getCaptorId(), request.getRaidId());
        if (stay == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(jailService.toDto(stay, callerId));
    }

    @PostMapping("/{stayId}/offers")
    public ResponseEntity<RansomOfferDto> createOffer(
            @PathVariable Long stayId,
            @Valid @RequestBody CreateRansomOfferRequest request
    ) {
        Long callerId = SecurityUtils.getCurrentUserId();
        if (callerId == null) {
            return ResponseEntity.status(401).build();
        }
        RansomOfferDto dto = jailService.createOffer(
                stayId,
                callerId,
                request.getCoins(),
                request.getInk(),
                request.getChips(),
                request.getMessage()
        );
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/offers/{offerId}/accept")
    public ResponseEntity<RansomResponse> acceptOffer(@PathVariable Long offerId) {
        Long callerId = SecurityUtils.getCurrentUserId();
        if (callerId == null) {
            return ResponseEntity.status(401).build();
        }
        RansomResponse response = jailService.acceptOffer(offerId, callerId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/offers/{offerId}/reject")
    public ResponseEntity<RansomResponse> rejectOffer(@PathVariable Long offerId) {
        Long callerId = SecurityUtils.getCurrentUserId();
        if (callerId == null) {
            return ResponseEntity.status(401).build();
        }
        RansomResponse response = jailService.rejectOffer(offerId, callerId);
        return ResponseEntity.ok(response);
    }
}
