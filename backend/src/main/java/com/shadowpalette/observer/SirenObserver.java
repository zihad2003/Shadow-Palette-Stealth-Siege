package com.shadowpalette.observer;

import lombok.Getter;

@Getter
public class SirenObserver implements SensorObserver {
    private boolean sirenActive = false;

    @Override
    public void onDetectionTriggered(DetectionEvent event) {
        this.sirenActive = true;
    }
}
