package com.shadowpalette.strategy;

public class YellowStrategy implements CamouflageStrategy {
    @Override
    public int getLuminanceBand() {
        return 4; // Light-medium
    }

    @Override
    public boolean matchesSurrounding(int surroundingBand) {
        return getLuminanceBand() == surroundingBand;
    }

    @Override
    public String getColorName() {
        return "YELLOW";
    }
}
