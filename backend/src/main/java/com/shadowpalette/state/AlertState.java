package com.shadowpalette.state;

import com.shadowpalette.observer.DetectionEvent;

public class AlertState implements RobotState {

    @Override
    public void handleDetection(PatrolRobotContext context, DetectionEvent event) {
        // Alert confirmed -> immediately transition to ChasingState
        if (event != null) {
            context.setLastSeenPlayerX(event.getPlayerX());
            context.setLastSeenPlayerY(event.getPlayerY());
        }
        context.setState(new ChasingState());
    }

    @Override
    public String getStateName() {
        return "ALERT";
    }
}
