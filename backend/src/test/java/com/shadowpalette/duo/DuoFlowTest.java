package com.shadowpalette.duo;

import com.shadowpalette.duo.dto.DuoDecisionRequest;
import com.shadowpalette.duo.dto.DuoInviteRequest;
import com.shadowpalette.duo.dto.DuoPartyState;
import com.shadowpalette.duo.dto.DuoPositionMessage;
import com.shadowpalette.duo.dto.DuoRaidStartRequest;
import com.shadowpalette.duo.dto.DuoReadyRequest;
import com.shadowpalette.service.PresenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import com.shadowpalette.security.UserPrincipal;
import java.util.Collections;

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
        setUserId(1L);
        registry = new DuoRegistry();
        duoService = new DuoService(registry, presenceService, messaging);
    }

    @Test
    @DisplayName("Offline guest still gets a lobby invite (REST poll can deliver)")
    void offlineGuestStillInvited() {
        when(presenceService.isOnline(34L)).thenReturn(false);
        DuoPartyState res = duoService.invite(DuoInviteRequest.builder()
                .guestId(34L).hostName("H").build());
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
                .guestId(34L).hostName("Host12").build());
        assertTrue(invited.isSuccess());
        assertEquals("LOBBY", invited.getStatus());
        verify(messaging).convertAndSend(eq("/topic/duo-invite/34"), any(Object.class));

        setUserId(34L);
        DuoPartyState accepted = duoService.accept(DuoDecisionRequest.builder()
                .partyId(invited.getPartyId()).build());
        assertTrue(accepted.isSuccess());

        setUserId(1L);
        DuoPartyState raid = duoService.startRaid(DuoRaidStartRequest.builder()
                .partyId(invited.getPartyId())
                
                .defenderId(55L)
                .raidId("raid-duo-1")
                .build());
        assertEquals("IN_RAID", raid.getStatus());
        assertEquals(55L, raid.getDefenderId());

        duoService.updatePosition(invited.getPartyId(), DuoPositionMessage.builder()
                .x(10).y(10).alarm(false).build(), 1L);
        DuoPartyState after = duoService.updatePosition(invited.getPartyId(), DuoPositionMessage.builder()
                .x(10.1).y(10).alarm(true).build(), 1L);
        assertTrue(after.isAlarmLatched());
        assertEquals(10.1, after.getHostX());
        
    }

    @Test
    @DisplayName("Both ready locks one target and one shared drop time")
    void bothReadyShareDrop() {
        when(presenceService.isOnline(34L)).thenReturn(true);
        DuoPartyState invited = duoService.invite(DuoInviteRequest.builder()
                .guestId(34L).hostName("Host12").build());
        setUserId(34L);
        assertTrue(duoService.accept(DuoDecisionRequest.builder().partyId(invited.getPartyId()).build()).isSuccess());

        setUserId(34L);
        DuoReadyRequest guest = new DuoReadyRequest();
        guest.setPartyId(invited.getPartyId());
        guest.setReady(true);
        DuoPartyState guestReady = duoService.setReady(guest);
        assertEquals("LOBBY", guestReady.getStatus());

        setUserId(1L);
        DuoReadyRequest host = new DuoReadyRequest();
        host.setPartyId(invited.getPartyId());
        host.setReady(true);
        host.setDefenderId(101L);
        DuoPartyState breach = duoService.setReady(host);
        assertEquals("IN_RAID", breach.getStatus());
        assertEquals(101L, breach.getDefenderId());
        assertNotNull(breach.getRaidId());
        assertNotNull(breach.getLaunchAt());
        assertTrue(breach.getLaunchAt() > System.currentTimeMillis());

        DuoPartyState seenByGuest = duoService.forUser(34L);
        assertEquals(breach.getRaidId(), seenByGuest.getRaidId());
        assertEquals(breach.getLaunchAt(), seenByGuest.getLaunchAt());
        assertEquals(101L, seenByGuest.getDefenderId());
    }

    private void setUserId(Long userId) {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(new UserPrincipal(userId, "user" + userId), null, Collections.emptyList())
        );
    }

}