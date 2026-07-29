package com.shadowpalette.strategy;

import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class CamouflageStrategyFactory {

    private static final Map<String, CamouflageStrategy> STRATEGIES = Map.of(
            "WHITE", new WhiteStrategy(),
            "YELLOW", new YellowStrategy(),
            "GREEN", new GreenStrategy(),
            "RED", new RedStrategy(),
            "BLUE", new BlueStrategy()
    );

    public CamouflageStrategy getStrategy(String colorName) {
        if (colorName == null) return STRATEGIES.get("WHITE");
        String key = colorName.trim().toUpperCase();
        return STRATEGIES.getOrDefault(key, STRATEGIES.get("WHITE"));
    }

    public int getLuminanceBandForColor(String colorName) {
        return getStrategy(colorName).getLuminanceBand();
    }
}
