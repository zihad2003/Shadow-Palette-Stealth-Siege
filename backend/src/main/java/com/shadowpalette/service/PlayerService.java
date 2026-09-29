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

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlayerService {

    private final UserRepository userRepository;
    private final PlotRepository plotRepository;
    private final BuildingRepository buildingRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public static final long MIN_PLAYER_ID = 20161L;

    @Transactional
    public SessionStartResponse startSession(SessionStartRequest request) {
        String reqUsername = request != null && request.getUsername() != null ? request.getUsername().trim() : null;
        String reqPassword = request != null && request.getPassword() != null ? request.getPassword().trim() : null;
        String reqRecoveryToken = request != null ? request.getRecoveryToken() : null;

        if (reqUsername != null && !reqUsername.isEmpty()) {
            return userRepository.findByUsernameIgnoreCase(reqUsername)
                    .map(existing -> {
                        boolean hasPassword = (existing.getPasswordHash() != null && !existing.getPasswordHash().isEmpty()) ||
                                              (existing.getPassword() != null && !existing.getPassword().isEmpty());

                        if (hasPassword) {
                            if (reqPassword == null || reqPassword.isEmpty()) {
                                throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_PASSWORD");
                            }
                            if (existing.getPasswordHash() != null && !existing.getPasswordHash().isEmpty()) {
                                if (!passwordEncoder.matches(reqPassword, existing.getPasswordHash())) {
                                    throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_PASSWORD");
                                }
                            } else if (existing.getPassword() != null && !existing.getPassword().isEmpty()) {
                                if (!existing.getPassword().equals(reqPassword)) {
                                    throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_PASSWORD");
                                }
                                // upgrade password
                                existing.setPasswordHash(passwordEncoder.encode(reqPassword));
                                existing.setPassword(null);
                                userRepository.save(existing);
                            }
                        } else if (reqPassword != null && !reqPassword.isEmpty()) {
                            existing.setPasswordHash(passwordEncoder.encode(reqPassword));
                            userRepository.save(existing);
                        }
                        return buildResponseFromUser(existing, false, null);
                    })
                    .orElseGet(() -> createNewUserWithUsername(reqUsername, reqPassword));
        }

        if (request != null && request.getUserId() != null && request.getUserId() >= MIN_PLAYER_ID) {
            return userRepository.findById(request.getUserId())
                    .map(existing -> {
                        // Resuming guest
                        if (existing.getGuestSecretHash() != null && !existing.getGuestSecretHash().isEmpty()) {
                            if (reqRecoveryToken == null || !passwordEncoder.matches(reqRecoveryToken, existing.getGuestSecretHash())) {
                                throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_RECOVERY_TOKEN");
                            }
                        } else {
                            throw new ApiException(HttpStatus.UNAUTHORIZED, "CANNOT_RESUME_WITHOUT_TOKEN");
                        }
                        return buildResponseFromUser(existing, false, null);
                    })
                    .orElseGet(this::createNewUser);
        }
        
        return createNewUser();
    }

    private SessionStartResponse buildResponseFromUser(User user, boolean newUser, String plainRecoveryToken) {
        String jwt = jwtUtil.generateToken(user.getId(), user.getUsername());
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
                .build();
    }

    private SessionStartResponse createNewUserWithUsername(String username, String password) {
        long nextId = Math.max(MIN_PLAYER_ID, userRepository.findMaxId() + 1);
        String passHash = (password != null && !password.isEmpty()) ? passwordEncoder.encode(password) : null;
        
        User user = User.builder()
                .id(nextId)
                .username(username)
                .passwordHash(passHash)
                .coins(500)
                .inkEnergy(100)
                .chips(200)
                .characterModel(1)
                .camoColor("BLUE")
                .prestigeLevel(0)
                .termsAccepted(false)
                .build();
        user = userRepository.save(user);
        ensureHomePlot(user);
        return buildResponseFromUser(user, true, null);
    }

    private SessionStartResponse createNewUser() {
        long nextId = Math.max(MIN_PLAYER_ID, userRepository.findMaxId() + 1);
        String recoveryToken = UUID.randomUUID().toString();
        String recoveryHash = passwordEncoder.encode(recoveryToken);
        
        User user = User.builder()
                .id(nextId)
                .username("Player" + nextId)
                .guestSecretHash(recoveryHash)
                .coins(500)
                .inkEnergy(100)
                .chips(200)
                .characterModel(1)
                .camoColor("BLUE")
                .prestigeLevel(0)
                .termsAccepted(false)
                .build();
        user = userRepository.save(user);
        ensureHomePlot(user);
        return buildResponseFromUser(user, true, recoveryToken);
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
        if (request.getTermsAccepted() != null) user.setTermsAccepted(request.getTermsAccepted());

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
        if (request.getUsername() != null && !request.getUsername().trim().isEmpty()) {
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
