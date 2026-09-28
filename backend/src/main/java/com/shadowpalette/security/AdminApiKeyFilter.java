package com.shadowpalette.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.MessageDigest;
import java.util.Collections;

@Component
public class AdminApiKeyFilter extends OncePerRequestFilter {

    @Value("${ADMIN_API_KEY:}")
    private String adminApiKey;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/admin")) {
            filterChain.doFilter(request, response);
            return;
        }

        if (adminApiKey == null || adminApiKey.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            return;
        }

        String providedKey = request.getHeader("X-Admin-Api-Key");
        if (providedKey == null) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            return;
        }

        if (MessageDigest.isEqual(providedKey.getBytes(), adminApiKey.getBytes())) {
            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                    "admin", null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN")));
            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authToken);
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        }
    }
}
