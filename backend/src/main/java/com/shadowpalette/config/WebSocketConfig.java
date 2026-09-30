package com.shadowpalette.config;

import com.shadowpalette.liveraid.LiveRaidRegistry;
import com.shadowpalette.liveraid.LiveRaidSession;
import com.shadowpalette.security.JwtUtil;
import com.shadowpalette.security.UserPrincipal;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Collections;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${ALLOWED_ORIGINS:}")
    private String allowedOrigins;

    private final JwtUtil jwtUtil;
    @Lazy
    private final LiveRaidRegistry liveRaidRegistry;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] patterns;
        if (allowedOrigins != null && !allowedOrigins.isBlank()) {
            patterns = allowedOrigins.split(",");
            for (int i = 0; i < patterns.length; i++) {
                patterns[i] = patterns[i].trim();
            }
        } else {
            patterns = new String[] { "*" };
        }
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(patterns)
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue", "/user");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null) return message;

                // ── CONNECT: authenticate via JWT ──
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7);
                        Claims claims = jwtUtil.validateTokenAndGetClaims(token);
                        if (claims != null) {
                            Long userId = Long.parseLong(claims.getSubject());
                            String username = claims.get("username", String.class);
                            UserPrincipal principal = new UserPrincipal(userId, username);
                            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                    principal, null, Collections.emptyList());
                            accessor.setUser(auth);
                        } else {
                            throw new MessageDeliveryException("Invalid or expired JWT");
                        }
                    } else {
                        throw new MessageDeliveryException("Missing JWT in STOMP CONNECT");
                    }
                }

                // ── SUBSCRIBE: enforce channel-level access rules ──
                if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    String destination = accessor.getDestination();
                    Long userId = extractUserId(accessor.getUser());
                    if (destination != null && userId != null) {
                        // /topic/raid-invite/{ownId} — only subscribe to your own
                        if (destination.startsWith("/topic/raid-invite/")) {
                            String targetId = destination.substring("/topic/raid-invite/".length());
                            if (!String.valueOf(userId).equals(targetId)) {
                                throw new MessageDeliveryException("Cannot subscribe to another user's raid invites");
                            }
                        }
                        // /topic/raid-ransom/{ownId} — only subscribe to your own
                        if (destination.startsWith("/topic/raid-ransom/")) {
                            String targetId = destination.substring("/topic/raid-ransom/".length());
                            if (!String.valueOf(userId).equals(targetId)) {
                                throw new MessageDeliveryException("Cannot subscribe to another user's ransom channel");
                            }
                        }
                        // /topic/live-raid/{raidId}/state — only attacker or defender
                        if (destination.startsWith("/topic/live-raid/") && destination.endsWith("/state")) {
                            String raidId = destination
                                    .substring("/topic/live-raid/".length(),
                                               destination.length() - "/state".length());
                            LiveRaidSession session = liveRaidRegistry.get(raidId).orElse(null);
                            if (session != null
                                    && !userId.equals(session.getAttackerUserId())
                                    && !userId.equals(session.getDefenderUserId())) {
                                throw new MessageDeliveryException("Not a participant of this live raid");
                            }
                        }
                    }
                }
                return message;
            }
        });
    }

    private static Long extractUserId(java.security.Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth) {
            Object p = auth.getPrincipal();
            if (p instanceof UserPrincipal up) {
                return up.getUserId();
            }
        }
        return null;
    }
}

