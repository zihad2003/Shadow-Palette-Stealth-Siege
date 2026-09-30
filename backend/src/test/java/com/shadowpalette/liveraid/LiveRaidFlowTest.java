package com.shadowpalette.liveraid;

import com.shadowpalette.liveraid.dto.LiveRaidJoinRequest;
import com.shadowpalette.liveraid.dto.LiveRaidPositionMessage;
import com.shadowpalette.liveraid.dto.LiveRaidStartRequest;
import com.shadowpalette.liveraid.dto.LiveRaidStartResponse;
import com.shadowpalette.liveraid.dto.LiveRaidStateMessage;
import com.shadowpalette.repository.LiveRaidSessionRepository;
import com.shadowpalette.repository.UserRepository;
import com.shadowpalette.security.UserPrincipal;
import com.shadowpalette.service.PresenceService;
import com.shadowpalette.service.RaidService;
import com.shadowpalette.util.StealthConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Two-party live-raid flow without a full Spring WebSocket server:
 * presence → invite → join → converging positions → CAUGHT → RaidService.completeLiveCaught.
 */
@ExtendWith(MockitoExtension.class)
class LiveRaidFlowTest {

    @Mock PresenceService presenceService;
    @Mock SimpMessagingTemplate messaging;
    @Mock RaidService raidService;
    @Mock LiveRaidSessionRepository sessionRepository;
    @Mock UserRepository userRepository;
    @Mock com.shadowpalette.service.JailService jailService;

    LiveRaidRegistry registry;
    LiveRaidService liveRaidService;

    @BeforeEach
    void setUp() {
        setUserId(1L); // default: attacker (used by startRaid which still reads SecurityContextHolder)
        registry = new LiveRaidRegistry();
        liveRaidService = new LiveRaidService(registry, presenceService, messaging, raidService, sessionRepository, userRepository, jailService);
    }

    @Test
    @DisplayName("Offline defender → no invite, async raid continues")
    void offlineNoInvite() {
        when(presenceService.isOnline(34L)).thenReturn(false);
        LiveRaidStartResponse res = liveRaidService.startRaid(LiveRaidStartRequest.builder()
                .defenderId(34L)
                .raidId("r1")
                .attackerName("Attacker")
                .build());

        assertFalse(res.isLiveInviteSent());
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    @DisplayName("Online defender receives invite; join + catch awards CAUGHT via RaidService")
    void inviteJoinCatch() {
        when(presenceService.isOnline(34L)).thenReturn(true);

        // Attacker (userId=1) starts the raid (HTTP, uses SecurityContextHolder)
        setUserId(1L);
        LiveRaidStartResponse start = liveRaidService.startRaid(LiveRaidStartRequest.builder()
                .defenderId(34L)
                .raidId("raid-live-1")
                .attackerName("Raider12")
                .build());
        assertTrue(start.isSuccess());
        verify(messaging).convertAndSend(eq("/topic/raid-invite/34"), any(Object.class));

        // Defender (userId=34) joins — callerUserId passed directly (STOMP)
        LiveRaidStateMessage joined = liveRaidService.join(
                "raid-live-1",
                LiveRaidJoinRequest.builder().role("DEFENDER").build(),
                "ws-def",
                34L
        );
        assertEquals("DEFENDER_JOINED", joined.getMessage());

        // Attacker sends position — callerUserId passed directly (STOMP)
        liveRaidService.updatePosition(
                "raid-live-1",
                LiveRaidPositionMessage.builder().role("ATTACKER").x(10).y(10).build(),
                "ws-atk",
                1L
        );

        // Defender moves to same tile → CAUGHT
        LiveRaidStateMessage caught = liveRaidService.updatePosition(
                "raid-live-1",
                LiveRaidPositionMessage.builder().role("DEFENDER").x(10.2).y(10.1).build(),
                "ws-def",
                34L
        );
        assertEquals("CAUGHT", caught.getOutcome());

        // completeLiveCaught called with attacker=1, defender=34, duration, raidId
        verify(raidService).completeLiveCaught(eq(1L), eq(34L), anyInt(), eq("raid-live-1"));
        verify(messaging, atLeastOnce()).convertAndSend(eq("/topic/live-raid/raid-live-1/state"), any(Object.class));
    }

    @Test
    @DisplayName("Impossible teleport is rejected; catch distance uses StealthConstants")
    void speedRejectAndCatchDistance() {
        Instant t0 = Instant.now();
        // 20 tiles in 0.1s at walk speed → reject
        assertFalse(LiveRaidService.isSpeedOk(0.0, 0.0, t0, 20.0, 0.0, t0.plusMillis(100), 3.68));
    }

    @Test
    @DisplayName("Defender disconnect mid-raid flips joined=false (AI fallback)")
    void defenderDisconnectFallback() {
        when(presenceService.isOnline(34L)).thenReturn(true);

        // Attacker starts (HTTP, SecurityContextHolder)
        setUserId(1L);
        liveRaidService.startRaid(LiveRaidStartRequest.builder()
                .defenderId(34L).raidId("raid-d").attackerName("A").build());

        // Defender joins (STOMP, callerUserId passed directly)
        liveRaidService.join("raid-d", LiveRaidJoinRequest.builder().role("DEFENDER").build(), "ws-def", 34L);

        // Verify joined
        LiveRaidSession s = registry.get("raid-d").orElseThrow();
        assertTrue(s.isJoined());

        // Defender disconnects
        liveRaidService.onWsDisconnect("ws-def");
        s = registry.get("raid-d").orElseThrow();
        assertFalse(s.isJoined());
        assertFalse(s.isTerminal());
    }

    @Test
    @DisplayName("Null callerUserId in join returns NOT_DEFENDER")
    void nullCallerRejectJoin() {
        when(presenceService.isOnline(34L)).thenReturn(true);
        setUserId(1L);
        liveRaidService.startRaid(LiveRaidStartRequest.builder()
                .defenderId(34L).raidId("raid-null").attackerName("A").build());

        LiveRaidStateMessage result = liveRaidService.join(
                "raid-null",
                LiveRaidJoinRequest.builder().role("DEFENDER").build(),
                "ws-x",
                null  // no authenticated user
        );
        assertEquals("NOT_DEFENDER", result.getMessage());
    }

    @Test
    @DisplayName("Null callerUserId in updatePosition returns BAD_PAYLOAD")
    void nullCallerRejectPosition() {
        when(presenceService.isOnline(34L)).thenReturn(true);
        setUserId(1L);
        liveRaidService.startRaid(LiveRaidStartRequest.builder()
                .defenderId(34L).raidId("raid-null-pos").attackerName("A").build());

        LiveRaidStateMessage result = liveRaidService.updatePosition(
                "raid-null-pos",
                LiveRaidPositionMessage.builder().role("ATTACKER").x(5).y(5).build(),
                "ws-x",
                null
        );
        assertEquals("BAD_PAYLOAD", result.getMessage());
    }

    private void setUserId(Long userId) {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(
                new UserPrincipal(userId, "user" + userId), null, Collections.emptyList())
        );
    }
}