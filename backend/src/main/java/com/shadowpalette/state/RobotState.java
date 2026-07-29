package com.shadowpalette.state;

import com.shadowpalette.observer.DetectionEvent;

public interface RobotState {
    void handleDetection(PatrolRobotContext context, DetectionEvent event);
    String getStateName();
}
