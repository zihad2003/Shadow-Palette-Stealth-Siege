package com.shadowpalette.service;

import com.shadowpalette.security.SecurityUtils;

import com.shadowpalette.dto.*;
import com.shadowpalette.entity.*;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RaidService {

    private final UserRepository userRepository;
    private final PlotRepository plotRepository;
    private final BuildingRepository buildingRepository;
    private final LighthouseRepository lighthouseRepository;
    private final PatrolRobotRepository patrolRobotRepository;
    private final WallBlockRepository wallBlockRepository;
    private final RaidLogRepository raidLogRepository;
    private final RaidValidator raidValidator;
    private final SimpMessagingTemplate messagingTemplate;
    private final PresenceService presenceService;
    private final JailService jailService;
    /** potId -> {claimedCoins, claimedInk, potCoins, potInk}. Ceiling grows to the larger extract. */
    private final Map<String, int[]> raidPots = new java.util.concurrent.ConcurrentHashMap<>();

    @Transactional(readOnly = true)
    public List<RaidTargetDto> getRaidTargets(Long callerId) {
        List<Plot> plots = plotRepository.findAll();
        List<RaidTargetDto> targets = new ArrayList<>();
        Set<Long> processedOwners = new HashSet<>();

        for (Plot plot : plots) {
            Long ownerId = plot.getOwnerId();
            if (ownerId == null || (callerId != null && callerId.equals(ownerId))) {
                continue;
            }
            if (!plot.isOccupied() || !processedOwners.add(ownerId)) {
                continue;
            }

            User user = userRepository.findById(ownerId).orElse(null);
            if (user == null) {
                continue;
            }

            List<Building> buildings = buildingRepository.findByPlotId(plot.getId());
            boolean hasLighthouse = lighthouseRepository.findByPlotId(plot.getId()).isPresent();
            boolean hasPatrol = patrolRobotRepository.findByPlotId(plot.getId()).isPresent();
            boolean hasJail = buildings.stream().anyMatch(b -> "JAIL".equalsIgnoreCase(b.getBuildingType()));
            boolean isOnline = user.isBot() || presenceService.isOnline(user.getId());

            targets.add(RaidTargetDto.builder()
                    .id(user.getId())
                    .ownerId(user.getId())
                    .name(user.getUsername())
                    .username(user.getUsername())
                    .isBot(user.isBot())
                    .online(isOnline)
                    .lastSeenAt(user.getLastSeenAt())
                    .camoColor(user.getCamoColor() != null ? user.getCamoColor() : "BLUE")
                    .camo(user.getCamoColor() != null ? user.getCamoColor() : "BLUE")
                    .level(Math.max(1, user.getPrestigeLevel()))
                    .prestigeLevel(user.getPrestigeLevel())
                    .coins(user.getCoins())
                    .ink(user.getInkEnergy())
                    .chips(user.getChips())
                    .buildingsCount(buildings.size())
                    .hasLighthouse(hasLighthouse)
                    .hasPatrol(hasPatrol)
                    .hasJail(hasJail)
                    .build());
        }

        targets.sort((a, b) -> {
            if (a.isBot() != b.isBot()) return a.isBot() ? -1 : 1;
            if (a.isOnline() != b.isOnline()) return a.isOnline() ? -1 : 1;
            return a.getId().compareTo(b.getId());
        });

        return targets;
    }

    @Transactional(readOnly = true)
    public RaidTargetResponse getRaidTarget(Long defenderId, Long attackerId) {
        if (attackerId != null) {
            if (jailService != null && jailService.isJailed(attackerId)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "ATTACKER_IN_JAIL");
            }
            userRepository.findById(attackerId).ifPresent(attacker -> {
                if (attacker.getRaidCooldownUntil() != null && attacker.getRaidCooldownUntil().isAfter(LocalDateTime.now())) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "RAID_COOLDOWN_ACTIVE");
                }
            });
        }

        User defender = userRepository.findById(defenderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        int chipsAvailable = Math.max(0, defender.getChips());
        int coinsAvailable = Math.max(0, defender.getCoins());
        int inkAvailable = Math.max(0, defender.getInkEnergy());

        List<Plot> plots = plotRepository.findByOwnerId(defenderId);
        Plot plot = (plots != null && !plots.isEmpty()) ? plots.get(0) : null;

        Map<String, Object> layout = new HashMap<>();

        if (plot != null) {
            List<Building> buildings = buildingRepository.findByPlotId(plot.getId());
            List<WallBlock> walls = wallBlockRepository.findByPlotId(plot.getId());
            Lighthouse lighthouse = lighthouseRepository.findByPlotId(plot.getId()).orElse(null);
            PatrolRobot patrolRobot = patrolRobotRepository.findByPlotId(plot.getId()).orElse(null);

            layout.put("buildings", buildings);
            layout.put("walls", walls);
            layout.put("lighthouse", lighthouse != null ? lighthouse : Map.of("xPos", 10, "yPos", 2, "coneAngle", 60, "coneRange", 7));
            layout.put("patrolRobot", patrolRobot);
        } else {
            layout.put("buildings", Collections.emptyList());
            layout.put("walls", Collections.emptyList());
            layout.put("lighthouse", Map.of("xPos", 10, "yPos", 2, "coneAngle", 60, "coneRange", 7));
            layout.put("patrolRobot", null);
        }

        return RaidTargetResponse.builder()
                .defenderId(defenderId)
                .layout(layout)
                .chipsAvailable(chipsAvailable)
                .coinsAvailable(coinsAvailable)
                .inkAvailable(inkAvailable)
                .build();
    }

    @Transactional
    public RaidCompleteResponse completeRaid(RaidCompleteRequest request) {
        Long attackerId = SecurityUtils.getCurrentUserId();
        if (attackerId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        }

        // Idempotency check if raidId provided
        if (request.getRaidId() != null && !request.getRaidId().isBlank()) {
            Optional<RaidLog> existing = raidLogRepository.findByRaidId(request.getRaidId());
            if (existing.isPresent()) {
                RaidLog log = existing.get();
                User currentAttacker = userRepository.findById(attackerId)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ATTACKER_NOT_FOUND"));
                return RaidCompleteResponse.builder()
                        .success(true)
                        .validatedOutcome(ValidatedOutcomeDto.builder()
                                .outcome(log.getOutcome())
                                .isDetected(log.isDetected())
                                .coinsLooted(log.getStolenCoins())
                                .inkLooted(log.getStolenInk())
                                .chipsAwarded(log.getStolenChips())
                                .build())
                        .raidLogId(log.getId())
                        .attackerCoins(currentAttacker.getCoins())
                        .attackerInk(currentAttacker.getInkEnergy())
                        .duplicate(true)
                        .build();
            }
        }

        User attacker = userRepository.findById(attackerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ATTACKER_NOT_FOUND"));

        User defender = userRepository.findById(request.getDefenderId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DEFENDER_NOT_FOUND"));

        ValidatedOutcomeDto validated = raidValidator.validateSession(
                request, attacker.getCamoColor(), defender.getCoins(), defender.getInkEnergy()
        );

        if (request.getClientReportedOutcome() != null) {
            String clientOutcome = request.getClientReportedOutcome().getOutcome();
            if (clientOutcome != null && !clientOutcome.equalsIgnoreCase(validated.getOutcome())) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "OUTCOME_MISMATCH", validated);
            }
        }

        if ("CAUGHT".equalsIgnoreCase(validated.getOutcome())) {
            attacker.setRaidCooldownUntil(LocalDateTime.now().plusMinutes(5));
        }

        if (request.getWallBreakEvents() != null) {
            for (WallBreakEventDto event : request.getWallBreakEvents()) {
                if (event.getWallBlockId() != null) {
                    wallBlockRepository.findById(event.getWallBlockId()).ifPresent(wall -> {
                        wall.setBreakProgress(event.getHits());
                        wallBlockRepository.save(wall);
                    });
                }
            }
        }

        int coinsLooted = Math.max(0, validated.getCoinsLooted());
        int inkLooted = Math.max(0, validated.getInkLooted());
        int partySize = request.getPartySize() == null ? 1 : Math.max(1, Math.min(2, request.getPartySize()));
        int fullCoins = coinsLooted;
        int fullInk = inkLooted;
        if (partySize > 1) {
            coinsLooted = fullCoins / partySize;
            inkLooted = fullInk / partySize;
        }
        String potId = request.getPotId();
        int[] pot = (potId != null && !potId.isBlank() && partySize > 1)
                ? raidPots.computeIfAbsent(potId, key -> new int[] {0, 0, 0, 0})
                : null;
        if (pot != null) {
            synchronized (pot) {
                if (fullCoins > pot[2]) pot[2] = fullCoins;
                if (fullInk > pot[3]) pot[3] = fullInk;
                coinsLooted = Math.min(coinsLooted, Math.max(0, pot[2] - pot[0]));
                inkLooted = Math.min(inkLooted, Math.max(0, pot[3] - pot[1]));
                coinsLooted = Math.min(coinsLooted, Math.max(0, defender.getCoins()));
                inkLooted = Math.min(inkLooted, Math.max(0, defender.getInkEnergy()));
                pot[0] += coinsLooted;
                pot[1] += inkLooted;
            }
        } else {
            coinsLooted = Math.min(coinsLooted, Math.max(0, defender.getCoins()));
            inkLooted = Math.min(inkLooted, Math.max(0, defender.getInkEnergy()));
        }

        defender.setCoins(Math.max(0, defender.getCoins() - coinsLooted));
        defender.setInkEnergy(Math.max(0, defender.getInkEnergy() - inkLooted));
        attacker.setCoins(attacker.getCoins() + coinsLooted);
        attacker.setInkEnergy(attacker.getInkEnergy() + inkLooted);
        if (validated.getChipsAwarded() > 0) {
            attacker.setChips(attacker.getChips() + validated.getChipsAwarded());
        }

        validated.setCoinsLooted(coinsLooted);
        validated.setInkLooted(inkLooted);

        userRepository.save(attacker);
        userRepository.save(defender);

        boolean defenderOnline = defender.isBot() || presenceService.isOnline(defender.getId());
        RaidLog raidLog = RaidLog.builder()
                .attackerId(attacker.getId())
                .defenderId(defender.getId())
                .outcome(validated.getOutcome())
                .isDetected(validated.isDetected())
                .stolenChips(validated.getChipsAwarded())
                .stolenCoins(coinsLooted)
                .stolenInk(inkLooted)
                .durationSeconds(request.getDurationSeconds())
                .timestamp(LocalDateTime.now())
                .sessionLogJson(request.getSessionLog() != null ? request.getSessionLog().toString() : "[]")
                .isLive(false)
                .defenderWasOnline(defenderOnline)
                .raidId(request.getRaidId())
                .endedReason(validated.getOutcome())
                .build();

        RaidLog savedLog = raidLogRepository.save(raidLog);

        return RaidCompleteResponse.builder()
                .success(true)
                .validatedOutcome(validated)
                .raidLogId(savedLog.getId())
                .attackerCoins(attacker.getCoins())
                .attackerInk(attacker.getInkEnergy())
                .build();
    }

    /**
     * Server-authoritative CAUGHT from a live takeover. Loot is always 0 (same as async CAUGHT).
     * Applies cooldown and writes a RaidLog so economy state matches a normal complete.
     */
    @Transactional
    public RaidCompleteResponse completeLiveCaught(Long attackerId, Long defenderId, int durationSeconds) {
        return completeLiveCaught(attackerId, defenderId, durationSeconds, null);
    }

    @Transactional
    public RaidCompleteResponse completeLiveCaught(Long attackerId, Long defenderId, int durationSeconds, String raidId) {
        User attacker = userRepository.findById(attackerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ATTACKER_NOT_FOUND"));
        User defender = userRepository.findById(defenderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DEFENDER_NOT_FOUND"));

        if (raidId != null && !raidId.isBlank()) {
            Optional<RaidLog> existing = raidLogRepository.findByRaidId(raidId);
            if (existing.isPresent()) {
                RaidLog log = existing.get();
                return RaidCompleteResponse.builder()
                        .success(true)
                        .validatedOutcome(ValidatedOutcomeDto.builder()
                                .outcome(log.getOutcome())
                                .isDetected(log.isDetected())
                                .chipsAwarded(0)
                                .coinsLooted(0)
                                .inkLooted(0)
                                .build())
                        .raidLogId(log.getId())
                        .attackerCoins(attacker.getCoins())
                        .attackerInk(attacker.getInkEnergy())
                        .build();
            }
        }

        attacker.setRaidCooldownUntil(LocalDateTime.now().plusMinutes(5));
        userRepository.save(attacker);
        userRepository.save(defender);

        ValidatedOutcomeDto validated = ValidatedOutcomeDto.builder()
                .isDetected(true)
                .outcome("CAUGHT")
                .chipsAwarded(0)
                .coinsLooted(0)
                .inkLooted(0)
                .build();

        RaidLog raidLog = RaidLog.builder()
                .attackerId(attacker.getId())
                .defenderId(defender.getId())
                .outcome("CAUGHT")
                .isDetected(true)
                .stolenChips(0)
                .stolenCoins(0)
                .stolenInk(0)
                .durationSeconds(Math.max(1, durationSeconds))
                .timestamp(LocalDateTime.now())
                .sessionLogJson("[\"live-raid\"]")
                .isLive(true)
                .defenderWasOnline(true)
                .raidId(raidId)
                .endedReason("CAUGHT")
                .build();
        RaidLog saved = raidLogRepository.save(raidLog);

        if (jailService != null) {
            try {
                jailService.createJailStay(attacker.getId(), defender.getId(), raidId);
            } catch (Exception ex) {
                // Ignore so main live caught response succeeds
            }
        }

        return RaidCompleteResponse.builder()
                .success(true)
                .validatedOutcome(validated)
                .raidLogId(saved.getId())
                .attackerCoins(attacker.getCoins())
                .attackerInk(attacker.getInkEnergy())
                .build();
    }

    @Transactional
    public void recordAbortedRaid(Long attackerId, Long defenderId, int durationSeconds, String raidId, String reason) {
        if (raidId != null && !raidId.isBlank() && raidLogRepository.findByRaidId(raidId).isPresent()) {
            return;
        }
        RaidLog raidLog = RaidLog.builder()
                .attackerId(attackerId)
                .defenderId(defenderId)
                .outcome("ABORTED")
                .isDetected(false)
                .stolenChips(0)
                .stolenCoins(0)
                .stolenInk(0)
                .durationSeconds(Math.max(1, durationSeconds))
                .timestamp(LocalDateTime.now())
                .sessionLogJson("[\"aborted\"]")
                .isLive(true)
                .defenderWasOnline(true)
                .raidId(raidId)
                .endedReason(reason)
                .build();
        raidLogRepository.save(raidLog);
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<RaidHistoryDto> getHistoryForUser(Long userId, int page, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                Math.max(0, page), Math.max(1, Math.min(100, size)),
                org.springframework.data.domain.Sort.by("timestamp").descending()
        );
        org.springframework.data.domain.Page<RaidLog> logs = raidLogRepository.findByAttackerIdOrDefenderIdOrderByTimestampDesc(userId, userId, pageable);

        return logs.map(log -> {
            boolean isAttacker = userId.equals(log.getAttackerId());
            Long opponentId = isAttacker ? log.getDefenderId() : log.getAttackerId();
            String opponentName = "Unknown";
            if (opponentId != null) {
                opponentName = userRepository.findById(opponentId)
                        .map(User::getUsername)
                        .orElse("Player " + opponentId);
            }

            return RaidHistoryDto.builder()
                    .id(log.getId())
                    .raidId(log.getRaidId())
                    .opponentId(opponentId)
                    .opponentUsername(opponentName)
                    .outcome(log.getOutcome())
                    .coinsLooted(log.getStolenCoins())
                    .inkLooted(log.getStolenInk())
                    .chipsAwarded(log.getStolenChips())
                    .isLive(log.isLive())
                    .defenderWasOnline(log.isDefenderWasOnline())
                    .durationSeconds(log.getDurationSeconds())
                    .timestamp(log.getTimestamp())
                    .perspective(isAttacker ? "ATTACKER" : "DEFENDER")
                    .endedReason(log.getEndedReason())
                    .build();
        });
    }

    @Transactional
    public RansomResponse handleRansomOffer(RansomOfferRequest request) {
        Long callerId = SecurityUtils.getCurrentUserId();
        if (callerId == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "RANSOM_OFFER");
        payload.put("attackerId", request.getAttackerId());
        payload.put("defenderId", request.getDefenderId());
        payload.put("coins", request.getCoins());
        payload.put("chips", request.getChips());
        payload.put("message", request.getMessage());
        payload.put("voiceRequested", request.isVoiceRequested());

        if (messagingTemplate != null) {
            messagingTemplate.convertAndSend("/topic/raid-ransom/" + request.getDefenderId(), (Object) payload);
            messagingTemplate.convertAndSend("/topic/raid-ransom/" + request.getAttackerId(), (Object) payload);
        }

        return RansomResponse.builder()
                .success(true)
                .status("OFFERED")
                .attackerId(request.getAttackerId())
                .defenderId(request.getDefenderId())
                .coinsTransferred(0)
                .message("Ransom offered successfully")
                .build();
    }

    @Transactional
    public RansomResponse handleRansomSettle(RansomSettleRequest request) {
        Long callerId = SecurityUtils.getCurrentUserId();
        if (callerId == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");

        int transfer = 0;
        if (request.isAccepted()) {
            User attacker = userRepository.findById(request.getAttackerId()).orElse(null);
            User defender = userRepository.findById(request.getDefenderId()).orElse(null);
            if (attacker != null && defender != null) {
                transfer = Math.min(attacker.getCoins(), Math.max(0, request.getAgreedCoins()));
                attacker.setCoins(attacker.getCoins() - transfer);
                defender.setCoins(defender.getCoins() + transfer);
                userRepository.save(attacker);
                userRepository.save(defender);
            }
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", request.isAccepted() ? "RANSOM_ACCEPTED" : "RANSOM_REJECTED");
        payload.put("attackerId", request.getAttackerId());
        payload.put("defenderId", request.getDefenderId());
        payload.put("coinsTransferred", transfer);

        if (messagingTemplate != null) {
            messagingTemplate.convertAndSend("/topic/raid-ransom/" + request.getDefenderId(), (Object) payload);
            messagingTemplate.convertAndSend("/topic/raid-ransom/" + request.getAttackerId(), (Object) payload);
        }

        return RansomResponse.builder()
                .success(true)
                .status(request.isAccepted() ? "ACCEPTED" : "REJECTED")
                .attackerId(request.getAttackerId())
                .defenderId(request.getDefenderId())
                .coinsTransferred(transfer)
                .message(request.isAccepted() ? "Ransom accepted! Hostage released." : "Ransom rejected.")
                .build();
    }
}
