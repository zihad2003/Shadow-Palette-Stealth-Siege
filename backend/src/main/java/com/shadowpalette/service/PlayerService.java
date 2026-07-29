package com.shadowpalette.service;

import com.shadowpalette.dto.PlayerPrestigeRequest;
import com.shadowpalette.dto.PlayerPrestigeResponse;
import com.shadowpalette.dto.PlayerSetupRequest;
import com.shadowpalette.dto.PlayerSetupResponse;
import com.shadowpalette.entity.Building;
import com.shadowpalette.entity.Plot;
import com.shadowpalette.entity.User;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.repository.BuildingRepository;
import com.shadowpalette.repository.PlotRepository;
import com.shadowpalette.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlayerService {

    private final UserRepository userRepository;
    private final PlotRepository plotRepository;
    private final BuildingRepository buildingRepository;

    @Transactional
    public PlayerSetupResponse setupPlayer(PlayerSetupRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElse(null);

        if (user != null && user.getCamoColor() != null && !user.getCamoColor().trim().isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "CAMO_COLOR_ALREADY_SET");
        }

        if (user == null) {
            user = User.builder()
                    .id(request.getUserId())
                    .username("Player" + request.getUserId())
                    .coins(500)
                    .inkEnergy(100)
                    .chips(200)
                    .characterModel(request.getCharacterModel() > 0 ? request.getCharacterModel() : 1)
                    .camoColor(request.getCamoColor() != null ? request.getCamoColor().toUpperCase() : "WHITE")
                    .prestigeLevel(0)
                    .build();
        } else {
            user.setCharacterModel(request.getCharacterModel() > 0 ? request.getCharacterModel() : 1);
            user.setCamoColor(request.getCamoColor() != null ? request.getCamoColor().toUpperCase() : "WHITE");
        }

        User saved = userRepository.save(user);

        return PlayerSetupResponse.builder()
                .success(true)
                .characterModel(saved.getCharacterModel())
                .camoColor(saved.getCamoColor())
                .build();
    }

    @Transactional
    public PlayerPrestigeResponse performPrestige(PlayerPrestigeRequest request) {
        User user = userRepository.findById(request.getUserId())
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

        // Verify ALL buildings are at Level 3
        boolean allMaxLevel = buildings.stream().allMatch(b -> b.getLevel() >= 3);
        if (!allMaxLevel) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PRESTIGE_NOT_ELIGIBLE");
        }

        // Increment prestige level (max 5)
        int newPrestige = Math.min(5, user.getPrestigeLevel() + 1);
        user.setPrestigeLevel(newPrestige);
        userRepository.save(user);

        // Reset base buildings
        buildingRepository.deleteAll(buildings);

        int bonusPercent = newPrestige * 5;

        return PlayerPrestigeResponse.builder()
                .success(true)
                .newPrestigeLevel(newPrestige)
                .stealthBonusPercent(bonusPercent)
                .build();
    }
}
