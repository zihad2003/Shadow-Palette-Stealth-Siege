package com.shadowpalette.controller;

import com.shadowpalette.dto.RaidHistoryDto;
import com.shadowpalette.security.SecurityUtils;
import com.shadowpalette.service.RaidService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/history")
@RequiredArgsConstructor
public class HistoryController {

    private final RaidService raidService;

    @GetMapping("/me")
    public ResponseEntity<Page<RaidHistoryDto>> getMyHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        Page<RaidHistoryDto> history = raidService.getHistoryForUser(userId, page, size);
        return ResponseEntity.ok(history);
    }
}
