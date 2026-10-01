package com.shadowpalette.service;

import com.shadowpalette.dto.PlayerPrestigeRequest;
import com.shadowpalette.dto.PlayerPrestigeResponse;
import com.shadowpalette.dto.PlayerSetupRequest;
import com.shadowpalette.dto.PlayerSetupResponse;
import com.shadowpalette.dto.SessionStartRequest;
import com.shadowpalette.dto.SessionStartResponse;
import com.shadowpalette.entity.Building;
import com.shadowpalette.entity.Plot;
import com.shadowpalette.entity.User;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.repository.BuildingRepository;
import com.shadowpalette.repository.PlotRepository;
import com.shadowpalette.repository.UserRepository;
import com.shadowpalette.security.JwtUtil;
import com.shadowpalette.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class PlayerService {

    private final UserRepository userRepository;
    private final PlotRepository plotRepository;
    private final BuildingRepository buildingRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final JailService jailService;

    public static final long MIN_PLAYER_ID = 20161L;
    private static final Pattern PLAYER_NAME = Pattern.compile("^[A-Za-z][A-Za-z0-9_]{2,15}$");

    @Transactional
    public SessionStartResponse startSession(SessionStartRequest request) {
        String action = request != null && request.getAction() != null
                ? request.getAction().trim().toLowerCase()
                : "";
        String username = request != null && request.getUsername() != null ? request.getUsername().trim() : "";
        String password = request != null && request.getPassword() != null ? request.getPassword().trim() : "";
        String recoveryToken = request != null ? request.getRecoveryToken() : null;
        Long userId = request != null ? request.getUserId() : null;

        if ("register".equals(action)) {
            return registerPlayer(username, password);
        }
        if ("login".equals(action) || (!username.isEmpty() && action.isEmpty())) {
            return loginPlayer(username, password);
        }
        if ("claim".equals(action)) {
            return claimPlayer(userId, recoveryToken, username, password);
        }
        return resumePlayer(userId, recoveryToken);
    }

    private SessionStartResponse resumePlayer(Long userId, String recoveryToken) {
        if (userId == null || userId < MIN_PLAYER_ID) {
            return needsLogin();
        }
        return userRepository.findById(userId)
                .filter(user -> !user.isBot())
                .map(existing -> {
                    String hash = existing.getGuestSecretHash();
                    if (hash != null && !hash.isEmpty()) {
                        if (recoveryToken != null && passwordEncoder.matches(recoveryToken, hash)) {
                            touch(existing);
                            return buildResponseFromUser(existing, false, null);
                        }
                        return needsLogin();
                    }
                    if (hasPassword(existing)) {
                        return needsLogin();
                    }
                    if (recoveryToken == null || recoveryToken.isEmpty()) {
                        return needsLogin();
                    }
                    existing.setGuestSecretHash(passwordEncoder.encode(recoveryToken));
                    touch(existing);
                    return buildResponseFromUser(existing, false, recoveryToken);
                })
                .orElseGet(this::needsLogin);
    }

    private SessionStartResponse loginPlayer(String username, String password) {
        requireName(username);
        requirePin(password);
        User existing = userRepository.findByUsernameIgnoreCase(username)
                .filter(user -> !user.isBot())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "UNKNOWN_PLAYER"));
        if (!hasPassword(existing)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "PIN_NOT_SET");
        }
        if (!passwordMatches(existing, password)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_PASSWORD");
        }
        upgradeLegacyPassword(existing, password);
        String token = bindFreshDevice(existing);
        return buildResponseFromUser(existing, false, token);
    }

    private SessionStartResponse registerPlayer(String username, String password) {
        requireName(username);
        requirePin(password);
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "USERNAME_TAKEN");
        }
        long nextId = Math.max(MIN_PLAYER_ID, userRepository.findMaxId() + 1);
        String recoveryToken = UUID.randomUUID().toString();
        User user = User.builder()
                .id(nextId)
                .username(username)
                .passwordHash(passwordEncoder.encode(password))
                .guestSecretHash(passwordEncoder.encode(recoveryToken))
                .coins(500)
                .inkEnergy(100)
                .chips(200)
                .characterModel(1)
                .camoColor("BLUE")
                .prestigeLevel(0)
                .termsAccepted(false)
                .lastSeenAt(LocalDateTime.now())
                .build();
        user = userRepository.save(user);
        ensureHomePlot(user);
        return buildResponseFromUser(user, true, recoveryToken);
    }

    private SessionStartResponse claimPlayer(Long userId, String recoveryToken, String username, String password) {
        if (userId == null || userId < MIN_PLAYER_ID || recoveryToken == null || recoveryToken.isEmpty()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        }
        User user = userRepository.findById(userId)
                .filter(found -> !found.isBot())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED"));
        String hash = user.getGuestSecretHash();
        if (hash != null && !hash.isEmpty()) {
            if (!passwordEncoder.matches(recoveryToken, hash)) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
            }
        } else if (hasPassword(user)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        }
        if (hasPassword(user)) {
            if (!passwordMatches(user, password)) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_PASSWORD");
            }
            upgradeLegacyPassword(user, password);
        } else {
            requirePin(password);
            user.setPasswordHash(passwordEncoder.encode(password));
            user.setPassword(null);
        }
        if (!username.isEmpty() && !username.equalsIgnoreCase(user.getUsername())) {
            requireName(username);
            userRepository.findByUsernameIgnoreCase(username).ifPresent(other -> {
                if (!other.getId().equals(user.getId())) {
                    throw new ApiException(HttpStatus.CONFLICT, "USERNAME_TAKEN");
                }
            });
            user.setUsername(username);
        }
        touch(user);
        return buildResponseFromUser(user, false, null);
    }

    private SessionStartResponse needsLogin() {
        return SessionStartResponse.builder()
                .success(true)
                .needsLogin(true)
                .build();
    }

    private void requireName(String username) {
        if (username == null || !PLAYER_NAME.matcher(username).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_USERNAME");
        }
    }

    private void requirePin(String password) {
        if (password == null || password.length() < 4 || password.length() > 20) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "WEAK_PIN");
        }
    }

    private boolean hasPassword(User user) {
        return (user.getPasswordHash() != null && !user.getPasswordHash().isEmpty())
                || (user.getPassword() != null && !user.getPassword().isEmpty());
    }

    private boolean passwordMatches(User user, String raw) {
        if (raw == null || raw.isEmpty()) return false;
        if (user.getPasswordHash() != null && !user.getPasswordHash().isEmpty()) {
            return passwordEncoder.matches(raw, user.getPasswordHash());
        }
        return user.getPassword() != null && user.getPassword().equals(raw);
    }

    private void upgradeLegacyPassword(User user, String raw) {
        if ((user.getPasswordHash() == null || user.getPasswordHash().isEmpty())
                && user.getPassword() != null && !user.getPassword().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(raw));
            user.setPassword(null);
        }
    }

    private String bindFreshDevice(User user) {
        String token = UUID.randomUUID().toString();
        user.setGuestSecretHash(passwordEncoder.encode(token));
        user.setLastSeenAt(LocalDateTime.now());
        userRepository.save(user);
        return token;
    }

    private void touch(User user) {
        user.setLastSeenAt(LocalDateTime.now());
        userRepository.save(user);
    }

    private SessionStartResponse buildResponseFromUser(User user, boolean newUser, String plainRecoveryToken) {
        String jwt = jwtUtil.generateToken(user.getId(), user.getUsername());
        var activeStay = jailService != null ? jailService.getActiveJailStay(user.getId()) : java.util.Optional.<com.shadowpalette.entity.JailStay>empty();
        boolean isJailed = activeStay.isPresent();
        var jailStayDto = isJailed ? jailService.toDto(activeStay.get(), user.getId()) : null;

        return SessionStartResponse.builder()
                .success(true)
                .userId(user.getId())
                .username(user.getUsername())
                .newUser(newUser)
                .worldSaveJson(user.getWorldSaveJson())
                .coins(user.getCoins())
                .inkEnergy(user.getInkEnergy())
                .chips(user.getChips())
                .characterModel(user.getCharacterModel())
                .camoColor(user.getCamoColor())
                .prestigeLevel(user.getPrestigeLevel())
                .termsAccepted(user.isTermsAccepted())
                .jwt(jwt)
                .recoveryToken(plainRecoveryToken)
                .isJailed(isJailed)
                .jailStay(jailStayDto)
                .hasPin(hasPassword(user))
                .build();
    }

    @Transactional
    public com.shadowpalette.dto.PlayerSaveResponse saveProgress(com.shadowpalette.dto.PlayerSaveRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        if (request.getWorldSaveJson() != null) {
            user.setWorldSaveJson(request.getWorldSaveJson());
        }
        if (request.getCoins() != null) user.setCoins(Math.max(0, request.getCoins()));
        if (request.getInkEnergy() != null) user.setInkEnergy(Math.max(0, request.getInkEnergy()));
        if (request.getChips() != null) user.setChips(Math.max(0, request.getChips()));
        if (request.getPrestigeLevel() != null) user.setPrestigeLevel(Math.max(0, request.getPrestigeLevel()));
        if (request.getTermsAccepted() != null) user.setTermsAccepted(request.getTermsAccepted());
        user.setLastSeenAt(LocalDateTime.now());

        userRepository.save(user);
        return com.shadowpalette.dto.PlayerSaveResponse.builder()
                .success(true)
                .userId(user.getId())
                .message("PROGRESS_SAVED")
                .build();
    }

    @Transactional
    public PlayerSetupResponse setupPlayer(PlayerSetupRequest request) {
        Long effectiveUserId = SecurityUtils.getCurrentUserId();
        if (effectiveUserId == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");

        User user = userRepository.findById(effectiveUserId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        boolean camoAlreadySet = user.getCamoColor() != null && !user.getCamoColor().trim().isEmpty();
        String desiredName = request.getUsername() != null && !request.getUsername().trim().isEmpty()
                ? request.getUsername().trim()
                : user.getUsername();

        user.setTermsAccepted(true);
        if (request.getUsername() != null && !request.getUsername().trim().isEmpty()
                && !desiredName.equalsIgnoreCase(user.getUsername())) {
            requireName(desiredName);
            userRepository.findByUsernameIgnoreCase(desiredName).ifPresent(other -> {
                if (!other.getId().equals(user.getId())) {
                    throw new ApiException(HttpStatus.CONFLICT, "USERNAME_TAKEN");
                }
            });
            user.setUsername(desiredName);
        }
        if (!camoAlreadySet) {
            user.setCharacterModel(clampModel(request.getCharacterModel()));
            user.setCamoColor(request.getCamoColor() != null ? request.getCamoColor().toUpperCase() : "BLUE");
        }

        User saved = userRepository.save(user);
        Plot homePlot = ensureHomePlot(saved);

        if (camoAlreadySet) {
            return PlayerSetupResponse.builder()
                    .success(true)
                    .characterModel(saved.getCharacterModel())
                    .camoColor(saved.getCamoColor())
                    .plotId(homePlot.getId())
                    .error("CAMO_COLOR_ALREADY_SET")
                    .build();
        }

        return PlayerSetupResponse.builder()
                .success(true)
                .characterModel(saved.getCharacterModel())
                .camoColor(saved.getCamoColor())
                .plotId(homePlot.getId())
                .build();
    }

    private Plot ensureHomePlot(User user) {
        List<Plot> owned = plotRepository.findByOwnerId(user.getId());
        if (owned != null && !owned.isEmpty()) {
            return owned.get(0);
        }
        return plotRepository.save(Plot.builder()
                .xCoord(0)
                .yCoord(0)
                .ownerId(user.getId())
                .isOccupied(true)
                .build());
    }

    @Transactional
    public PlayerPrestigeResponse performPrestige(PlayerPrestigeRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        List<Plot> plots = plotRepository.findByOwnerId(user.getId());
        if (plots == null || plots.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PRESTIGE_NOT_ELIGIBLE");
        }

        Plot plot = plots.get(0);
        List<Building> buildings = buildingRepository.findByPlotId(plot.getId());

        if (buildings.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PRESTIGE_NOT_ELIGIBLE");
        }

        boolean allMaxLevel = buildings.stream().allMatch(b -> b.getLevel() >= 3);
        if (!allMaxLevel) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PRESTIGE_NOT_ELIGIBLE");
        }

        int newPrestige = Math.min(5, user.getPrestigeLevel() + 1);
        user.setPrestigeLevel(newPrestige);
        userRepository.save(user);

        buildingRepository.deleteAll(buildings);

        int bonusPercent = newPrestige * 5;

        return PlayerPrestigeResponse.builder()
                .success(true)
                .newPrestigeLevel(newPrestige)
                .stealthBonusPercent(bonusPercent)
                .build();
    }

    private static int clampModel(int model) {
        if (model <= 1) return 1;
        return 2;
    }
}
