package com.shadowpalette.service;

import com.shadowpalette.dto.JailStayDto;
import com.shadowpalette.liveraid.dto.LiveRaidStartRequest;
import com.shadowpalette.liveraid.dto.LiveRaidStartResponse;
import com.shadowpalette.entity.JailStay;
import com.shadowpalette.entity.User;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.liveraid.LiveRaidService;
import com.shadowpalette.repository.JailStayRepository;
import com.shadowpalette.repository.UserRepository;
import com.shadowpalette.security.UserPrincipal;
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
class JailFlowTest {

    @Autowired
    private JailService jailService;

    @Autowired
    private RaidService raidService;

    @Autowired
    private LiveRaidService liveRaidService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JailStayRepository jailStayRepository;

    private void authenticate(Long userId, String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        new UserPrincipal(userId, username), null, List.of()
                )
        );
    }

    @Test
    @DisplayName("CAUGHT live raid creates JailStay; prisoner blocked from raiding; released on expiration")
    void testJailLifecycleAndBlocking() {
        // Create 2 real players
        User prisoner = userRepository.save(User.builder()
                .id(3001L)
                .username("SneakyThief")
                .camoColor("RED")
                .coins(400)
                .inkEnergy(50)
                .chips(100)
                .isBot(false)
                .build());

        User captor = userRepository.save(User.builder()
                .id(3002L)
                .username("FortressWarden")
                .camoColor("BLUE")
                .coins(1000)
                .inkEnergy(200)
                .chips(500)
                .isBot(false)
                .build());

        String raidId = "raid_caught_" + UUID.randomUUID();

        // Simulate live caught
        raidService.completeLiveCaught(prisoner.getId(), captor.getId(), 50, raidId);

        // Verify JailStay created
        assertTrue(jailService.isJailed(prisoner.getId()), "Prisoner should be jailed");
        JailStay stay = jailStayRepository.findFirstByPrisonerIdAndStatus(prisoner.getId(), "JAILED").orElse(null);
        assertNotNull(stay);
        assertEquals(captor.getId(), stay.getCaptorId());
        assertEquals(raidId, stay.getRaidId());
        assertTrue(stay.getReleaseAt().isAfter(LocalDateTime.now()));

        // Check JailStayDto
        JailStayDto dto = jailService.toDto(stay, prisoner.getId());
        assertNotNull(dto);
        assertEquals("SneakyThief", dto.getPrisonerUsername());
        assertEquals("FortressWarden", dto.getCaptorUsername());
        assertTrue(dto.getRemainingSeconds() > 0);

        // Prisoner attempts to raid via getRaidTarget -> should throw ATTACKER_IN_JAIL
        ApiException ex = assertThrows(ApiException.class, () -> {
            raidService.getRaidTarget(102L, prisoner.getId());
        });
        assertEquals("ATTACKER_IN_JAIL", ex.getMessage());

        // Prisoner attempts to start live raid -> blocked
        authenticate(prisoner.getId(), "SneakyThief");
        LiveRaidStartResponse startResp = liveRaidService.startRaid(LiveRaidStartRequest.builder()
                .defenderId(102L)
                .raidId("blocked_raid")
                .attackerName("SneakyThief")
                .build());
        assertFalse(startResp.isSuccess());
        assertEquals("ATTACKER_IN_JAIL", startResp.getMessage());

        // Fast-forward release time to simulate expiration
        stay.setReleaseAt(LocalDateTime.now().minusSeconds(1));
        jailStayRepository.save(stay);

        // Scheduled release runs
        jailService.releaseExpiredStays();

        // Check prisoner is no longer jailed
        assertFalse(jailService.isJailed(prisoner.getId()), "Prisoner should be released after expiration");
        JailStay releasedStay = jailStayRepository.findById(stay.getId()).orElseThrow();
        assertEquals("EXPIRED_RELEASED", releasedStay.getStatus());
    }
}
