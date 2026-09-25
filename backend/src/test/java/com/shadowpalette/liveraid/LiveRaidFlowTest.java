package com.shadowpalette.liveraid;

import com.shadowpalette.liveraid.dto.LiveRaidJoinRequest;
import com.shadowpalette.liveraid.dto.LiveRaidPositionMessage;
import com.shadowpalette.liveraid.dto.LiveRaidStartRequest;
import com.shadowpalette.liveraid.dto.LiveRaidStartResponse;
import com.shadowpalette.liveraid.dto.LiveRaidStateMessage;
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

import java.time.Instant;

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

    LiveRaidRegistry registry;
    LiveRaidService liveRaidService;

    @BeforeEach
    void setUp() {
        registry = new LiveRaidRegistry();
        liveRaidService = new LiveRaidService(registry, presenceService, messaging, raidService);
    }

    @Test
    @DisplayName("Offline defender → no invite, async raid continues")
    void offlineNoInvite() {
        when(presenceService.isOnline(34L)).thenReturn(false);
        LiveRaidStartResponse res = liveRaidService.startRaid(LiveRaidStartRequest.builder()
                .attackerId(12L)
                .defenderId(34L)
                .raidId("r1")
                .attackerName("Attacker")
                .build());
        assertTrue(res.isSuccess());
        assertFalse(res.isLiveInviteSent());
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    @DisplayName("Online defender receives invite; join + catch awards CAUGHT via RaidService")
    void inviteJoinCatch() {
        when(presenceService.isOnline(34L)).thenReturn(true);

        LiveRaidStartResponse start = liveRaidService.startRaid(LiveRaidStartRequest.builder()
                .attackerId(12L)
                .defenderId(34L)
                .raidId("raid-live-1")
                .attackerName("Raider12")
                .build());
        assertTrue(start.isLiveInviteSent());
        verify(messaging).convertAndSend(eq("/topic/raid-invite/34"), any(Object.class));

        LiveRaidStateMessage joined = liveRaidService.join(
                "raid-live-1",
                LiveRaidJoinRequest.builder().userId(34L).role("DEFENDER").build(),
                "ws-def"
        );
        assertTrue(joined.isJoined());
        assertEquals("DEFENDER_JOINED", joined.getMessage());

        // Place both on same tile — server must emit CAUGHT and call completeLiveCaught.
        liveRaidService.updatePosition(
                "raid-live-1",
                LiveRaidPositionMessage.builder().userId(12L).role("ATTACKER").x(10).y(10).build(),
                "ws-atk"
        );
        LiveRaidStateMessage caught = liveRaidService.updatePosition(
                "raid-live-1",
                LiveRaidPositionMessage.builder().userId(34L).role("DEFENDER").x(10.2).y(10.1).build(),
                "ws-def"
        );

        assertTrue(caught.isTerminal());
        assertEquals("CAUGHT", caught.getOutcome());
        verify(raidService).completeLiveCaught(eq(12L), eq(34L), anyInt());
        assertTrue(registry.get("raid-live-1").isEmpty(), "session torn down after catch");

        verify(messaging, atLeastOnce()).convertAndSend(eq("/topic/live-raid/raid-live-1/state"), any(Object.class));
    }

    @Test
    @DisplayName("Impossible teleport is rejected; catch distance uses StealthConstants")
    void speedRejectAndCatchDistance() {
        assertTrue(LiveRaidService.isSpeedOk(null, null, null, 5, 5, Instant.now(), 3.68));
        Instant t0 = Instant.now();
        // 20 tiles in 0.1s at walk speed → reject
        assertFalse(LiveRaidService.isSpeedOk(0.0, 0.0, t0, 20.0, 0.0, t0.plusMillis(100), 3.68));
        assertTrue(StealthConstants.ROBOT_CATCH_DISTANCE >= 0.5);
    }

    @Test
    @DisplayName("Defender disconnect mid-raid flips joined=false (AI fallback)")
    void defenderDisconnectFallback() {
        when(presenceService.isOnline(34L)).thenReturn(true);
        liveRaidService.startRaid(LiveRaidStartRequest.builder()
                .attackerId(12L).defenderId(34L).raidId("raid-d").attackerName("A").build());
        liveRaidService.join("raid-d", LiveRaidJoinRequest.builder().userId(34L).build(), "ws-def");
        assertTrue(registry.get("raid-d").orElseThrow().isJoined());

        liveRaidService.onWsDisconnect("ws-def");
        LiveRaidSession s = registry.get("raid-d").orElseThrow();
        assertFalse(s.isJoined());
        assertFalse(s.isTerminal());
    }
}
