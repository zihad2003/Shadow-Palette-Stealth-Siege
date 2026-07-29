package com.shadowpalette.factory;

import com.shadowpalette.entity.Lighthouse;
import com.shadowpalette.entity.PatrolRobot;
import org.springframework.stereotype.Component;

@Component
public class DefenseFactory {

    public Lighthouse createLighthouse(Long plotId, int modelVariant) {
        int variant = modelVariant > 0 ? modelVariant : 1;
        return Lighthouse.builder()
                .plotId(plotId)
                .modelVariant(variant)
                .coneAngle(60)
                .coneRange(7)
                .sweepSpeed(1.0f)
                .build();
    }

    public PatrolRobot createPatrolRobot(Long plotId) {
        return PatrolRobot.builder()
                .plotId(plotId)
                .currentState("PATROL")
                .baseSpeed(1.0f)
                .build();
    }
}
