package com.shadowpalette.state;

import lombok.Data;

@Data
public class PatrolRobotContext {
    private RobotState state;
    private double x;
    private double y;
    private double lastSeenPlayerX;
    private double lastSeenPlayerY;
    private int suspiciousTicks;
    private int searchTimerSeconds;

    public PatrolRobotContext() {
        this.state = new PatrolState();
        this.x = 5.0;
        this.y = 15.0;
        this.suspiciousTicks = 0;
        this.searchTimerSeconds = 0;
    }

    public void setState(RobotState state) {
        this.state = state;
    }

    public void processDetection(com.shadowpalette.observer.DetectionEvent event) {
        if (state != null) {
            state.handleDetection(this, event);
        }
    }

    public String getCurrentStateName() {
        return state != null ? state.getStateName() : "UNKNOWN";
    }
}
