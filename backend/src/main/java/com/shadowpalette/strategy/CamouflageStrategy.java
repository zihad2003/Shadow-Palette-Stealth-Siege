package com.shadowpalette.strategy;

public interface CamouflageStrategy {
    int getLuminanceBand();
    boolean matchesSurrounding(int surroundingBand);
    String getColorName();
}
