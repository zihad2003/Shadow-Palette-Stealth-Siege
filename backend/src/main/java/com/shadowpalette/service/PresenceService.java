package com.shadowpalette.service;

import com.shadowpalette.security.SecurityUtils;

import com.shadowpalette.dto.*;
import com.shadowpalette.entity.User;
import com.shadowpalette.entity.VisitInvite;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.repository.UserRepository;
import com.shadowpalette.repository.VisitInviteRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks online presence and visit sessions. Both the {@code presence} and
 * {@code sessions} maps are <b>in-memory only</b> — they do NOT survive a Render
 * free-tier restart or redeployment. A restart wipes all online-player data and
 * active visit sessions. The frontend is expected to handle a suddenly-vanished
 * session gracefully (returns {@code status="ENDED"}).
 *
 * TODO: For production durability, consider moving presence/visit state to the
 *       database with a lightweight cleanup job for stale entries.
 */
@Service
public class PresenceService {

    public static final int PRESENCE_TTL_SECONDS = 90;
    /** Players seen in the database within this window still show up for duo invite. */
    public static final int RECENT_SEEN_SECONDS = 180;
    public static final int INVITE_TTL_SECONDS = 45;

    private final UserRepository userRepository;
    private final VisitInviteRepository visitInviteRepository;
    private final SimpMessagingTemplate messaging;

    public PresenceService(
            UserRepository userRepository,
            VisitInviteRepository visitInviteRepository,
            @Lazy SimpMessagingTemplate messaging
    ) {
        this.userRepository = userRepository;
        this.visitInviteRepository = visitInviteRepository;
        this.messaging = messaging;
    }

    private final ConcurrentHashMap<Long, PresenceRecord> presence = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, VisitSession> sessions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Instant> lastDbHeartbeat = new ConcurrentHashMap<>();

    public PresenceHeartbeatResponse heartbeat(PresenceHeartbeatRequest request) {
        if (request == null || SecurityUtils.getCurrentUserId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "USER_ID_REQUIRED");
        }
        Long id = SecurityUtils.getCurrentUserId();
        PresenceRecord rec = new PresenceRecord();
        rec.userId = id;
        rec.username = resolveName(id, request.getUsername());
        rec.characterModel = request.getCharacterModel() != null ? request.getCharacterModel() : 1;
        rec.camoColor = request.getCamoColor() != null ? request.getCamoColor() : "BLUE";
        rec.snapshot = request.getSnapshot();
        rec.lastSeen = LocalDateTime.now();
        presence.put(id, rec);

        // Throttle writing last_seen_at to DB to at most once per 10s per user
        Instant now = Instant.now();
        Instant lastWrite = lastDbHeartbeat.get(id);
        if (lastWrite == null || lastWrite.plusSeconds(10).isBefore(now)) {
            lastDbHeartbeat.put(id, now);
            try {
                userRepository.findById(id).ifPresent(user -> {
                    user.setLastSeenAt(LocalDateTime.now());
                    userRepository.save(user);
                });
            } catch (Exception ignored) {
                lastDbHeartbeat.remove(id);
            }
        }

        return PresenceHeartbeatResponse.builder().success(true).build();
    }

    public PresenceOnlineResponse listOnline(Long userId) {
        prunePresence();
        List<PresencePlayerDto> players = new ArrayList<>();
        java.util.Set<Long> seen = new java.util.HashSet<>();
        for (PresenceRecord rec : presence.values()) {
            if (rec.userId == null || (userId != null && rec.userId.equals(userId))) continue;
            boolean gc = rec.snapshot != null && Boolean.TRUE.equals(rec.snapshot.get("garageComplete"));
            players.add(PresencePlayerDto.builder()
                    .userId(rec.userId)
                    .username(rec.username)
                    .characterModel(rec.characterModel)
                    .camoColor(rec.camoColor)
                    .garageComplete(gc)
                    .build());
            seen.add(rec.userId);
        }
        LocalDateTime recent = LocalDateTime.now().minusSeconds(RECENT_SEEN_SECONDS);
        for (User user : userRepository.findRecentHumans(recent)) {
            if (user.getId() == null || seen.contains(user.getId())) continue;
            if (userId != null && user.getId().equals(userId)) continue;
            players.add(PresencePlayerDto.builder()
                    .userId(user.getId())
                    .username(user.getUsername())
                    .characterModel(user.getCharacterModel())
                    .camoColor(user.getCamoColor() != null ? user.getCamoColor() : "BLUE")
                    .build());
        }
        return PresenceOnlineResponse.builder().success(true).players(players).build();
    }

    /** True if this user has a fresh heartbeat within PRESENCE_TTL_SECONDS, is a bot, or recently active. */
    public boolean isOnline(Long userId) {
        if (userId == null) return false;
        prunePresence();
        if (presence.containsKey(userId)) {
            return true;
        }
        return userRepository.findById(userId)
                .map(u -> u.isBot() || (u.getLastSeenAt() != null && u.getLastSeenAt().isAfter(LocalDateTime.now().minusSeconds(45))))
                .orElse(false);
    }

    @Transactional
    public VisitInviteDto createInvite(VisitInviteRequest request) {
        if (request == null || SecurityUtils.getCurrentUserId() == null || request.getGuestId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "HOST_AND_GUEST_REQUIRED");
        }
        Long hostId = SecurityUtils.getCurrentUserId();
        Long guestId = request.getGuestId();
        if (hostId.equals(guestId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CANNOT_INVITE_SELF");
        }
        prunePresence();
        expireStaleInvites();
        if (!presence.containsKey(guestId)) {
            throw new ApiException(HttpStatus.CONFLICT, "GUEST_OFFLINE");
        }
        PresenceRecord host = presence.get(hostId);
        boolean hostHasVehicle = host != null && host.snapshot != null && Boolean.TRUE.equals(host.snapshot.get("garageComplete"));
        if (!hostHasVehicle) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "HOST_VEHICLE_INCOMPLETE");
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
        Long guestId = SecurityUtils.getCurrentUserId();
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
        Long userId = SecurityUtils.getCurrentUserId();
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
        if (request == null || request.getVisitId() == null || SecurityUtils.getCurrentUserId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VISIT_STATE_REQUIRED");
        }
        return applyVisitState(request, SecurityUtils.getCurrentUserId());
    }

    /** STOMP position sync — same state as REST updateState, but pushes to both clients. */
    public VisitSessionDto updatePositionStomp(VisitPositionMessage msg, Long userId) {
        if (msg == null || msg.getVisitId() == null || userId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VISIT_STATE_REQUIRED");
        }
        VisitStateRequest req = VisitStateRequest.builder()
                .visitId(msg.getVisitId())
                .seated(msg.getSeated())
                .gear(msg.getGear())
                .trackT(msg.getTrackT())
                .column(msg.getColumn())
                .row(msg.getRow())
                .reaction(msg.getReaction())
                .chat(msg.getChat())
                .build();
        VisitSessionDto dto = applyVisitState(req, userId);
        if (dto != null && dto.isSuccess() && "ACTIVE".equals(dto.getStatus())) {
            messaging.convertAndSend("/topic/visit/" + msg.getVisitId() + "/state", dto);
        }
        return dto;
    }

    private VisitSessionDto applyVisitState(VisitStateRequest request, Long userId) {
        VisitSession session = sessions.get(request.getVisitId());
        if (session == null || !"ACTIVE".equals(session.status)) {
            return VisitSessionDto.builder().success(false).status("ENDED").message("Visit ended").build();
        }
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
        if (request.getColumn() != null && request.getRow() != null) {
            if (host) {
                session.hostX = request.getColumn();
                session.hostY = request.getRow();
            } else {
                session.guestX = request.getColumn();
                session.guestY = request.getRow();
            }
        }
        if (request.getReaction() != null && !request.getReaction().isBlank()) {
            session.reaction = request.getReaction().trim();
        }
        if (request.getChat() != null && !request.getChat().isBlank()) {
            String text = request.getChat().trim().replaceAll("[\\r\\n\\t|]+", " ").replaceAll(" +", " ");
            if (text.length() > 80) text = text.substring(0, 80);
            String name = host ? session.hostName : session.guestName;
            if (name == null || name.isBlank()) name = host ? "Host" : "Guest";
            name = name.replace('|', ' ').trim();
            if (session.chat == null) session.chat = new ArrayList<>();
            session.chat.add(System.currentTimeMillis() + "|" + userId + "|" + name + "|" + text);
            if (session.chat.size() > 24) session.chat.remove(0);
        }
        return toSessionDto(session);
    }

    public boolean isVisitParticipant(Long visitId, Long userId) {
        if (visitId == null || userId == null) return false;
        VisitSession session = sessions.get(visitId);
        return session != null
                && "ACTIVE".equals(session.status)
                && (userId.equals(session.hostId) || userId.equals(session.guestId));
    }

    public VisitSessionDto endVisit(VisitDecisionRequest request) {
        Long visitId = request != null ? request.getVisitId() : null;
        Long userId = request != null ? SecurityUtils.getCurrentUserId() : null;
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
        VisitSessionDto ended = VisitSessionDto.builder()
                .success(true)
                .visitId(session.visitId)
                .status("ENDED")
                .message("Visit ended")
                .build();
        messaging.convertAndSend("/topic/visit/" + session.visitId + "/state", ended);
        return ended;
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
                .orElse("Player" + String.format("%05d", userId));
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
                .hostX(session.hostX)
                .hostY(session.hostY)
                .guestX(session.guestX)
                .guestY(session.guestY)
                .gear(session.gear)
                .trackT(session.trackT)
                .reaction(session.reaction)
                .chat(session.chat == null ? List.of() : List.copyOf(session.chat))
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
        Double hostX;
        Double hostY;
        Double guestX;
        Double guestY;
        int gear;
        double trackT;
        String reaction;
        List<String> chat = new ArrayList<>();
        String status;
    }
}
