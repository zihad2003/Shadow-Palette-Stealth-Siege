package com.shadowpalette.service;

import com.shadowpalette.dto.RaidHistoryDto;
import com.shadowpalette.entity.RaidLog;
import com.shadowpalette.entity.User;
import com.shadowpalette.repository.RaidLogRepository;
import com.shadowpalette.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RaidHistoryTest {

    @Autowired
    private RaidService raidService;

    @Autowired
    private RaidLogRepository raidLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("Live caught raid records RaidLog with raidId and is idempotent")
    void testLiveCaughtIdempotency() {
        String raidId = "test_live_" + UUID.randomUUID();

        // 101 and 102 are seeded bots
        var resp1 = raidService.completeLiveCaught(101L, 102L, 45, raidId);
        assertNotNull(resp1);
        assertTrue(resp1.isSuccess());

        // Verify RaidLog created
        RaidLog log1 = raidLogRepository.findByRaidId(raidId).orElse(null);
        assertNotNull(log1);
        assertEquals("CAUGHT", log1.getOutcome());
        assertTrue(log1.isLive());
        assertTrue(log1.isDefenderWasOnline());
        assertEquals(45, log1.getDurationSeconds());

        long countBefore = raidLogRepository.count();

        // Duplicate call with same raidId should return existing without re-saving
        var resp2 = raidService.completeLiveCaught(101L, 102L, 45, raidId);
        assertNotNull(resp2);
        assertTrue(resp2.isSuccess());
        assertEquals(countBefore, raidLogRepository.count());
    }

    @Test
    @DisplayName("Aborted raid records RaidLog with endedReason and is idempotent")
    void testAbortedRaidIdempotency() {
        String raidId = "test_abort_" + UUID.randomUUID();

        raidService.recordAbortedRaid(101L, 102L, 20, raidId, "ATTACKER_LEFT");

        RaidLog log = raidLogRepository.findByRaidId(raidId).orElse(null);
        assertNotNull(log);
        assertEquals("ABORTED", log.getOutcome());
        assertEquals("ATTACKER_LEFT", log.getEndedReason());

        long countBefore = raidLogRepository.count();

        // Duplicate call with same raidId
        raidService.recordAbortedRaid(101L, 102L, 20, raidId, "ATTACKER_LEFT");
        assertEquals(countBefore, raidLogRepository.count());
    }

    @Test
    @DisplayName("getHistoryForUser returns logs for both attacker and defender perspectives")
    void testHistoryForBothPerspectives() {
        String raidId = "test_persp_" + UUID.randomUUID();
        raidService.recordAbortedRaid(101L, 102L, 30, raidId, "TIMEOUT_STALE");

        // Query history as attacker (101)
        Page<RaidHistoryDto> attackerHistory = raidService.getHistoryForUser(101L, 0, 10);
        assertFalse(attackerHistory.isEmpty());
        RaidHistoryDto itemAsAttacker = attackerHistory.stream()
                .filter(h -> raidId.equals(h.getRaidId()))
                .findFirst()
                .orElse(null);
        assertNotNull(itemAsAttacker);
        assertEquals("ATTACKER", itemAsAttacker.getPerspective());
        assertEquals(102L, itemAsAttacker.getOpponentId());

        // Query history as defender (102)
        Page<RaidHistoryDto> defenderHistory = raidService.getHistoryForUser(102L, 0, 10);
        assertFalse(defenderHistory.isEmpty());
        RaidHistoryDto itemAsDefender = defenderHistory.stream()
                .filter(h -> raidId.equals(h.getRaidId()))
                .findFirst()
                .orElse(null);
        assertNotNull(itemAsDefender);
        assertEquals("DEFENDER", itemAsDefender.getPerspective());
        assertEquals(101L, itemAsDefender.getOpponentId());
    }
}
