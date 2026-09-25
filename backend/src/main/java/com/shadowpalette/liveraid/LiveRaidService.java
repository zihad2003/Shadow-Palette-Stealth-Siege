package com.shadowpalette.liveraid;

import com.shadowpalette.liveraid.dto.*;
import com.shadowpalette.service.PresenceService;
import com.shadowpalette.service.RaidService;
import com.shadowpalette.util.StealthConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LiveRaidService {

    private final LiveRaidRegistry registry;
    private final PresenceService presenceService;
    private final SimpMessagingTemplate messaging;
    private final RaidService raidService;

    public LiveRaidStartResponse startRaid(LiveRaidStartRequest request) {
        if (request == null || request.getAttackerId() == null || request.getDefenderId() == null) {
            return LiveRaidStartResponse.builder()
                    .success(false)
                    .message("ATTACKER_AND_DEFENDER_REQUIRED")
                    .build();
        }
        if (request.getAttackerId().equals(request.getDefenderId())) {
            return LiveRaidStartResponse.builder()
                    .success(false)
                    .message("CANNOT_RAID_SELF")
                    .build();
        }

        String raidId = (request.getRaidId() != null && !request.getRaidId().isBlank())
                ? request.getRaidId().trim()
                : "live_" + UUID.randomUUID();

        boolean online = presenceService.isOnline(request.getDefenderId());
        if (!online) {
            return LiveRaidStartResponse.builder()
                    .success(true)
                    .raidId(raidId)
                    .liveInviteSent(false)
                    .message("DEFENDER_OFFLINE_ASYNC")
                    .build();
        }

        Instant now = Instant.now();
        Instant deadline = now.plus(StealthConstants.LIVE_RAID_JOIN_SECONDS, ChronoUnit.SECONDS);
        String attackerName = request.getAttackerName() != null && !request.getAttackerName().isBlank()
                ? request.getAttackerName().trim()
                : "Player" + request.getAttackerId();

        LiveRaidSession session = LiveRaidSession.builder()
                .raidId(raidId)
                .attackerUserId(request.getAttackerId())
                .defenderUserId(request.getDefenderId())
                .attackerName(attackerName)
                .joined(false)
                .joinDeadline(deadline)
                .createdAt(now)
                .terminal(false)
                .build();
        registry.put(session);

        RaidInviteMessage invite = RaidInviteMessage.builder()
                .type("RAID_INVITE")
                .raidId(raidId)
                .attackerUserId(request.getAttackerId())
                .attackerName(attackerName)
                .defenderUserId(request.getDefenderId())
                .joinDeadline(deadline.toString())
                .joinSeconds(StealthConstants.LIVE_RAID_JOIN_SECONDS)
                .build();
        messaging.convertAndSend("/topic/raid-invite/" + request.getDefenderId(), invite);

        return LiveRaidStartResponse.builder()
                .success(true)
                .raidId(raidId)
                .liveInviteSent(true)
                .joinDeadline(deadline.toString())
                .message("INVITE_SENT")
                .build();
    }

    public LiveRaidStateMessage join(String raidId, LiveRaidJoinRequest request, String wsSessionId) {
        LiveRaidSession session = registry.get(raidId).orElse(null);
        if (session == null || session.isTerminal()) {
            return LiveRaidStateMessage.builder()
                    .raidId(raidId)
                    .joined(false)
                    .terminal(true)
                    .message("SESSION_GONE")
                    .build();
        }
        if (request == null || request.getUserId() == null
                || !request.getUserId().equals(session.getDefenderUserId())) {
            return LiveRaidStateMessage.builder()
                    .raidId(raidId)
                    .joined(false)
                    .message("NOT_DEFENDER")
                    .build();
        }
        Instant now = Instant.now();
        if (session.isJoinExpired(now)) {
            registry.remove(raidId);
            return LiveRaidStateMessage.builder()
                    .raidId(raidId)
                    .joined(false)
                    .terminal(true)
                    .message("JOIN_EXPIRED")
                    .build();
        }

        session.setJoined(true);
        session.setDefenderWsSessionId(wsSessionId);
        registry.bindWsSession(wsSessionId, raidId);
        // Do not seed robot pose — first DEFENDER position update is authoritative.

        LiveRaidStateMessage state = toState(session, "DEFENDER_JOINED");
        broadcast(session.getRaidId(), state);
        return state;
    }

    public LiveRaidStateMessage updatePosition(String raidId, LiveRaidPositionMessage msg, String wsSessionId) {
        LiveRaidSession session = registry.get(raidId).orElse(null);
        if (session == null || session.isTerminal()) {
            return LiveRaidStateMessage.builder()
                    .raidId(raidId)
                    .terminal(true)
                    .message("SESSION_GONE")
                    .build();
        }
        if (msg == null || msg.getUserId() == null || msg.getRole() == null) {
            return toState(session, "BAD_PAYLOAD");
        }

        String role = msg.getRole().trim().toUpperCase();
        Instant now = Instant.now();
        double x = clampX(msg.getX());
        double y = clampY(msg.getY());

        if ("ATTACKER".equals(role)) {
            if (!msg.getUserId().equals(session.getAttackerUserId())) {
                return toState(session, "NOT_ATTACKER");
            }
            if (session.getAttackerWsSessionId() == null && wsSessionId != null) {
                session.setAttackerWsSessionId(wsSessionId);
                registry.bindWsSession(wsSessionId, raidId);
            }
            if (!isSpeedOk(
                    session.getAttackerX(), session.getAttackerY(), session.getAttackerUpdatedAt(),
                    x, y, now, StealthConstants.PLAYER_WALK_SPEED * 2.1)) {
                return toState(session, "SPEED_REJECTED");
            }
            session.setAttackerX(x);
            session.setAttackerY(y);
            session.setAttackerUpdatedAt(now);
        } else if ("DEFENDER".equals(role)) {
            if (!session.isJoined() || !msg.getUserId().equals(session.getDefenderUserId())) {
                return toState(session, "DEFENDER_NOT_JOINED");
            }
            if (!isSpeedOk(
                    session.getRobotX(), session.getRobotY(), session.getRobotUpdatedAt(),
                    x, y, now, StealthConstants.ROBOT_HIT_SPEED)) {
                return toState(session, "SPEED_REJECTED");
            }
            session.setRobotX(x);
            session.setRobotY(y);
            session.setRobotUpdatedAt(now);
        } else {
            return toState(session, "BAD_ROLE");
        }

        if (session.isJoined()
                && session.getAttackerX() != null
                && session.getRobotX() != null) {
            double dist = Math.hypot(
                    session.getAttackerX() - session.getRobotX(),
                    session.getAttackerY() - session.getRobotY()
            );
            if (dist <= StealthConstants.ROBOT_CATCH_DISTANCE) {
                return finalizeCaught(session);
            }
        }

        LiveRaidStateMessage state = toState(session, null);
        broadcast(raidId, state);
        return state;
    }

    public void onWsDisconnect(String wsSessionId) {
        if (wsSessionId == null) return;
        String raidId = registry.raidIdForWsSession(wsSessionId).orElse(null);
        registry.unbindWsSession(wsSessionId);
        if (raidId == null) return;

        LiveRaidSession session = registry.get(raidId).orElse(null);
        if (session == null || session.isTerminal()) return;

        boolean defenderLeft = wsSessionId.equals(session.getDefenderWsSessionId());
        boolean attackerLeft = wsSessionId.equals(session.getAttackerWsSessionId());

        if (defenderLeft && session.isJoined()) {
            // Fall back to AI — attacker keeps raiding asynchronously.
            session.setJoined(false);
            session.setDefenderWsSessionId(null);
            session.setRobotX(null);
            session.setRobotY(null);
            session.setRobotUpdatedAt(null);
            LiveRaidStateMessage state = toState(session, "DEFENDER_LEFT");
            state.setOutcome("DEFENDER_LEFT");
            broadcast(raidId, state);
        } else if (attackerLeft) {
            session.setTerminal(true);
            session.setOutcome("ABORTED");
            LiveRaidStateMessage state = toState(session, "ATTACKER_LEFT");
            state.setTerminal(true);
            state.setOutcome("ABORTED");
            broadcast(raidId, state);
            registry.remove(raidId);
        }
    }

    @Scheduled(fixedDelay = 2000)
    public void sweepExpiredInvites() {
        Instant now = Instant.now();
        List<String> drop = new ArrayList<>();
        for (LiveRaidSession session : registry.all()) {
            if (session.isTerminal()) {
                drop.add(session.getRaidId());
            } else if (session.isJoinExpired(now)) {
                // Expire quietly — attacker never depended on live invite.
                drop.add(session.getRaidId());
            }
        }
        for (String id : drop) {
            registry.remove(id);
        }
    }

    private LiveRaidStateMessage finalizeCaught(LiveRaidSession session) {
        session.setTerminal(true);
        session.setOutcome("CAUGHT");
        LiveRaidStateMessage state = toState(session, "CAUGHT");
        state.setTerminal(true);
        state.setOutcome("CAUGHT");
        broadcast(session.getRaidId(), state);

        long duration = Math.max(1, ChronoUnit.SECONDS.between(session.getCreatedAt(), Instant.now()));
        try {
            raidService.completeLiveCaught(
                    session.getAttackerUserId(),
                    session.getDefenderUserId(),
                    (int) duration
            );
        } catch (Exception ignored) {
            // Persist failure must not block the terminal broadcast already sent.
        }
        registry.remove(session.getRaidId());
        return state;
    }

    private void broadcast(String raidId, LiveRaidStateMessage state) {
        messaging.convertAndSend("/topic/live-raid/" + raidId + "/state", state);
    }

    static LiveRaidStateMessage toState(LiveRaidSession session, String message) {
        return LiveRaidStateMessage.builder()
                .raidId(session.getRaidId())
                .joined(session.isJoined())
                .terminal(session.isTerminal())
                .outcome(session.getOutcome())
                .attackerX(session.getAttackerX())
                .attackerY(session.getAttackerY())
                .robotX(session.getRobotX())
                .robotY(session.getRobotY())
                .message(message)
                .build();
    }

    static boolean isSpeedOk(
            Double prevX, Double prevY, Instant prevAt,
            double nextX, double nextY, Instant now,
            double maxTilesPerSec
    ) {
        if (prevX == null || prevY == null || prevAt == null) return true;
        double dt = Math.max(0.05, (now.toEpochMilli() - prevAt.toEpochMilli()) / 1000.0);
        double dist = Math.hypot(nextX - prevX, nextY - prevY);
        double max = maxTilesPerSec * dt * StealthConstants.LIVE_POSITION_SPEED_SLACK;
        // Cap single-frame teleport abuse but allow first reconnect spikes up to ~8 tiles.
        return dist <= Math.max(max, 8.0 * Math.min(1.0, dt));
    }

    static double clampX(double x) {
        return Math.max(0.5, Math.min(StealthConstants.MAP_COLS - 1.5, x));
    }

    static double clampY(double y) {
        return Math.max(0.5, Math.min(StealthConstants.MAP_ROWS - 1.5, y));
    }
}
