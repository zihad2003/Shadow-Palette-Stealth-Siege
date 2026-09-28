package com.shadowpalette.service;

import com.shadowpalette.security.SecurityUtils;

import com.shadowpalette.dto.PlotClaimRequest;
import com.shadowpalette.dto.PlotClaimResponse;
import com.shadowpalette.dto.PlotDto;
import com.shadowpalette.entity.Plot;
import com.shadowpalette.entity.User;
import com.shadowpalette.exception.ApiException;
import com.shadowpalette.repository.PlotRepository;
import com.shadowpalette.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PlotService {

    private final PlotRepository plotRepository;
    private final UserRepository userRepository;

    @Transactional
    public PlotClaimResponse claimPlot(PlotClaimRequest request) {
        Plot plot = plotRepository.findById(request.getPlotId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PLOT_NOT_FOUND"));

        if (plot.isOccupied() || plot.getOwnerId() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "PLOT_ALREADY_OWNED");
        }

        User user = userRepository.findById(SecurityUtils.getCurrentUserId())
                .orElseGet(() -> userRepository.save(User.builder()
                        .id(SecurityUtils.getCurrentUserId())
                        .username("Player_" + String.format("%05d", SecurityUtils.getCurrentUserId()))
                        .coins(500)
                        .inkEnergy(100)
                        .chips(0)
                        .prestigeLevel(1)
                        .build()));

        plot.setOwnerId(user.getId());
        plot.setOccupied(true);
        Plot savedPlot = plotRepository.save(plot);

        return PlotClaimResponse.builder()
                .success(true)
                .plot(PlotDto.builder()
                        .id(savedPlot.getId())
                        .xCoord(savedPlot.getXCoord())
                        .yCoord(savedPlot.getYCoord())
                        .ownerId(savedPlot.getOwnerId())
                        .isOccupied(savedPlot.isOccupied())
                        .build())
                .coinsRemaining(user.getCoins())
                .build();
    }
}
