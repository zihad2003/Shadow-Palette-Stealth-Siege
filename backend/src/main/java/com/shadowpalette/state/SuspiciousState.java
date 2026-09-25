package com.shadowpalette.state;

import com.shadowpalette.observer.DetectionEvent;

public class SuspiciousState implements RobotState {

    @Override
    public void handleDetection(PatrolRobotContext context, DetectionEvent event) {
        if ("CORE_ZONE".equals(event.getReason())) {
            context.setLastSeenPlayerX(event.getPlayerX());
            context.setLastSeenPlayerY(event.getPlayerY());
            // Direct core hit bypasses ALERT dwell → CHASING immediately.
            context.setState(new ChasingState());
            return;
        }

        if ("EDGE_ZONE_MISMATCH".equals(event.getReason())) {
            int currentTicks = context.getSuspiciousTicks() + 1;
            context.setSuspiciousTicks(currentTicks);
            if (currentTicks >= com.shadowpalette.util.StealthConstants.SUSPICIOUS_TICKS_TO_ALERT) {
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
