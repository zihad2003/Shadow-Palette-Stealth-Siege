package com.shadowpalette.service;

import com.shadowpalette.dto.*;
import com.shadowpalette.entity.User;
import com.shadowpalette.entity.VisitInvite;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.repository.UserRepository;
import com.shadowpalette.repository.VisitInviteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class PresenceService {

    public static final int PRESENCE_TTL_SECONDS = 20;
    public static final int INVITE_TTL_SECONDS = 45;

    private final UserRepository userRepository;
    private final VisitInviteRepository visitInviteRepository;

    private final ConcurrentHashMap<Long, PresenceRecord> presence = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, VisitSession> sessions = new ConcurrentHashMap<>();

    public PresenceHeartbeatResponse heartbeat(PresenceHeartbeatRequest request) {
        if (request == null || request.getUserId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "USER_ID_REQUIRED");
        }
        Long id = request.getUserId();
        PresenceRecord rec = new PresenceRecord();
        rec.userId = id;
        rec.username = resolveName(id, request.getUsername());
        rec.characterModel = request.getCharacterModel() != null ? request.getCharacterModel() : 1;
        rec.camoColor = request.getCamoColor() != null ? request.getCamoColor() : "BLUE";
        rec.snapshot = request.getSnapshot();
        rec.lastSeen = LocalDateTime.now();
        presence.put(id, rec);
        return PresenceHeartbeatResponse.builder().success(true).build();
    }

    public PresenceOnlineResponse listOnline(Long userId) {
        prunePresence();
        List<PresencePlayerDto> players = new ArrayList<>();
        for (PresenceRecord rec : presence.values()) {
            if (userId != null && rec.userId.equals(userId)) continue;
            players.add(PresencePlayerDto.builder()
                    .userId(rec.userId)
                    .username(rec.username)
                    .characterModel(rec.characterModel)
                    .camoColor(rec.camoColor)
                    .build());
        }
        return PresenceOnlineResponse.builder().success(true).players(players).build();
    }

    /** True if this user has a fresh heartbeat within PRESENCE_TTL_SECONDS. */
    public boolean isOnline(Long userId) {
        if (userId == null) return false;
        prunePresence();
        return presence.containsKey(userId);
    }

    @Transactional
    public VisitInviteDto createInvite(VisitInviteRequest request) {
        if (request == null || request.getHostId() == null || request.getGuestId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "HOST_AND_GUEST_REQUIRED");
        }
        Long hostId = request.getHostId();
        Long guestId = request.getGuestId();
        if (hostId.equals(guestId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CANNOT_INVITE_SELF");
        }
        prunePresence();
        expireStaleInvites();
        if (!presence.containsKey(guestId)) {
            throw new ApiException(HttpStatus.CONFLICT, "GUEST_OFFLINE");
        }
        if (findSessionFor(hostId) != null || findSessionFor(guestId) != null) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_IN_VISIT");
        }
        visitInviteRepository.findFirstByHostIdAndGuestIdAndStatus(hostId, guestId, "PENDING")
                .ifPresent(old -> {
                    old.setStatus("EXPIRED");
                    visitInviteRepository.save(old);
                });
        VisitInvite invite = VisitInvite.builder()
                .hostId(hostId)
                .guestId(guestId)
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusSeconds(INVITE_TTL_SECONDS))
                .build();
        invite = visitInviteRepository.save(invite);
        return toInviteDto(invite, null);
    }

    @Transactional
    public VisitSessionDto acceptInvite(VisitDecisionRequest request) {
        VisitInvite invite = requireInvite(request != null ? request.getInviteId() : null);
        Long guestId = request.getUserId();
        if (guestId == null || !guestId.equals(invite.getGuestId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_INVITE_GUEST");
        }
        expireIfNeeded(invite);
        if (!"PENDING".equals(invite.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "INVITE_NOT_PENDING");
        }
        if (findSessionFor(invite.getHostId()) != null || findSessionFor(guestId) != null) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_IN_VISIT");
        }
        invite.setStatus("ACCEPTED");
        visitInviteRepository.save(invite);
        for (VisitInvite other : visitInviteRepository.findByGuestIdAndStatus(guestId, "PENDING")) {
            if (!other.getId().equals(invite.getId())) {
                other.setStatus("EXPIRED");
                visitInviteRepository.save(other);
            }
        }
        PresenceRecord host = presence.get(invite.getHostId());
        PresenceRecord guest = presence.get(guestId);
        VisitSession session = new VisitSession();
        session.visitId = invite.getId();
        session.hostId = invite.getHostId();
        session.guestId = guestId;
        session.hostName = host != null ? host.username : resolveName(invite.getHostId(), null);
        session.guestName = guest != null ? guest.username : resolveName(guestId, null);
        session.hostModel = host != null ? host.characterModel : 1;
        session.guestModel = guest != null ? guest.characterModel : 1;
        session.hostCamo = host != null ? host.camoColor : "BLUE";
        session.guestCamo = guest != null ? guest.camoColor : "BLUE";
        session.snapshot = host != null ? host.snapshot : Map.of();
        session.hostSeated = false;
        session.guestSeated = false;
        session.gear = 0;
        session.trackT = 0;
        session.status = "ACTIVE";
        sessions.put(session.visitId, session);
        return toSessionDto(session);
    }

    @Transactional
    public VisitInviteDto declineInvite(VisitDecisionRequest request) {
        VisitInvite invite = requireInvite(request != null ? request.getInviteId() : null);
        Long userId = request.getUserId();
        if (userId == null || (!userId.equals(invite.getGuestId()) && !userId.equals(invite.getHostId()))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_INVITE_PARTY");
        }
        if ("PENDING".equals(invite.getStatus())) {
            invite.setStatus("DECLINED");
            visitInviteRepository.save(invite);
        }
        return toInviteDto(invite, null);
    }

    @Transactional
    public VisitInboxResponse inbox(Long userId) {
        expireStaleInvites();
        pruneEnded();
        List<VisitInviteDto> pending = new ArrayList<>();
        if (userId != null) {
            for (VisitInvite invite : visitInviteRepository.findByGuestIdAndStatus(userId, "PENDING")) {
                expireIfNeeded(invite);
                if ("PENDING".equals(invite.getStatus())) {
                    pending.add(toInviteDto(invite, null));
                }
            }
        }
        VisitSession session = findSessionFor(userId);
        return VisitInboxResponse.builder()
                .success(true)
                .pending(pending)
                .active(session != null ? toSessionDto(session) : null)
                .build();
    }

    public VisitSessionDto getSession(Long visitId) {
        pruneEnded();
        VisitSession session = visitId != null ? sessions.get(visitId) : null;
        if (session == null) {
            return VisitSessionDto.builder().success(false).status("ENDED").message("Visit ended").build();
        }
        return toSessionDto(session);
    }

    public VisitSessionDto updateState(VisitStateRequest request) {
        if (request == null || request.getVisitId() == null || request.getUserId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VISIT_STATE_REQUIRED");
        }
        VisitSession session = sessions.get(request.getVisitId());
        if (session == null || !"ACTIVE".equals(session.status)) {
            return VisitSessionDto.builder().success(false).status("ENDED").message("Visit ended").build();
        }
        Long userId = request.getUserId();
        boolean host = userId.equals(session.hostId);
        boolean guest = userId.equals(session.guestId);
        if (!host && !guest) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_VISIT_PARTY");
        }
        if (request.getSeated() != null) {
            if (host) session.hostSeated = request.getSeated();
            else session.guestSeated = request.getSeated();
        }
        if (host) {
            if (request.getGear() != null) {
                session.gear = Math.max(0, Math.min(3, request.getGear()));
            }
            if (request.getTrackT() != null) {
                double t = request.getTrackT() % 1.0;
                if (t < 0) t += 1.0;
                session.trackT = t;
            }
        }
        return toSessionDto(session);
    }

    public VisitSessionDto endVisit(VisitDecisionRequest request) {
        Long visitId = request != null ? request.getVisitId() : null;
        Long userId = request != null ? request.getUserId() : null;
        if (visitId == null && userId != null) {
            VisitSession found = findSessionFor(userId);
            if (found != null) visitId = found.visitId;
        }
        VisitSession session = visitId != null ? sessions.get(visitId) : null;
        if (session == null) {
            return VisitSessionDto.builder().success(true).status("ENDED").message("Visit ended").build();
        }
        if (userId != null && !userId.equals(session.hostId) && !userId.equals(session.guestId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_VISIT_PARTY");
        }
        session.status = "ENDED";
        sessions.remove(session.visitId);
        return VisitSessionDto.builder()
                .success(true)
                .visitId(session.visitId)
                .status("ENDED")
                .message("Visit ended")
                .build();
    }

    private VisitInvite requireInvite(Long id) {
        if (id == null) throw new ApiException(HttpStatus.BAD_REQUEST, "INVITE_ID_REQUIRED");
        return visitInviteRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "INVITE_NOT_FOUND"));
    }

    private void expireIfNeeded(VisitInvite invite) {
        if ("PENDING".equals(invite.getStatus())
                && invite.getExpiresAt() != null
                && invite.getExpiresAt().isBefore(LocalDateTime.now())) {
            invite.setStatus("EXPIRED");
            visitInviteRepository.save(invite);
        }
    }

    private void expireStaleInvites() {
        List<VisitInvite> pending = new ArrayList<>();
        pending.addAll(visitInviteRepository.findAll().stream()
                .filter(v -> "PENDING".equals(v.getStatus()))
                .toList());
        for (VisitInvite invite : pending) {
            expireIfNeeded(invite);
        }
    }

    private void prunePresence() {
        LocalDateTime cutoff = LocalDateTime.now().minusSeconds(PRESENCE_TTL_SECONDS);
        presence.entrySet().removeIf(e -> e.getValue().lastSeen == null || e.getValue().lastSeen.isBefore(cutoff));
    }

    private void pruneEnded() {
        sessions.entrySet().removeIf(e -> !"ACTIVE".equals(e.getValue().status));
    }

    private VisitSession findSessionFor(Long userId) {
        if (userId == null) return null;
        for (VisitSession session : sessions.values()) {
            if ("ACTIVE".equals(session.status)
                    && (userId.equals(session.hostId) || userId.equals(session.guestId))) {
                return session;
            }
        }
        return null;
    }

    private String resolveName(Long userId, String fallback) {
        if (fallback != null && !fallback.isBlank()) return fallback.trim();
        return userRepository.findById(userId)
                .map(User::getUsername)
                .orElse("Player" + userId);
    }

    private VisitInviteDto toInviteDto(VisitInvite invite, Map<String, Object> snapshot) {
        PresenceRecord host = presence.get(invite.getHostId());
        PresenceRecord guest = presence.get(invite.getGuestId());
        return VisitInviteDto.builder()
                .success(true)
                .id(invite.getId())
                .hostId(invite.getHostId())
                .guestId(invite.getGuestId())
                .hostName(host != null ? host.username : resolveName(invite.getHostId(), null))
                .guestName(guest != null ? guest.username : resolveName(invite.getGuestId(), null))
                .status(invite.getStatus())
                .expiresAt(invite.getExpiresAt() != null
                        ? invite.getExpiresAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        : null)
                .snapshot(snapshot)
                .build();
    }

    private VisitSessionDto toSessionDto(VisitSession session) {
        return VisitSessionDto.builder()
                .success(true)
                .visitId(session.visitId)
                .hostId(session.hostId)
                .guestId(session.guestId)
                .hostName(session.hostName)
                .guestName(session.guestName)
                .hostModel(session.hostModel)
                .guestModel(session.guestModel)
                .hostCamo(session.hostCamo)
                .guestCamo(session.guestCamo)
                .hostSeated(session.hostSeated)
                .guestSeated(session.guestSeated)
                .gear(session.gear)
                .trackT(session.trackT)
                .snapshot(session.snapshot)
                .status(session.status)
                .build();
    }

    private static class PresenceRecord {
        Long userId;
        String username;
        int characterModel;
        String camoColor;
        Map<String, Object> snapshot;
        LocalDateTime lastSeen;
    }

    private static class VisitSession {
        Long visitId;
        Long hostId;
        Long guestId;
        String hostName;
        String guestName;
        int hostModel;
        int guestModel;
        String hostCamo;
        String guestCamo;
        Map<String, Object> snapshot;
        boolean hostSeated;
        boolean guestSeated;
        int gear;
        double trackT;
        String status;
    }
}
