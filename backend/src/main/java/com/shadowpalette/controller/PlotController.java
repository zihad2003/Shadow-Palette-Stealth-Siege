package com.shadowpalette.controller;

import com.shadowpalette.dto.PlotClaimRequest;
import com.shadowpalette.dto.PlotClaimResponse;
import com.shadowpalette.service.PlotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/plot")
@RequiredArgsConstructor
public class PlotController {

    private final PlotService plotService;

    @PostMapping("/claim")
    public ResponseEntity<PlotClaimResponse> claimPlot(@Valid @RequestBody PlotClaimRequest request) {
        PlotClaimResponse response = plotService.claimPlot(request);
        return ResponseEntity.ok(response);
    }
}
