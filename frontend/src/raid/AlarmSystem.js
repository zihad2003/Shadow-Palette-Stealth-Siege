import { SensorSubject, SirenObserver, AlertLightObserver, GateLockObserver } from '../observerPattern.js';

export function createAlarmTriggeredEvent(payload = {}) {
  return {
    type: 'AlarmTriggeredEvent',
    timestamp: Date.now(),
    ...payload,
  };
}

/**
 * Observer hub for one-shot meter-full alarm: siren / alert light / gate lock.
 *
 * PatrolRobot chase is NOT registered here — StealthRaidView drives the robot via
 * PatrolRobotContext.processDetection on each robot-tick so CORE_ZONE / EDGE_ZONE
 * escalation owns chase. Registering PatrolRobotAlertListener here would
 * double-trigger CHASING on justAlarmed.
 */
export function createAlarmSystem({ onAlarmTriggered } = {}) {
  const subject = new SensorSubject();
  const siren = new SirenObserver();
  const alertLight = new AlertLightObserver();
  const gateLock = new GateLockObserver();

  subject.registerObserver(siren);
  subject.registerObserver(alertLight);
  subject.registerObserver(gateLock);

  if (typeof onAlarmTriggered === 'function') {
    subject.registerObserver({
      onAlarmTriggered,
      onDetectionTriggered: onAlarmTriggered,
    });
  }

  let fired = false;

  return {
    subject,
    siren,
    alertLight,
    gateLock,
    get alarmActive() {
      return fired;
    },
    trigger(payload) {
      if (fired) return false;
      fired = true;
      const event = createAlarmTriggeredEvent(payload);
      subject.notifyObservers(event);
      return true;
    },
    reset() {
      fired = false;
      siren.sirenActive = false;
      alertLight.alertLightActive = false;
      alertLight.sweepSpeedMultiplier = 1;
      gateLock.gateLocked = false;
    },
  };
}
