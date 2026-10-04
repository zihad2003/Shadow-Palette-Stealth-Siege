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
    @DisplayName("Human defender gets a silent live session even if presence missed a heartbeat")
    void humanGetsSilentSessionWithoutPresence() {
        when(userRepository.findById(34L)).thenReturn(java.util.Optional.empty());
        LiveRaidStartResponse res = liveRaidService.startRaid(LiveRaidStartRequest.builder()
                .defenderId(34L)
                .raidId("r1")
                .attackerName("Attacker")
                .build());

        assertTrue(res.isLiveInviteSent());
        verify(messaging).convertAndSend(eq("/topic/raid-invite/34"), any(Object.class));
    }

    @Test
    @DisplayName("Online defender receives invite; hold-F catch + jail drop awards CAUGHT via RaidService")
    void inviteJoinCatch() {
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

        // CATCH from outside catch range is rejected (first defender pose, 4 tiles away)
        LiveRaidStateMessage tooFar = liveRaidService.updatePosition(
                "raid-live-1",
                LiveRaidPositionMessage.builder().role("DEFENDER").x(14.0).y(10.0).status("CATCH").build(),
                "ws-def",
                34L
        );
        assertEquals("CATCH_TOO_FAR", tooFar.getMessage());

        // Standing next to the raider no longer auto-catches — the owner must hold F.
        LiveRaidStateMessage near = liveRaidService.updatePosition(
                "raid-live-1",
                LiveRaidPositionMessage.builder().role("DEFENDER").x(11.6).y(10.0).build(),
                "ws-def",
                34L
        );
        assertNull(near.getOutcome());
        assertFalse(near.isTerminal());

        // Hold-F catch in range immediately jails the raider
        LiveRaidStateMessage jailed = liveRaidService.updatePosition(
                "raid-live-1",
                LiveRaidPositionMessage.builder().role("DEFENDER").x(10.4).y(10.0)
                        .status("CATCH").outcome("CAUGHT_IN_JAIL").build(),
                "ws-def",
                34L
        );
        assertTrue(jailed.isTerminal());
        assertEquals("CAUGHT_IN_JAIL", jailed.getOutcome());

        // completeLiveCaught called with attacker=1, defender=34, duration, raidId
        verify(raidService).completeLiveCaught(eq(1L), eq(34L), anyInt(), eq("raid-live-1"));
        verify(messaging, atLeastOnce()).convertAndSend(eq("/topic/live-raid/raid-live-1/state"), any(Object.class));
    }

    @Test
    @DisplayName("Attacker RAID_ENDED closes the session so the defender's screen clears")
    void attackerEndsRun() {
        setUserId(1L);
        liveRaidService.startRaid(LiveRaidStartRequest.builder()
                .defenderId(34L).raidId("raid-end").attackerName("A").build());
        liveRaidService.join("raid-end", LiveRaidJoinRequest.builder().role("DEFENDER").build(), "ws-def", 34L);

        LiveRaidStateMessage ended = liveRaidService.updatePosition(
                "raid-end",
                LiveRaidPositionMessage.builder().role("ATTACKER").x(24).y(39).outcome("RAID_ENDED").build(),
                "ws-atk",
                1L
        );
        assertTrue(ended.isTerminal());
        assertEquals("RAID_ENDED", ended.getOutcome());
        assertTrue(registry.get("raid-end").isEmpty());
        verify(raidService, never()).completeLiveCaught(anyLong(), anyLong(), anyInt(), anyString());
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
