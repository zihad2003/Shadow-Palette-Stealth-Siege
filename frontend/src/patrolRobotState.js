// 5-State State Pattern Client-Side Engine (JavaScript)

export const ROBOT_STATES = {
  PATROL: 'PATROL',
  SUSPICIOUS: 'SUSPICIOUS',
  ALERT: 'ALERT',
  CHASING: 'CHASING',
  SEARCHING: 'SEARCHING',
};

export class PatrolRobotContext {
  constructor() {
    this.state = ROBOT_STATES.PATROL;
    this.x = 5;
    this.y = 15;
    this.lastSeenPlayerX = null;
    this.lastSeenPlayerY = null;
    this.suspiciousTicks = 0;
    this.searchTimerSeconds = 0;
  }

  setState(newState) {
    this.state = newState;
  }

  processDetection(event) {
    if (!event) return;

    if (this.state === ROBOT_STATES.PATROL) {
      if (event.reason === 'CORE_ZONE') {
        this.lastSeenPlayerX = event.playerX;
        this.lastSeenPlayerY = event.playerY;
        this.setState(ROBOT_STATES.ALERT);
      } else if (event.reason === 'EDGE_ZONE_MISMATCH') {
        this.suspiciousTicks = 1;
        this.setState(ROBOT_STATES.SUSPICIOUS);
      }

    } else if (this.state === ROBOT_STATES.SUSPICIOUS) {
      if (event.reason === 'CORE_ZONE') {
        this.lastSeenPlayerX = event.playerX;
        this.lastSeenPlayerY = event.playerY;
        this.setState(ROBOT_STATES.ALERT);
      } else if (event.reason === 'EDGE_ZONE_MISMATCH') {
        this.suspiciousTicks += 1;
        if (this.suspiciousTicks >= 3) {
          this.lastSeenPlayerX = event.playerX;
          this.lastSeenPlayerY = event.playerY;
          this.setState(ROBOT_STATES.ALERT);
        }
      } else {
        this.suspiciousTicks = 0;
        this.setState(ROBOT_STATES.PATROL);
      }

    } else if (this.state === ROBOT_STATES.ALERT) {
      this.lastSeenPlayerX = event.playerX;
      this.lastSeenPlayerY = event.playerY;
      this.setState(ROBOT_STATES.CHASING);

    } else if (this.state === ROBOT_STATES.CHASING) {
      if (['CORE_ZONE', 'EDGE_ZONE_MISMATCH'].includes(event.reason)) {
        this.lastSeenPlayerX = event.playerX;
        this.lastSeenPlayerY = event.playerY;
      } else {
        this.searchTimerSeconds = 15;
        this.setState(ROBOT_STATES.SEARCHING);
      }

    } else if (this.state === ROBOT_STATES.SEARCHING) {
      if (['CORE_ZONE', 'EDGE_ZONE_MISMATCH'].includes(event.reason)) {
        this.lastSeenPlayerX = event.playerX;
        this.lastSeenPlayerY = event.playerY;
        this.setState(ROBOT_STATES.CHASING);
      } else {
        this.searchTimerSeconds -= 1;
        if (this.searchTimerSeconds <= 0) {
          this.setState(ROBOT_STATES.PATROL);
        }
      }
    }
  }
}
