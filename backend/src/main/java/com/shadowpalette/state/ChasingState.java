package com.shadowpalette.state;

import com.shadowpalette.observer.DetectionEvent;

public class ChasingState implements RobotState {

    @Override
    public void handleDetection(PatrolRobotContext context, DetectionEvent event) {
        if (event != null && ("CORE_ZONE".equals(event.getReason()) || "EDGE_ZONE_MISMATCH".equals(event.getReason()))) {
            context.setLastSeenPlayerX(event.getPlayerX());
            context.setLastSeenPlayerY(event.getPlayerY());
        } else {
            // Line of sight lost -> transition to SearchingState
            context.setSearchTimerSeconds(15);
            context.setState(new SearchingState());
        }
    }

    @Override
    public String getStateName() {
        return "CHASING";
    }
}
