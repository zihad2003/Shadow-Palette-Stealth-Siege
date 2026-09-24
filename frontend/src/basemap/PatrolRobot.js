import * as THREE from 'three';
import { clayMat, BASE_CLAY } from './clayMaterials.js';
import { COLORS } from '../colors.js';

const STATE_TINT = {
  PATROL: { eye: COLORS.YELLOW || '#F4C245', body: BASE_CLAY.stone, lean: 0 },
  SUSPICIOUS: { eye: '#F4A261', body: '#8A7A68', lean: 0.06 },
  ALERT: { eye: '#E76F51', body: '#8A5A52', lean: 0.1 },
  CHASING: { eye: COLORS.RED, body: '#8A4545', lean: 0.14 },
  SEARCHING: { eye: '#5B8DEF', body: '#5A6570', lean: 0.04 },
};

/**
 * Guard bot circling the plaza — smooth waypoint lerp + state tint/pose.
 * Combat chase lives on gamemap/createGamePatrolRobot; this is the home-base loop.
 */
export function createPatrolRobot() {
  const bot = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.4, 4, 12), clayMat(BASE_CLAY.stone));
  body.position.y = 0.55;
  body.castShadow = true;
  bot.add(body);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 10),
    new THREE.MeshStandardMaterial({
      color: COLORS.YELLOW || '#F4C245',
      emissive: new THREE.Color(COLORS.YELLOW || '#F4C245'),
      emissiveIntensity: 0.55,
    })
  );
  eye.position.set(0, 0.78, 0.24);
  bot.add(eye);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 6), clayMat(BASE_CLAY.ink));
  antenna.position.y = 1.05;
  bot.add(antenna);

  const RADIUS = 4.6;
  const WAYPOINTS = 4;
  let state = 'PATROL';
  let angle = 0;
  let x = RADIUS;
  let z = 0;
  let yaw = 0;

  const applyState = (next) => {
    state = next || 'PATROL';
    const tint = STATE_TINT[state] || STATE_TINT.PATROL;
    eye.material.color.set(tint.eye);
    eye.material.emissive.set(tint.eye);
    eye.material.emissiveIntensity = state === 'CHASING' || state === 'ALERT' ? 1.2 : 0.55;
    body.material.color.set(tint.body);
    body.rotation.x = tint.lean;
  };

  return {
    object: bot,
    setState(next) {
      applyState(next);
    },
    update(elapsed, dt = 0.016) {
      const speed = state === 'CHASING' ? 0.7 : state === 'SEARCHING' ? 0.55 : state === 'SUSPICIOUS' ? 0.32 : 0.4;
      const targetAngle = elapsed * speed;
      // Smooth toward the continuous orbit angle instead of teleporting.
      angle += (targetAngle - angle) * Math.min(1, 8 * dt);
      const tx = Math.cos(angle) * RADIUS;
      const tz = Math.sin(angle) * RADIUS;
      const follow = 1 - Math.exp(-6 * dt);
      x += (tx - x) * follow;
      z += (tz - z) * follow;
      const face = -angle - Math.PI / 2;
      let d = ((face - yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (d < -Math.PI) d += Math.PI * 2;
      yaw += d * follow;
      bot.position.set(x, Math.sin(elapsed * 5) * 0.03, z);
      bot.rotation.y = yaw;
      // Subtle waypoint "tick" bob every quarter turn
      const wpPhase = (angle / ((Math.PI * 2) / WAYPOINTS)) % 1;
      if (wpPhase < 0.08) body.position.y = 0.55 + (0.08 - wpPhase) * 0.4;
      else body.position.y = 0.55;
    },
  };
}
