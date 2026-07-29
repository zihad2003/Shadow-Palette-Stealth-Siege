package com.shadowpalette.service;

import com.shadowpalette.dto.PlayerSetupRequest;
import com.shadowpalette.dto.PlayerSetupResponse;
import com.shadowpalette.entity.User;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PlayerService {

    private final UserRepository userRepository;

    @Transactional
    public PlayerSetupResponse setupPlayer(PlayerSetupRequest request) {
        User user = userRepository.findById(request.getUserId()).orElse(null);

        if (user != null && user.getCamoColor() != null && !user.getCamoColor().isBlank()) {
            throw new ApiException(HttpStatus.CONFLICT, "CAMO_COLOR_ALREADY_SET");
        }

        if (user == null) {
            user = User.builder()
                    .id(request.getUserId())
                    .username("Player_" + request.getUserId())
                    .coins(500)
                    .inkEnergy(100)
                    .chips(0)
                    .prestigeLevel(1)
                    .build();
        }

        String colorUpper = request.getCamoColor() != null ? request.getCamoColor().trim().toUpperCase() : "WHITE";
        int model = request.getCharacterModel() > 0 ? request.getCharacterModel() : 1;

        user.setCharacterModel(model);
        user.setCamoColor(colorUpper);
        User savedUser = userRepository.save(user);

        return PlayerSetupResponse.builder()
                .success(true)
                .characterModel(savedUser.getCharacterModel())
                .camoColor(savedUser.getCamoColor())
                .build();
    }
}
