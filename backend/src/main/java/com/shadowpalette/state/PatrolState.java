package com.shadowpalette.state;

import com.shadowpalette.observer.DetectionEvent;

public class PatrolState implements RobotState {

    @Override
    public void handleDetection(PatrolRobotContext context, DetectionEvent event) {
        if (event == null || "SAFE_EDGE_ZONE_MATCH".equals(event.getReason()) || "OUTSIDE_CONE".equals(event.getReason())) {
            return;
        }

        if ("CORE_ZONE".equals(event.getReason())) {
            context.setLastSeenPlayerX(event.getPlayerX());
            context.setLastSeenPlayerY(event.getPlayerY());
            context.setState(new AlertState());
        } else if ("EDGE_ZONE_MISMATCH".equals(event.getReason())) {
            context.setSuspiciousTicks(1);
            context.setState(new SuspiciousState());
        }
    }

    @Override
    public String getStateName() {
        return "PATROL";
    }
}
