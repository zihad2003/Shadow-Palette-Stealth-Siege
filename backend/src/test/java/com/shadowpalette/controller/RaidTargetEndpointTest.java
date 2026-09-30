package com.shadowpalette.controller;

import com.shadowpalette.dto.PresenceHeartbeatRequest;
import com.shadowpalette.dto.RaidTargetDto;
import com.shadowpalette.entity.Plot;
import com.shadowpalette.entity.User;
import com.shadowpalette.repository.PlotRepository;
import com.shadowpalette.repository.UserRepository;
import com.shadowpalette.security.JwtUtil;
import com.shadowpalette.service.PresenceService;
import com.shadowpalette.service.RaidService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RaidTargetEndpointTest {

    @Autowired
    private RaidService raidService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PlotRepository plotRepository;

    @Autowired
    private PresenceService presenceService;

    @Test
    @DisplayName("getRaidTargets returns seeded bots and excludes caller")
    void testGetRaidTargetsExcludesCaller() {
        // As user 101 (Crimson Citadel)
        List<RaidTargetDto> targets = raidService.getRaidTargets(101L);

        // Should include bots 102, 103, 104, 105, but NOT 101
        assertFalse(targets.stream().anyMatch(t -> t.getId().equals(101L)), "Caller 101 must be excluded");
        assertTrue(targets.stream().anyMatch(t -> t.getId().equals(102L)), "Bot 102 must be included");
        assertTrue(targets.stream().anyMatch(t -> t.getId().equals(103L)), "Bot 103 must be included");
        assertTrue(targets.stream().anyMatch(t -> t.getId().equals(104L)), "Bot 104 must be included");
        assertTrue(targets.stream().anyMatch(t -> t.getId().equals(105L)), "Bot 105 must be included");

        // Bots are always marked online
        for (RaidTargetDto t : targets) {
            if (t.isBot()) {
                assertTrue(t.isOnline(), "Bot target " + t.getName() + " should be online");
                assertTrue(t.getBuildingsCount() > 0, "Bot should have buildings");
            }
        }
    }

    @Test
    @DisplayName("Offline real player appears in targets with online=false until heartbeat received")
    void testRealPlayerOnlineOffline() {
        // Create a real player with occupied plot
        User realPlayer = userRepository.save(User.builder()
                .id(2001L)
                .username("GhostRider")
                .camoColor("PURPLE")
                .coins(600)
                .inkEnergy(80)
                .chips(300)
                .isBot(false)
                .build());

        plotRepository.save(Plot.builder()
                .ownerId(2001L)
                .isOccupied(true)
                .xCoord(2001)
                .yCoord(0)
                .build());

        // When caller is 101, real player 2001 should be returned with online = false
        List<RaidTargetDto> targetsBefore = raidService.getRaidTargets(101L);
        RaidTargetDto target = targetsBefore.stream()
                .filter(t -> t.getId().equals(2001L))
                .findFirst()
                .orElse(null);

        assertNotNull(target, "Real player should be listed in targets");
        assertFalse(target.isBot(), "Should not be a bot");
        assertFalse(target.isOnline(), "Should be offline initially");
        assertEquals("GhostRider", target.getName());
        assertEquals(600, target.getCoins());

        // Now simulate realPlayer sending a presence heartbeat
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        new com.shadowpalette.security.UserPrincipal(2001L, "GhostRider"), null, List.of()
                )
        );
        presenceService.heartbeat(PresenceHeartbeatRequest.builder()
                .username("GhostRider")
                .camoColor("PURPLE")
                .build());

        // Check targets again
        List<RaidTargetDto> targetsAfter = raidService.getRaidTargets(101L);
        RaidTargetDto targetAfter = targetsAfter.stream()
                .filter(t -> t.getId().equals(2001L))
                .findFirst()
                .orElseThrow();

        assertTrue(targetAfter.isOnline(), "Real player should now be online after heartbeat");
    }
}
