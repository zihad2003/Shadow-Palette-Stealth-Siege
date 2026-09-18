package com.shadowpalette.service;

import com.shadowpalette.dto.AdminActionResponse;
import com.shadowpalette.dto.AdminBuildingDto;
import com.shadowpalette.dto.AdminOverviewDto;
import com.shadowpalette.dto.AdminRaidDto;
import com.shadowpalette.dto.AdminUserDetailDto;
import com.shadowpalette.dto.AdminUserDto;
import com.shadowpalette.dto.AdminUserListResponse;
import com.shadowpalette.dto.AdminUserWriteRequest;
import com.shadowpalette.entity.Building;
import com.shadowpalette.entity.Plot;
import com.shadowpalette.entity.RaidLog;
import com.shadowpalette.entity.User;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.repository.BuildingRepository;
import com.shadowpalette.repository.LighthouseRepository;
import com.shadowpalette.repository.PatrolRobotRepository;
import com.shadowpalette.repository.PlotRepository;
import com.shadowpalette.repository.RaidLogRepository;
import com.shadowpalette.repository.UserRepository;
import com.shadowpalette.repository.WallBlockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private static final Set<String> CAMOS = Set.of("WHITE", "RED", "GREEN", "BLUE", "YELLOW", "PURPLE");

    private final UserRepository userRepository;
    private final PlotRepository plotRepository;
    private final BuildingRepository buildingRepository;
    private final RaidLogRepository raidLogRepository;
    private final LighthouseRepository lighthouseRepository;
    private final PatrolRobotRepository patrolRobotRepository;
    private final WallBlockRepository wallBlockRepository;

    public AdminOverviewDto overview() {
        List<User> users = userRepository.findAll();
        long occupied = plotRepository.findAll().stream().filter(Plot::isOccupied).count();
        return AdminOverviewDto.builder()
                .success(true)
                .userCount(users.size())
                .occupiedPlots(occupied)
                .raidCount(raidLogRepository.count())
                .totalCoins(users.stream().mapToLong(User::getCoins).sum())
                .totalInk(users.stream().mapToLong(User::getInkEnergy).sum())
                .totalChips(users.stream().mapToLong(User::getChips).sum())
                .build();
    }

    public AdminUserListResponse listUsers(String query) {
        List<User> users;
        String q = query == null ? "" : query.trim();
        if (q.isEmpty()) {
            users = userRepository.findAll();
        } else {
            users = new ArrayList<>(userRepository.findByUsernameContainingIgnoreCase(q));
            if (q.chars().allMatch(Character::isDigit)) {
                userRepository.findById(Long.parseLong(q)).ifPresent(u -> {
                    if (users.stream().noneMatch(existing -> existing.getId().equals(u.getId()))) {
                        users.add(u);
                    }
                });
            }
        }
        users.sort(Comparator.comparing(User::getId));
        return AdminUserListResponse.builder()
                .success(true)
                .users(users.stream().map(this::toSummary).collect(Collectors.toList()))
                .build();
    }

    public AdminUserDetailDto getUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));
        Long plotId = firstPlotId(user.getId());
        List<AdminBuildingDto> buildings = plotId == null
                ? List.of()
                : buildingRepository.findByPlotId(plotId).stream()
                        .map(this::toBuilding)
                        .collect(Collectors.toList());
        List<AdminRaidDto> raids = raidLogRepository.findByAttackerId(user.getId()).stream()
                .sorted(Comparator.comparing(RaidLog::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(12)
                .map(this::toRaid)
                .collect(Collectors.toList());
        return AdminUserDetailDto.builder()
                .success(true)
                .user(toSummary(user))
                .buildings(buildings)
                .recentRaids(raids)
                .build();
    }

    @Transactional
    public AdminActionResponse createUser(AdminUserWriteRequest request) {
        String username = requireUsername(request.getUsername());
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "USERNAME_TAKEN");
        }
        long id = request.getId() != null ? request.getId() : userRepository.findMaxId() + 1;
        if (id < 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_USER_ID");
        }
        if (userRepository.existsById(id)) {
            throw new ApiException(HttpStatus.CONFLICT, "USER_ID_TAKEN");
        }
        User user = User.builder()
                .id(id)
                .username(username)
                .coins(clamp(request.getCoins(), 0, 999_999, 500))
                .inkEnergy(clamp(request.getInkEnergy(), 0, 100, 100))
                .chips(clamp(request.getChips(), 0, 999_999, 200))
                .characterModel(clamp(request.getCharacterModel(), 1, 2, 1))
                .camoColor(normalizeCamo(request.getCamoColor()))
                .prestigeLevel(clamp(request.getPrestigeLevel(), 0, 5, 0))
                .build();
        User saved = userRepository.save(user);
        ensureHomePlot(saved);
        return AdminActionResponse.builder()
                .success(true)
                .message("USER_CREATED")
                .user(toSummary(saved))
                .build();
    }

    @Transactional
    public AdminActionResponse updateUser(Long id, AdminUserWriteRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            String username = requireUsername(request.getUsername());
            userRepository.findByUsernameIgnoreCase(username).ifPresent(other -> {
                if (!other.getId().equals(id)) {
                    throw new ApiException(HttpStatus.CONFLICT, "USERNAME_TAKEN");
                }
            });
            user.setUsername(username);
        }
        if (request.getCoins() != null) user.setCoins(clamp(request.getCoins(), 0, 999_999, user.getCoins()));
        if (request.getInkEnergy() != null) user.setInkEnergy(clamp(request.getInkEnergy(), 0, 100, user.getInkEnergy()));
        if (request.getChips() != null) user.setChips(clamp(request.getChips(), 0, 999_999, user.getChips()));
        if (request.getCharacterModel() != null) {
            user.setCharacterModel(clamp(request.getCharacterModel(), 1, 3, user.getCharacterModel()));
        }
        if (request.getCamoColor() != null && !request.getCamoColor().isBlank()) {
            user.setCamoColor(normalizeCamo(request.getCamoColor()));
        }
        if (request.getPrestigeLevel() != null) {
            user.setPrestigeLevel(clamp(request.getPrestigeLevel(), 0, 5, user.getPrestigeLevel()));
        }
        User saved = userRepository.save(user);
        return AdminActionResponse.builder()
                .success(true)
                .message("USER_UPDATED")
                .user(toSummary(saved))
                .build();
    }

    @Transactional
    public AdminActionResponse deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));
        List<Plot> plots = plotRepository.findByOwnerId(id);
        for (Plot plot : plots) {
            buildingRepository.deleteAll(buildingRepository.findByPlotId(plot.getId()));
            wallBlockRepository.deleteAll(wallBlockRepository.findByPlotId(plot.getId()));
            lighthouseRepository.findByPlotId(plot.getId()).ifPresent(lighthouseRepository::delete);
            patrolRobotRepository.findByPlotId(plot.getId()).ifPresent(patrolRobotRepository::delete);
        }
        plotRepository.deleteAll(plots);
        raidLogRepository.deleteByAttackerId(id);
        raidLogRepository.deleteByDefenderId(id);
        userRepository.delete(user);
        return AdminActionResponse.builder()
                .success(true)
                .message("USER_DELETED")
                .build();
    }

    @Transactional
    public AdminActionResponse seedDemoUsers() {
        List<AdminUserWriteRequest> seeds = Arrays.asList(
                seed(12L, "ShadowNinja", 500, 100, 200, 1, "BLUE", 0),
                seed(21L, "ForestScout", 820, 70, 140, 2, "GREEN", 1),
                seed(34L, "PhantomGhost", 210, 40, 80, 2, "RED", 0),
                seed(55L, "InkWarden", 1200, 100, 400, 1, "YELLOW", 2)
        );
        int created = 0;
        for (AdminUserWriteRequest req : seeds) {
            if (userRepository.existsById(req.getId())) continue;
            if (userRepository.existsByUsernameIgnoreCase(req.getUsername())) continue;
            createUser(req);
            created += 1;
        }
        return AdminActionResponse.builder()
                .success(true)
                .message(created > 0 ? "DEMO_USERS_SEEDED" : "DEMO_USERS_ALREADY_PRESENT")
                .seeded(created)
                .build();
    }

    private AdminUserWriteRequest seed(
            Long id, String username, int coins, int ink, int chips, int model, String camo, int prestige
    ) {
        return AdminUserWriteRequest.builder()
                .id(id)
                .username(username)
                .coins(coins)
                .inkEnergy(ink)
                .chips(chips)
                .characterModel(model)
                .camoColor(camo)
                .prestigeLevel(prestige)
                .build();
    }

    private Plot ensureHomePlot(User user) {
        List<Plot> owned = plotRepository.findByOwnerId(user.getId());
        if (owned != null && !owned.isEmpty()) return owned.get(0);
        return plotRepository.save(Plot.builder()
                .xCoord(0)
                .yCoord(0)
                .ownerId(user.getId())
                .isOccupied(true)
                .build());
    }

    private AdminUserDto toSummary(User user) {
        Long plotId = firstPlotId(user.getId());
        int buildings = plotId == null ? 0 : buildingRepository.findByPlotId(plotId).size();
        long attempts = raidLogRepository.countByAttackerId(user.getId());
        long success = raidLogRepository.countByAttackerIdAndOutcomeNot(user.getId(), "CAUGHT");
        return AdminUserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .coins(user.getCoins())
                .inkEnergy(user.getInkEnergy())
                .chips(user.getChips())
                .characterModel(user.getCharacterModel())
                .camoColor(user.getCamoColor())
                .prestigeLevel(user.getPrestigeLevel())
                .raidCooldownUntil(user.getRaidCooldownUntil() == null ? null : user.getRaidCooldownUntil().toString())
                .plotId(plotId)
                .buildingCount(buildings)
                .raidAttempts(attempts)
                .successfulRaids(success)
                .build();
    }

    private AdminBuildingDto toBuilding(Building b) {
        return AdminBuildingDto.builder()
                .id(b.getId())
                .buildingType(b.getBuildingType())
                .level(b.getLevel())
                .hexColor(b.getHexColor())
                .xPos(b.getXPos())
                .yPos(b.getYPos())
                .build();
    }

    private AdminRaidDto toRaid(RaidLog log) {
        return AdminRaidDto.builder()
                .id(log.getId())
                .attackerId(log.getAttackerId())
                .defenderId(log.getDefenderId())
                .outcome(log.getOutcome())
                .stolenChips(log.getStolenChips())
                .detected(log.isDetected())
                .durationSeconds(log.getDurationSeconds())
                .timestamp(log.getTimestamp() == null ? null : log.getTimestamp().toString())
                .build();
    }

    private Long firstPlotId(Long userId) {
        List<Plot> plots = plotRepository.findByOwnerId(userId);
        return plots == null || plots.isEmpty() ? null : plots.get(0).getId();
    }

    private static String requireUsername(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "USERNAME_REQUIRED");
        }
        String username = raw.trim();
        if (username.length() < 2 || username.length() > 24) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "USERNAME_INVALID");
        }
        return username;
    }

    private static String normalizeCamo(String camo) {
        String key = camo == null || camo.isBlank() ? "BLUE" : camo.trim().toUpperCase(Locale.ROOT);
        if (!CAMOS.contains(key)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CAMO_COLOR");
        }
        return key;
    }

    private static int clamp(Integer value, int min, int max, int fallback) {
        if (value == null) return fallback;
        return Math.max(min, Math.min(max, value));
    }
}
