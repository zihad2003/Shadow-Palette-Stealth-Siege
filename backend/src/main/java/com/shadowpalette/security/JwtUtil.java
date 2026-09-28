package com.shadowpalette.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${JWT_SECRET:very_secret_default_key_for_local_dev_only_change_in_prod}")
    private String jwtSecret;

    @Value("${spring.profiles.active:local}")
    private String activeProfile;

    private SecretKey key;
    private static final long EXPIRATION_TIME = 86400000; // 24 hours

    @PostConstruct
    public void init() {
        if ("prod".equalsIgnoreCase(activeProfile) && jwtSecret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 characters in prod profile");
        }
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(Long userId, String username) {
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("username", username)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(key)
                .compact();
    }

    public Claims validateTokenAndGetClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (Exception e) {
            return null;
        }
    }
}
