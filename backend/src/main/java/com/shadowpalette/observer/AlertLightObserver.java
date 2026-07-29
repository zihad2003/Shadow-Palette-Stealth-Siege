package com.shadowpalette.observer;

import lombok.Getter;

@Getter
public class AlertLightObserver implements SensorObserver {
    private boolean alertLightActive = false;
    private float sweepSpeedMultiplier = 1.0f;

    @Override
    public void onDetectionTriggered(DetectionEvent event) {
        this.alertLightActive = true;
        this.sweepSpeedMultiplier = 1.25f; // +25% sweep speed on alarm per GDD 9
    }
}
