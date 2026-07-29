package com.shadowpalette.state;

import com.shadowpalette.observer.DetectionEvent;

public class SuspiciousState implements RobotState {

    @Override
    public void handleDetection(PatrolRobotContext context, DetectionEvent event) {
        if ("CORE_ZONE".equals(event.getReason())) {
            context.setLastSeenPlayerX(event.getPlayerX());
            context.setLastSeenPlayerY(event.getPlayerY());
            context.setState(new AlertState());
            return;
        }

        if ("EDGE_ZONE_MISMATCH".equals(event.getReason())) {
            int currentTicks = context.getSuspiciousTicks() + 1;
            context.setSuspiciousTicks(currentTicks);
            if (currentTicks >= 3) { // 3 sustained ticks per GDD 8
                context.setLastSeenPlayerX(event.getPlayerX());
                context.setLastSeenPlayerY(event.getPlayerY());
                context.setState(new AlertState());
            }
        } else {
            // Revert back to Patrol
            context.setSuspiciousTicks(0);
            context.setState(new PatrolState());
        }
    }

    @Override
    public String getStateName() {
        return "SUSPICIOUS";
    }
}
