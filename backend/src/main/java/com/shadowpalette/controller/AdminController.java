package com.shadowpalette.controller;

import com.shadowpalette.dto.AdminActionResponse;
import com.shadowpalette.dto.AdminOverviewDto;
import com.shadowpalette.dto.AdminUserDetailDto;
import com.shadowpalette.dto.AdminUserListResponse;
import com.shadowpalette.dto.AdminUserWriteRequest;
import com.shadowpalette.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/overview")
    public ResponseEntity<AdminOverviewDto> overview() {
        return ResponseEntity.ok(adminService.overview());
    }

    @GetMapping("/users")
    public ResponseEntity<AdminUserListResponse> listUsers(@RequestParam(value = "q", required = false) String query) {
        return ResponseEntity.ok(adminService.listUsers(query));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<AdminUserDetailDto> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getUser(id));
    }

    @PostMapping("/users")
    public ResponseEntity<AdminActionResponse> createUser(@RequestBody AdminUserWriteRequest request) {
        return ResponseEntity.ok(adminService.createUser(request));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<AdminActionResponse> updateUser(
            @PathVariable Long id,
            @RequestBody AdminUserWriteRequest request
    ) {
        return ResponseEntity.ok(adminService.updateUser(id, request));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<AdminActionResponse> deleteUser(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.deleteUser(id));
    }

    @PostMapping("/seed")
    public ResponseEntity<AdminActionResponse> seed() {
        return ResponseEntity.ok(adminService.seedDemoUsers());
    }
}
