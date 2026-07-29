package com.shadowpalette.strategy;

public class GreenStrategy implements CamouflageStrategy {
    @Override
    public int getLuminanceBand() {
        return 3; // Medium
    }

    @Override
    public boolean matchesSurrounding(int surroundingBand) {
        return getLuminanceBand() == surroundingBand;
    }

    @Override
    public String getColorName() {
        return "GREEN";
    }
}
