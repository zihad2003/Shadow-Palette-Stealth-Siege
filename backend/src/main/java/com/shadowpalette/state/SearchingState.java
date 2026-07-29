package com.shadowpalette.state;

import com.shadowpalette.observer.DetectionEvent;

public class SearchingState implements RobotState {

    @Override
    public void handleDetection(PatrolRobotContext context, DetectionEvent event) {
        if (event != null && ("CORE_ZONE".equals(event.getReason()) || "EDGE_ZONE_MISMATCH".equals(event.getReason()))) {
            // Re-detected -> back to Chasing
            context.setLastSeenPlayerX(event.getPlayerX());
            context.setLastSeenPlayerY(event.getPlayerY());
            context.setState(new ChasingState());
            return;
        }

        int remaining = context.getSearchTimerSeconds() - 1;
        context.setSearchTimerSeconds(remaining);

        if (remaining <= 0) {
            // Search expired -> revert to Patrol
            context.setState(new PatrolState());
        }
    }

    @Override
    public String getStateName() {
        return "SEARCHING";
    }
}
