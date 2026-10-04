package com.shadowpalette.service;

import com.shadowpalette.dto.*;
import com.shadowpalette.entity.JailStay;
import com.shadowpalette.entity.RansomOffer;
import com.shadowpalette.entity.User;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.repository.JailStayRepository;
import com.shadowpalette.repository.RansomOfferRepository;
import com.shadowpalette.repository.UserRepository;
import com.shadowpalette.util.StealthConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class JailService {

    public static final int MAX_RANSOM_ROUNDS = 3;

    private final JailStayRepository jailStayRepository;
    private final RansomOfferRepository ransomOfferRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messaging;

    @Transactional
    public JailStay createJailStay(Long prisonerId, Long captorId, String raidId) {
        if (prisonerId == null || captorId == null) return null;

        User prisoner = userRepository.findById(prisonerId).orElse(null);
        if (prisoner == null || prisoner.isBot()) {
            return null; // Bots don't go to human jail
        }

        // Check if already in an active jail stay
        Optional<JailStay> active = jailStayRepository.findFirstByPrisonerIdAndStatus(prisonerId, "JAILED");
        if (active.isPresent()) {
            return active.get();
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime releaseAt = now.plusMinutes(StealthConstants.JAIL_MINUTES);

        JailStay stay = JailStay.builder()
                .prisonerId(prisonerId)
                .captorId(captorId)
                .raidId(raidId)
                .jailedAt(now)
                .releaseAt(releaseAt)
                .status("JAILED")
                .ransomOfferCount(0)
                .build();

        JailStay saved = jailStayRepository.save(stay);
        log.info("Created JailStay id={} for prisonerId={} captured by captorId={}", saved.getId(), prisonerId, captorId);

        broadcastJailUpdate(saved, "JAILED", null);
        return saved;
    }

    @Transactional
    public Optional<JailStay> getActiveJailStay(Long userId) {
        if (userId == null) return Optional.empty();
        Optional<JailStay> opt = jailStayRepository.findFirstByPrisonerIdAndStatus(userId, "JAILED");
        if (opt.isEmpty()) return Optional.empty();

        JailStay stay = opt.get();
        LocalDateTime now = LocalDateTime.now();
        if (!stay.getReleaseAt().isAfter(now)) {
            stay.setStatus("EXPIRED_RELEASED");
            jailStayRepository.save(stay);
            broadcastJailUpdate(stay, "EXPIRED_RELEASED", null);
            return Optional.empty();
        }
        return Optional.of(stay);
    }

    public boolean isJailed(Long userId) {
        return getActiveJailStay(userId).isPresent();
    }

    /** Active stay where this user is the captor (holding a prisoner). */
    @Transactional
    public Optional<JailStay> getActiveCaptorStay(Long captorId) {
        if (captorId == null) return Optional.empty();
        Optional<JailStay> opt = jailStayRepository.findFirstByCaptorIdAndStatus(captorId, "JAILED");
        if (opt.isEmpty()) return Optional.empty();
        JailStay stay = opt.get();
        LocalDateTime now = LocalDateTime.now();
        if (!stay.getReleaseAt().isAfter(now)) {
            stay.setStatus("EXPIRED_RELEASED");
            jailStayRepository.save(stay);
            broadcastJailUpdate(stay, "EXPIRED_RELEASED", null);
            return Optional.empty();
        }
        return Optional.of(stay);
    }

    public boolean isHoldingPrisoner(Long captorId) {
        return getActiveCaptorStay(captorId).isPresent();
    }

    /** Prisoner stay first; otherwise captor stay for negotiation UI. */
    @Transactional
    public Optional<JailStay> getActiveJailStayForParticipant(Long userId) {
        if (userId == null) return Optional.empty();
        Optional<JailStay> asPrisoner = getActiveJailStay(userId);
        if (asPrisoner.isPresent()) return asPrisoner;
        return getActiveCaptorStay(userId);
    }

    @Transactional(readOnly = true)
    public JailStayDto toDto(JailStay stay, Long callerId) {
        if (stay == null) return null;
        LocalDateTime now = LocalDateTime.now();
        long remaining = Math.max(0, Duration.between(now, stay.getReleaseAt()).toSeconds());

        String prisonerName = userRepository.findById(stay.getPrisonerId())
                .map(User::getUsername)
                .orElse("Player" + stay.getPrisonerId());
        String captorName = userRepository.findById(stay.getCaptorId())
                .map(User::getUsername)
                .orElse("Player" + stay.getCaptorId());

        List<RansomOffer> offers = ransomOfferRepository.findByJailStayIdOrderByCreatedAtAsc(stay.getId());
        List<RansomOfferDto> offerDtos = offers.stream().map(this::toOfferDto).toList();

        boolean isParticipant = callerId != null && (callerId.equals(stay.getPrisonerId()) || callerId.equals(stay.getCaptorId()));
        boolean canOffer = isParticipant && "JAILED".equals(stay.getStatus()) && remaining > 0;

        return JailStayDto.builder()
                .id(stay.getId())
                .prisonerId(stay.getPrisonerId())
                .prisonerUsername(prisonerName)
                .captorId(stay.getCaptorId())
                .captorUsername(captorName)
                .raidId(stay.getRaidId())
                .jailedAt(stay.getJailedAt())
                .releaseAt(stay.getReleaseAt())
                .remainingSeconds(remaining)
                .status(stay.getStatus())
                .ransomOfferCount(stay.getRansomOfferCount())
                .offers(offerDtos)
                .canOffer(canOffer)
                .build();
    }

    public RansomOfferDto toOfferDto(RansomOffer offer) {
        if (offer == null) return null;
        return RansomOfferDto.builder()
                .id(offer.getId())
                .jailStayId(offer.getJailStayId())
                .offeredBy(offer.getOfferedBy())
                .coins(offer.getCoins())
                .ink(offer.getInk())
                .chips(offer.getChips())
                .message(offer.getMessage())
                .status(offer.getStatus())
                .createdAt(offer.getCreatedAt())
                .expiresAt(offer.getExpiresAt())
                .roundNumber(offer.getRoundNumber())
                .build();
    }

    @Transactional
    public RansomOfferDto createOffer(Long stayId, Long callerUserId, int coins, int ink, int chips, String message) {
        JailStay stay = jailStayRepository.findById(stayId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "JAIL_STAY_NOT_FOUND"));

        if (!"JAILED".equals(stay.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PRISONER_NOT_JAILED");
        }

        boolean isPrisoner = callerUserId.equals(stay.getPrisonerId());
        boolean isCaptor = callerUserId.equals(stay.getCaptorId());
        if (!isPrisoner && !isCaptor) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_PARTICIPANT");
        }

        if (stay.getRansomOfferCount() >= MAX_RANSOM_ROUNDS) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MAX_ROUNDS_REACHED");
        }

        String offeredBy = isPrisoner ? "PRISONER" : "CAPTOR";
        int safeCoins = Math.max(0, coins);
        int safeInk = Math.max(0, ink);
        int safeChips = Math.max(0, chips);

        User prisoner = userRepository.findById(stay.getPrisonerId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRISONER_NOT_FOUND"));
        if (isPrisoner) {
            if (prisoner.getCoins() < safeCoins) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INSUFFICIENT_COINS");
            }
            if (prisoner.getInkEnergy() < safeInk) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INSUFFICIENT_INK");
            }
            if (prisoner.getChips() < safeChips) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INSUFFICIENT_CHIPS");
            }
        }

        List<RansomOffer> pendings = ransomOfferRepository.findByJailStayIdAndStatus(stayId, "PENDING");
        LocalDateTime now = LocalDateTime.now();
        for (RansomOffer p : pendings) {
            p.setStatus("SUPERSEDED");
            ransomOfferRepository.save(p);
        }

        stay.setRansomOfferCount(stay.getRansomOfferCount() + 1);
        jailStayRepository.save(stay);

        RansomOffer offer = RansomOffer.builder()
                .jailStayId(stayId)
                .offeredBy(offeredBy)
                .coins(safeCoins)
                .ink(safeInk)
                .chips(safeChips)
                .message(message != null ? message.trim() : null)
                .status("PENDING")
                .createdAt(now)
                .expiresAt(now.plusSeconds(90))
                .roundNumber(stay.getRansomOfferCount())
                .build();

        RansomOffer saved = ransomOfferRepository.save(offer);

        broadcastRansomOffer(stay, saved);
        return toOfferDto(saved);
    }

    @Transactional
    public RansomResponse acceptOffer(Long offerId, Long callerUserId) {
        RansomOffer offer = ransomOfferRepository.findById(offerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "OFFER_NOT_FOUND"));

        if (!"PENDING".equals(offer.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OFFER_NOT_PENDING");
        }
        if (offer.getExpiresAt() != null && offer.getExpiresAt().isBefore(LocalDateTime.now())) {
            offer.setStatus("EXPIRED");
            ransomOfferRepository.save(offer);
            throw new ApiException(HttpStatus.BAD_REQUEST, "OFFER_EXPIRED");
        }

        JailStay stay = jailStayRepository.findById(offer.getJailStayId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "JAIL_STAY_NOT_FOUND"));

        if (!"JAILED".equals(stay.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PRISONER_NOT_JAILED");
        }

        boolean isPrisoner = callerUserId.equals(stay.getPrisonerId());
        boolean isCaptor = callerUserId.equals(stay.getCaptorId());
        if (!isPrisoner && !isCaptor) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_PARTICIPANT");
        }

        // Must be accepted by the OTHER party
        if (isPrisoner && "PRISONER".equals(offer.getOfferedBy())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CANNOT_ACCEPT_OWN_OFFER");
        }
        if (isCaptor && "CAPTOR".equals(offer.getOfferedBy())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CANNOT_ACCEPT_OWN_OFFER");
        }

        // Atomic coin transfer with pessimistic write lock
        User prisoner = userRepository.findByIdForUpdate(stay.getPrisonerId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRISONER_NOT_FOUND"));
        User captor = userRepository.findByIdForUpdate(stay.getCaptorId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CAPTOR_NOT_FOUND"));

        int amountCoins = Math.max(0, offer.getCoins());
        int amountInk = Math.max(0, offer.getInk());
        int amountChips = Math.max(0, offer.getChips());
        if (prisoner.getCoins() < amountCoins) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INSUFFICIENT_COINS");
        }
        if (prisoner.getInkEnergy() < amountInk) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INSUFFICIENT_INK");
        }
        if (prisoner.getChips() < amountChips) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INSUFFICIENT_CHIPS");
        }

        prisoner.setCoins(prisoner.getCoins() - amountCoins);
        prisoner.setInkEnergy(prisoner.getInkEnergy() - amountInk);
        prisoner.setChips(prisoner.getChips() - amountChips);
        captor.setCoins(captor.getCoins() + amountCoins);
        captor.setInkEnergy(captor.getInkEnergy() + amountInk);
        captor.setChips(captor.getChips() + amountChips);
        prisoner.setRaidCooldownUntil(LocalDateTime.now());

        userRepository.save(prisoner);
        userRepository.save(captor);

        offer.setStatus("ACCEPTED");
        ransomOfferRepository.save(offer);

        stay.setStatus("RELEASED");
        stay.setReleaseAt(LocalDateTime.now());
        jailStayRepository.save(stay);

        broadcastRansomSettled(stay, offer, true, amountCoins, amountInk, amountChips);
        return RansomResponse.builder()
                .success(true)
                .status("ACCEPTED")
                .attackerId(stay.getPrisonerId())
                .defenderId(stay.getCaptorId())
                .coinsTransferred(amountCoins)
                .inkTransferred(amountInk)
                .chipsTransferred(amountChips)
                .message("Ransom accepted! Hostage released.")
                .build();
    }

    @Transactional
    public RansomResponse rejectOffer(Long offerId, Long callerUserId) {
        RansomOffer offer = ransomOfferRepository.findById(offerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "OFFER_NOT_FOUND"));

        if (!"PENDING".equals(offer.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OFFER_NOT_PENDING");
        }

        JailStay stay = jailStayRepository.findById(offer.getJailStayId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "JAIL_STAY_NOT_FOUND"));

        boolean isPrisoner = callerUserId.equals(stay.getPrisonerId());
        boolean isCaptor = callerUserId.equals(stay.getCaptorId());
        if (!isPrisoner && !isCaptor) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_PARTICIPANT");
        }

        offer.setStatus("REJECTED");
        ransomOfferRepository.save(offer);

        broadcastRansomSettled(stay, offer, false, 0, 0, 0);
        return RansomResponse.builder()
                .success(true)
                .status("REJECTED")
                .attackerId(stay.getPrisonerId())
                .defenderId(stay.getCaptorId())
                .coinsTransferred(0)
                .inkTransferred(0)
                .chipsTransferred(0)
                .message("Ransom offer rejected. Prisoner remains jailed.")
                .build();
    }

    @Scheduled(fixedRate = 5000)
    @Transactional
    public void releaseExpiredStays() {
        LocalDateTime now = LocalDateTime.now();
        List<JailStay> expired = jailStayRepository.findByStatusAndReleaseAtLessThanEqual("JAILED", now);
        for (JailStay stay : expired) {
            stay.setStatus("EXPIRED_RELEASED");
            jailStayRepository.save(stay);
            broadcastJailUpdate(stay, "EXPIRED_RELEASED", null);
        }
    }

    private void broadcastJailUpdate(JailStay stay, String type, Object extra) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", type);
        payload.put("jailStayId", stay.getId());
        payload.put("prisonerId", stay.getPrisonerId());
        payload.put("captorId", stay.getCaptorId());
        payload.put("status", stay.getStatus());
        if (extra != null) payload.put("extra", extra);

        messaging.convertAndSend("/topic/raid-ransom/" + stay.getPrisonerId(), (Object) payload);
        messaging.convertAndSend("/topic/raid-ransom/" + stay.getCaptorId(), (Object) payload);
        if (stay.getRaidId() != null) {
            Map<String, Object> state = new HashMap<>();
            state.put("raidId", stay.getRaidId());
            state.put("outcome", "RELEASED");
            state.put("status", "RELEASED");
            state.put("terminal", true);
            messaging.convertAndSend("/topic/live-raid/" + stay.getRaidId() + "/state", (Object) state);
        }
    }

    private void broadcastRansomOffer(JailStay stay, RansomOffer offer) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "RANSOM_OFFER");
        payload.put("jailStayId", stay.getId());
        payload.put("offerId", offer.getId());
        payload.put("offeredBy", offer.getOfferedBy());
        payload.put("coins", offer.getCoins());
        payload.put("ink", offer.getInk());
        payload.put("chips", offer.getChips());
        payload.put("message", offer.getMessage());
        payload.put("roundNumber", offer.getRoundNumber());
        payload.put("maxRounds", MAX_RANSOM_ROUNDS);
        payload.put("roundsUsed", stay.getRansomOfferCount());
        payload.put("attackerId", stay.getPrisonerId());
        payload.put("defenderId", stay.getCaptorId());

        messaging.convertAndSend("/topic/raid-ransom/" + stay.getPrisonerId(), (Object) payload);
        messaging.convertAndSend("/topic/raid-ransom/" + stay.getCaptorId(), (Object) payload);
    }

    private void broadcastRansomSettled(JailStay stay, RansomOffer offer, boolean accepted,
                                        int transferredCoins, int transferredInk, int transferredChips) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", accepted ? "RANSOM_ACCEPTED" : "RANSOM_REJECTED");
        payload.put("jailStayId", stay.getId());
        payload.put("offerId", offer.getId());
        payload.put("attackerId", stay.getPrisonerId());
        payload.put("defenderId", stay.getCaptorId());
        payload.put("coinsTransferred", transferredCoins);
        payload.put("inkTransferred", transferredInk);
        payload.put("chipsTransferred", transferredChips);

        messaging.convertAndSend("/topic/raid-ransom/" + stay.getPrisonerId(), (Object) payload);
        messaging.convertAndSend("/topic/raid-ransom/" + stay.getCaptorId(), (Object) payload);

        if (accepted && stay.getRaidId() != null) {
            Map<String, Object> state = new HashMap<>();
            state.put("raidId", stay.getRaidId());
            state.put("outcome", "RELEASED");
            state.put("status", "RELEASED");
            state.put("terminal", true);
            messaging.convertAndSend("/topic/live-raid/" + stay.getRaidId() + "/state", (Object) state);
        }
    }
}
