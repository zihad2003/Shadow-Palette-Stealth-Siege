import { SensorSubject, SirenObserver, AlertLightObserver, GateLockObserver } from '../observerPattern.js';

export function createAlarmTriggeredEvent(payload = {}) {
  return {
    type: 'AlarmTriggeredEvent',
    timestamp: Date.now(),
    ...payload,
  };
}

/**
 * Observer hub: DetectionSystem raises alarm → siren / UI / patrol robot subscribe.
 * Searchlight never calls these directly.
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
