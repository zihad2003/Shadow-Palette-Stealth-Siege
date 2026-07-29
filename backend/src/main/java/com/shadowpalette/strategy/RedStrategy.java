package com.shadowpalette.strategy;

public class RedStrategy implements CamouflageStrategy {
    @Override
    public int getLuminanceBand() {
        return 2; // Medium-dark
    }

    @Override
    public boolean matchesSurrounding(int surroundingBand) {
        return getLuminanceBand() == surroundingBand;
    }

    @Override
    public String getColorName() {
        return "RED";
    }
}
