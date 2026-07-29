package com.shadowpalette.state;

import com.shadowpalette.observer.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PatrolRobotStateObserverTest {

    @Test
    @DisplayName("Observer Pattern: SensorSubject notifies all 4 observers simultaneously")
    void testSensorSubjectNotifiesFourObservers() {
        SensorSubject subject = new SensorSubject();
        PatrolRobotContext robotContext = new PatrolRobotContext();

        SirenObserver siren = new SirenObserver();
        AlertLightObserver alertLight = new AlertLightObserver();
        GateLockObserver gateLock = new GateLockObserver();
        PatrolRobotAlertListener robotListener = new PatrolRobotAlertListener(robotContext);

        subject.registerObserver(siren);
        subject.registerObserver(alertLight);
        subject.registerObserver(gateLock);
        subject.registerObserver(robotListener);

        assertEquals(4, subject.getObserverCount());

        // Verify initial state
        assertFalse(siren.isSirenActive());
        assertFalse(alertLight.isAlertLightActive());
        assertFalse(gateLock.isGateLocked());
        assertEquals("PATROL", robotContext.getCurrentStateName());

        // Broadcast DetectionEvent
        DetectionEvent event = DetectionEvent.builder()
                .playerX(10.0)
                .playerY(5.0)
                .reason("CORE_ZONE")
                .timestamp(System.currentTimeMillis())
                .build();

        subject.notifyObservers(event);

        // Verify all 4 observers reacted simultaneously
        assertTrue(siren.isSirenActive(), "SirenObserver must activate siren");
        assertTrue(alertLight.isAlertLightActive(), "AlertLightObserver must activate flashing light");
        assertEquals(1.25f, alertLight.getSweepSpeedMultiplier(), "Lighthouse sweep speed boosted by +25%");
        assertTrue(gateLock.isGateLocked(), "GateLockObserver must lock gate wall block");
        assertEquals("CHASING", robotContext.getCurrentStateName(), "PatrolRobotAlertListener must flip state to CHASING");
        assertEquals(10.0, robotContext.getLastSeenPlayerX());
        assertEquals(5.0, robotContext.getLastSeenPlayerY());
    }

    @Test
    @DisplayName("State Pattern: 5-State transition cycle (Patrol -> Suspicious -> Alert -> Chasing -> Searching -> Patrol)")
    void testStateTransitionsCycle() {
        PatrolRobotContext robot = new PatrolRobotContext();
        assertEquals("PATROL", robot.getCurrentStateName());

        // 1. Edge-zone mismatch -> SuspiciousState
        DetectionEvent edgeEvent = DetectionEvent.builder().playerX(4.0).playerY(4.0).reason("EDGE_ZONE_MISMATCH").build();
        robot.processDetection(edgeEvent);
        assertEquals("SUSPICIOUS", robot.getCurrentStateName());

        // 2. Sustained edge-zone mismatch (tick 2 & tick 3) -> AlertState
        robot.processDetection(edgeEvent); // tick 2
        assertEquals("SUSPICIOUS", robot.getCurrentStateName());
        robot.processDetection(edgeEvent); // tick 3 -> AlertState!
        assertEquals("ALERT", robot.getCurrentStateName());

        // 3. Alert confirmed -> ChasingState
        robot.processDetection(edgeEvent);
        assertEquals("CHASING", robot.getCurrentStateName());

        // 4. Line of sight lost -> SearchingState
        DetectionEvent lostEvent = DetectionEvent.builder().reason("OUTSIDE_CONE").build();
        robot.processDetection(lostEvent);
        assertEquals("SEARCHING", robot.getCurrentStateName());
        assertEquals(15, robot.getSearchTimerSeconds());

        // 5. Search timer expires -> PatrolState
        robot.setSearchTimerSeconds(1);
        robot.processDetection(lostEvent);
        assertEquals("PATROL", robot.getCurrentStateName());
    }
}
