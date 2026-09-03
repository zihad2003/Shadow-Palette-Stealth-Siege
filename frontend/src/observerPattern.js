// Observer Pattern Client-Side Engine (JavaScript)

export class SensorSubject {
  constructor() {
    this.observers = [];
  }

  registerObserver(observer) {
    if (observer && !this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  removeObserver(observer) {
    this.observers = this.observers.filter((obs) => obs !== observer);
  }

  notifyObservers(event) {
    this.observers.forEach((obs) => {
      if (typeof obs.onAlarmTriggered === 'function') obs.onAlarmTriggered(event);
      else if (typeof obs.onDetectionTriggered === 'function') obs.onDetectionTriggered(event);
    });
  }
}

export class SirenObserver {
  constructor() {
    this.sirenActive = false;
  }
  onDetectionTriggered() {
    this.sirenActive = true;
  }
}

export class AlertLightObserver {
  constructor() {
    this.alertLightActive = false;
    this.sweepSpeedMultiplier = 1.0;
  }
  onDetectionTriggered() {
    this.alertLightActive = true;
    this.sweepSpeedMultiplier = 1.25;
  }
}

export class GateLockObserver {
  constructor() {
    this.gateLocked = false;
  }
  onDetectionTriggered() {
    this.gateLocked = true;
  }
}

export class PatrolRobotAlertListener {
  constructor(robotContext) {
    this.robotContext = robotContext;
  }
  onDetectionTriggered(event) {
    if (this.robotContext) {
      this.robotContext.lastSeenPlayerX = event.playerX;
      this.robotContext.lastSeenPlayerY = event.playerY;
      this.robotContext.setState('CHASING');
    }
  }
}
