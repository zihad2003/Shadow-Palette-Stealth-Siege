package com.shadowpalette.observer;

import com.shadowpalette.state.ChasingState;
import com.shadowpalette.state.PatrolRobotContext;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class PatrolRobotAlertListener implements SensorObserver {
    private final PatrolRobotContext robotContext;

    @Override
    public void onDetectionTriggered(DetectionEvent event) {
        if (robotContext != null) {
            robotContext.setLastSeenPlayerX(event.getPlayerX());
            robotContext.setLastSeenPlayerY(event.getPlayerY());
            robotContext.setState(new ChasingState());
        }
    }
}
