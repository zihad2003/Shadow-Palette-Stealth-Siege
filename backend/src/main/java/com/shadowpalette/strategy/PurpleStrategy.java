package com.shadowpalette.strategy;

public class PurpleStrategy implements CamouflageStrategy {
    @Override
    public int getLuminanceBand() {
        return 2;
    }

    @Override
    public boolean matchesSurrounding(int surroundingBand) {
        return surroundingBand == getLuminanceBand();
    }

    @Override
    public String getColorName() {
        return "PURPLE";
    }
}
