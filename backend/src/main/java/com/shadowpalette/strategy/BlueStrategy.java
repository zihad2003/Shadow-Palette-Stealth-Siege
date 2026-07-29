package com.shadowpalette.strategy;

public class BlueStrategy implements CamouflageStrategy {
    @Override
    public int getLuminanceBand() {
        return 1; // Darkest
    }

    @Override
    public boolean matchesSurrounding(int surroundingBand) {
        return getLuminanceBand() == surroundingBand;
    }

    @Override
    public String getColorName() {
        return "BLUE";
    }
}
