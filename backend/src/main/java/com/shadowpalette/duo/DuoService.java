package com.shadowpalette.duo;

import com.shadowpalette.duo.dto.*;
import com.shadowpalette.service.PresenceService;
import com.shadowpalette.util.StealthConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DuoService {

    private final DuoRegistry registry;
    private final PresenceService presenceService;
    private final SimpMessagingTemplate messaging;

    public DuoPartyState invite(DuoInviteRequest request) {
        if (request == null || request.getHostId() == null || request.getGuestId() == null) {
            return fail("HOST_AND_GUEST_REQUIRED");
        }
        if (request.getHostId().equals(request.getGuestId())) {
            return fail("CANNOT_DUO_SELF");
        }
        // Prefer online guests, but still create the lobby so REST poll can deliver the invite
        // when STOMP/presence is briefly out of sync between two browser tabs.
        boolean guestOnline = presenceService.isOnline(request.getGuestId());

        // Drop stale LOBBY parties so a re-invite works after a failed/ignored invite.
        clearLobbyFor(request.getHostId());
        clearLobbyFor(request.getGuestId());
        if (registry.forUser(request.getHostId()).isPresent() || registry.forUser(request.getGuestId()).isPresent()) {
            return fail("ALREADY_IN_PARTY");
        }

        String partyId = "duo_" + UUID.randomUUID();
        String hostName = blankTo(request.getHostName(), "Player" + request.getHostId());
        DuoParty party = DuoParty.builder()
                .partyId(partyId)
                .hostId(request.getHostId())
                .guestId(request.getGuestId())
                .hostName(hostName)
                .guestName("Player" + request.getGuestId())
                .status("LOBBY")
                .createdAt(Instant.now())
                .build();
        registry.put(party);

        DuoPartyState invite = toState(party, "DUO_INVITE");
        invite.setType("DUO_INVITE");
        messaging.convertAndSend("/topic/duo-invite/" + request.getGuestId(), invite);
        broadcast(party);

        return toState(party, guestOnline ? "INVITE_SENT" : "INVITE_SENT_MAYBE_OFFLINE");
    }

    private void clearLobbyFor(Long userId) {
        registry.forUser(userId).ifPresent(existing -> {
            if ("LOBBY".equals(existing.getStatus()) || "ENDED".equals(existing.getStatus())) {
                existing.setStatus("ENDED");
                DuoPartyState ended = toState(existing, "REPLACED");
                messaging.convertAndSend("/topic/duo/" + existing.getPartyId() + "/state", ended);
                if (existing.getHostId() != null) {
                    messaging.convertAndSend("/topic/duo-invite/" + existing.getHostId(), ended);
                }
                if (existing.getGuestId() != null) {
                    messaging.convertAndSend("/topic/duo-invite/" + existing.getGuestId(), ended);
                }
                registry.remove(existing.getPartyId());
            }
        });
    }

    public DuoPartyState accept(DuoDecisionRequest request) {
        DuoParty party = requireParty(request != null ? request.getPartyId() : null);
        if (party == null) return fail("PARTY_GONE");
        if (request.getUserId() == null || !request.getUserId().equals(party.getGuestId())) {
            return fail("NOT_GUEST");
        }
        if (!"LOBBY".equals(party.getStatus())) {
            return fail("NOT_IN_LOBBY");
        }
        party.setGuestName("Player" + party.getGuestId());
        broadcast(party);
        messaging.convertAndSend("/topic/duo-invite/" + party.getHostId(), toState(party, "GUEST_ACCEPTED"));
        return toState(party, "ACCEPTED");
    }

    public DuoPartyState decline(DuoDecisionRequest request) {
        DuoParty party = requireParty(request != null ? request.getPartyId() : null);
        if (party == null) return fail("PARTY_GONE");
        Long uid = request.getUserId();
        if (uid == null || (!uid.equals(party.getGuestId()) && !uid.equals(party.getHostId()))) {
            return fail("NOT_PARTY");
        }
        party.setStatus("ENDED");
        DuoPartyState state = toState(party, "DECLINED");
        broadcast(party);
        messaging.convertAndSend("/topic/duo-invite/" + party.getHostId(), state);
        messaging.convertAndSend("/topic/duo-invite/" + party.getGuestId(), state);
        registry.remove(party.getPartyId());
        return state;
    }

    public DuoPartyState leave(DuoDecisionRequest request) {
        DuoParty party = requireParty(request != null ? request.getPartyId() : null);
        if (party == null) {
            // Also allow leave by userId alone
            if (request != null && request.getUserId() != null) {
                party = registry.forUser(request.getUserId()).orElse(null);
            }
        }
        if (party == null) return fail("PARTY_GONE");
        party.setStatus("ENDED");
        DuoPartyState state = toState(party, "LEFT");
        broadcast(party);
        registry.remove(party.getPartyId());
        return state;
    }

    public DuoPartyState startRaid(DuoRaidStartRequest request) {
        DuoParty party = requireParty(request != null ? request.getPartyId() : null);
        if (party == null) return fail("PARTY_GONE");
        if (request.getHostId() == null || !request.getHostId().equals(party.getHostId())) {
            return fail("NOT_HOST");
        }
        if (request.getDefenderId() == null) return fail("DEFENDER_REQUIRED");
        if ("ENDED".equals(party.getStatus())) return fail("PARTY_ENDED");

        String raidId = (request.getRaidId() != null && !request.getRaidId().isBlank())
                ? request.getRaidId().trim()
                : "duo_raid_" + UUID.randomUUID();
        party.setDefenderId(request.getDefenderId());
        party.setRaidId(raidId);
        party.setStatus("IN_RAID");
        party.setAlarmLatched(false);
        party.setHostCaught(false);
        party.setGuestCaught(false);
        broadcast(party);
        return toState(party, "RAID_STARTED");
    }

    public DuoPartyState updatePosition(String partyId, DuoPositionMessage msg) {
        DuoParty party = requireParty(partyId);
        if (party == null || msg == null || msg.getUserId() == null) return fail("BAD_PAYLOAD");
        if (!"IN_RAID".equals(party.getStatus()) && !"LOBBY".equals(party.getStatus())) {
            return fail("PARTY_ENDED");
        }

        Instant now = Instant.now();
        double x = clampX(msg.getX());
        double y = clampY(msg.getY());
        boolean isHost = msg.getUserId().equals(party.getHostId());
        boolean isGuest = msg.getUserId().equals(party.getGuestId());
        if (!isHost && !isGuest) return fail("NOT_PARTY");

        if (isHost) {
            if (!speedOk(party.getHostX(), party.getHostY(), party.getHostUpdatedAt(), x, y, now)) {
                return toState(party, "SPEED_REJECTED");
            }
            party.setHostX(x);
            party.setHostY(y);
            party.setHostUpdatedAt(now);
        } else {
            if (!speedOk(party.getGuestX(), party.getGuestY(), party.getGuestUpdatedAt(), x, y, now)) {
                return toState(party, "SPEED_REJECTED");
            }
            party.setGuestX(x);
            party.setGuestY(y);
            party.setGuestUpdatedAt(now);
        }
        if (msg.isAlarm()) {
            party.setAlarmLatched(true);
        }
        broadcast(party);
        return toState(party, null);
    }

    public void relaySignal(String partyId, DuoSignalMessage signal) {
        DuoParty party = requireParty(partyId);
        if (party == null || signal == null) return;
        messaging.convertAndSend("/topic/duo/" + partyId + "/signal", signal);
    }

    public DuoPartyState markCaught(String partyId, Long userId) {
        DuoParty party = requireParty(partyId);
        if (party == null || userId == null) return fail("PARTY_GONE");
        if (userId.equals(party.getHostId())) party.setHostCaught(true);
        if (userId.equals(party.getGuestId())) party.setGuestCaught(true);
        broadcast(party);
        return toState(party, "MEMBER_CAUGHT");
    }

    public DuoPartyState getState(String partyId) {
        DuoParty party = requireParty(partyId);
        return party == null ? fail("PARTY_GONE") : toState(party, null);
    }

    /** Pending lobby invite or active party for this user (REST fallback when STOMP misses). */
    public DuoPartyState forUser(Long userId) {
        if (userId == null) return fail("USER_REQUIRED");
        DuoParty party = registry.forUser(userId).orElse(null);
        if (party == null) return fail("NONE");
        DuoPartyState state = toState(party, null);
        if ("LOBBY".equals(party.getStatus()) && userId.equals(party.getGuestId())) {
            state.setType("DUO_INVITE");
            state.setMessage("DUO_INVITE");
        }
        return state;
    }

    private void broadcast(DuoParty party) {
        messaging.convertAndSend("/topic/duo/" + party.getPartyId() + "/state", toState(party, null));
    }

    private DuoParty requireParty(String partyId) {
        if (partyId == null || partyId.isBlank()) return null;
        return registry.get(partyId).orElse(null);
    }

    private static DuoPartyState toState(DuoParty party, String message) {
        return DuoPartyState.builder()
                .success(true)
                .partyId(party.getPartyId())
                .hostId(party.getHostId())
                .guestId(party.getGuestId())
                .hostName(party.getHostName())
                .guestName(party.getGuestName())
                .status(party.getStatus())
                .defenderId(party.getDefenderId())
                .raidId(party.getRaidId())
                .hostX(party.getHostX())
                .hostY(party.getHostY())
                .guestX(party.getGuestX())
                .guestY(party.getGuestY())
                .alarmLatched(party.isAlarmLatched())
                .hostCaught(party.isHostCaught())
                .guestCaught(party.isGuestCaught())
                .message(message)
                .build();
    }

    private static DuoPartyState fail(String message) {
        return DuoPartyState.builder().success(false).message(message).build();
    }

    private static String blankTo(String v, String fallback) {
        return v != null && !v.isBlank() ? v.trim() : fallback;
    }

    private static boolean speedOk(Double px, Double py, Instant at, double x, double y, Instant now) {
        if (px == null || py == null || at == null) return true;
        double dt = Math.max(0.05, (now.toEpochMilli() - at.toEpochMilli()) / 1000.0);
        double dist = Math.hypot(x - px, y - py);
        double max = StealthConstants.PLAYER_WALK_SPEED * 2.1 * dt * StealthConstants.LIVE_POSITION_SPEED_SLACK;
        return dist <= Math.max(max, 8.0 * Math.min(1.0, dt));
    }

    private static double clampX(double x) {
        return Math.max(0.5, Math.min(StealthConstants.MAP_COLS - 1.5, x));
    }

    private static double clampY(double y) {
        return Math.max(0.5, Math.min(StealthConstants.MAP_ROWS - 1.5, y));
    }
}
