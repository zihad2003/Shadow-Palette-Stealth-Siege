package com.shadowpalette.observer;

import lombok.Getter;

@Getter
public class GateLockObserver implements SensorObserver {
    private boolean gateLocked = false;

    @Override
    public void onDetectionTriggered(DetectionEvent event) {
        this.gateLocked = true;
    }
}
