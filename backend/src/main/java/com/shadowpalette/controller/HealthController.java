package com.shadowpalette.controller;

import com.shadowpalette.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HealthController {

    private final DataSource dataSource;
    private final UserRepository userRepository;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("status", "ok");
        return ResponseEntity.ok(status);
    }

    @GetMapping("/admin/health")
    public ResponseEntity<Map<String, Object>> adminHealthCheck() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("status", "ok");
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            ResultSet rs = stmt.executeQuery("SELECT 1");
            if (rs.next()) {
                status.put("database", "connected");
            }
            long userCount = userRepository.count();
            status.put("userCount", userCount);
            long maxId = userRepository.findMaxId();
            status.put("maxUserId", maxId);

            // Check SSL status
            try (ResultSet sslRs = stmt.executeQuery("SHOW STATUS LIKE 'Ssl_cipher'")) {
                if (sslRs.next()) {
                    String cipher = sslRs.getString("Value");
                    status.put("sslCipher", (cipher != null && !cipher.isEmpty()) ? cipher : "none");
                }
            } catch (Exception ignored) {
                status.put("sslCipher", "none");
            }
        } catch (Exception e) {
            status.put("database", "disconnected");
            status.put("databaseError", e.getMessage());
        }
        return ResponseEntity.ok(status);
    }
}
