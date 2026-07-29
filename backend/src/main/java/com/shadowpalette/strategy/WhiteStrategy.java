package com.shadowpalette.strategy;

public class WhiteStrategy implements CamouflageStrategy {
    @Override
    public int getLuminanceBand() {
        return 5; // Lightest
    }

    @Override
    public boolean matchesSurrounding(int surroundingBand) {
        return getLuminanceBand() == surroundingBand;
    }

    @Override
    public String getColorName() {
        return "WHITE";
    }
}
