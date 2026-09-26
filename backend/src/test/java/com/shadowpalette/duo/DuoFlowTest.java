package com.shadowpalette.duo;

import com.shadowpalette.duo.dto.DuoDecisionRequest;
import com.shadowpalette.duo.dto.DuoInviteRequest;
import com.shadowpalette.duo.dto.DuoPartyState;
import com.shadowpalette.duo.dto.DuoPositionMessage;
import com.shadowpalette.duo.dto.DuoRaidStartRequest;
import com.shadowpalette.service.PresenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DuoFlowTest {

    @Mock PresenceService presenceService;
    @Mock SimpMessagingTemplate messaging;

    DuoRegistry registry;
    DuoService duoService;

    @BeforeEach
    void setUp() {
        registry = new DuoRegistry();
        duoService = new DuoService(registry, presenceService, messaging);
    }

    @Test
    @DisplayName("Offline guest still gets a lobby invite (REST poll can deliver)")
    void offlineGuestStillInvited() {
        when(presenceService.isOnline(34L)).thenReturn(false);
        DuoPartyState res = duoService.invite(DuoInviteRequest.builder()
                .hostId(12L).guestId(34L).hostName("H").build());
        assertTrue(res.isSuccess());
        assertEquals("INVITE_SENT_MAYBE_OFFLINE", res.getMessage());
        assertEquals("LOBBY", res.getStatus());
        DuoPartyState pending = duoService.forUser(34L);
        assertTrue(pending.isSuccess());
        assertEquals("DUO_INVITE", pending.getType());
    }

    @Test
    @DisplayName("Invite → accept → start raid → positions sync")
    void inviteAcceptRaid() {
        when(presenceService.isOnline(34L)).thenReturn(true);
        DuoPartyState invited = duoService.invite(DuoInviteRequest.builder()
                .hostId(12L).guestId(34L).hostName("Host12").build());
        assertTrue(invited.isSuccess());
        assertEquals("LOBBY", invited.getStatus());
        verify(messaging).convertAndSend(eq("/topic/duo-invite/34"), any(Object.class));

        DuoPartyState accepted = duoService.accept(DuoDecisionRequest.builder()
                .partyId(invited.getPartyId()).userId(34L).build());
        assertTrue(accepted.isSuccess());

        DuoPartyState raid = duoService.startRaid(DuoRaidStartRequest.builder()
                .partyId(invited.getPartyId())
                .hostId(12L)
                .defenderId(55L)
                .raidId("raid-duo-1")
                .build());
        assertEquals("IN_RAID", raid.getStatus());
        assertEquals(55L, raid.getDefenderId());

        duoService.updatePosition(invited.getPartyId(), DuoPositionMessage.builder()
                .userId(12L).x(10).y(10).alarm(false).build());
        DuoPartyState after = duoService.updatePosition(invited.getPartyId(), DuoPositionMessage.builder()
                .userId(34L).x(11).y(10).alarm(true).build());
        assertTrue(after.isAlarmLatched());
        assertEquals(10.0, after.getHostX());
        assertEquals(11.0, after.getGuestX());
    }
}
