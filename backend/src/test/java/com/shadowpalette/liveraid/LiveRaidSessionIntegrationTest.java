package com.shadowpalette.liveraid;

import com.shadowpalette.entity.LiveRaidSessionEntity;
import com.shadowpalette.entity.User;
import com.shadowpalette.liveraid.dto.LiveRaidJoinRequest;
import com.shadowpalette.liveraid.dto.LiveRaidPositionMessage;
import com.shadowpalette.liveraid.dto.LiveRaidStartRequest;
import com.shadowpalette.liveraid.dto.LiveRaidStartResponse;
import com.shadowpalette.repository.LiveRaidSessionRepository;
import com.shadowpalette.repository.UserRepository;
import com.shadowpalette.security.UserPrincipal;
import com.shadowpalette.service.PresenceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LiveRaidSessionIntegrationTest {

    @Autowired
    private LiveRaidService liveRaidService;

    @Autowired
    private LiveRaidSessionRepository sessionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PresenceService presenceService;

    private void authenticate(Long userId, String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        new UserPrincipal(userId, username), null, List.of()
                )
        );
    }

    @Test
    @DisplayName("Starting raid against bot defender skips live invite and live_raid_session table")
    void testBotDefenderSkipsLiveInvite() {
        authenticate(101L, "Attacker");

        // 102 is a seeded bot
        String raidId = "raid_bot_" + UUID.randomUUID();
        LiveRaidStartResponse resp = liveRaidService.startRaid(LiveRaidStartRequest.builder()
                .defenderId(102L)
                .raidId(raidId)
                .attackerName("Attacker")
                .build());

        assertNotNull(resp);
        assertTrue(resp.isSuccess());
        assertFalse(resp.isLiveInviteSent());
        assertEquals("DEFENDER_BOT_ASYNC", resp.getMessage());
        assertTrue(sessionRepository.findByRaidId(raidId).isEmpty());
    }

    @Test
    @DisplayName("Starting raid against online real defender persists INVITED and ACTIVE upon join")
    void testRealDefenderLiveLifecycle() {
        // Create real defender
        User defender = userRepository.save(User.builder()
                .id(2050L)
                .username("RealDefender")
                .camoColor("BLUE")
                .isBot(false)
                .coins(500)
                .inkEnergy(100)
                .chips(50)
                .lastSeenAt(LocalDateTime.now())
                .build());

        authenticate(101L, "Attacker");

        String raidId = "raid_real_" + UUID.randomUUID();
        LiveRaidStartResponse startResp = liveRaidService.startRaid(LiveRaidStartRequest.builder()
                .defenderId(defender.getId())
                .raidId(raidId)
                .attackerName("Attacker")
                .build());

        assertNotNull(startResp);
        assertTrue(startResp.isSuccess());
        assertTrue(startResp.isLiveInviteSent());

        // Check DB: entity created with status INVITED
        LiveRaidSessionEntity entity = sessionRepository.findByRaidId(raidId).orElse(null);
        assertNotNull(entity);
        assertEquals("INVITED", entity.getStatus());
        assertEquals(101L, entity.getAttackerId());
        assertEquals(2050L, entity.getDefenderId());

        // Defender joins
        liveRaidService.join(raidId, LiveRaidJoinRequest.builder().build(), "ws-def-1", 2050L);

        // Check DB: entity updated to ACTIVE
        LiveRaidSessionEntity activeEntity = sessionRepository.findByRaidId(raidId).orElseThrow();
        assertEquals("ACTIVE", activeEntity.getStatus());

        // Attacker sets position
        liveRaidService.updatePosition(
                raidId,
                LiveRaidPositionMessage.builder().role("ATTACKER").x(15.0).y(15.0).build(),
                "ws-atk-1",
                101L
        );

        // Defender catches attacker at same tile
        var state = liveRaidService.updatePosition(
                raidId,
                LiveRaidPositionMessage.builder().role("DEFENDER").x(15.1).y(15.0).build(),
                "ws-def-1",
                2050L
        );

        assertEquals("CAUGHT", state.getOutcome());

        // Check DB: entity updated to CAUGHT with endedAt set
        LiveRaidSessionEntity caughtEntity = sessionRepository.findByRaidId(raidId).orElseThrow();
        assertEquals("CAUGHT", caughtEntity.getStatus());
        assertNotNull(caughtEntity.getEndedAt());
    }
}
