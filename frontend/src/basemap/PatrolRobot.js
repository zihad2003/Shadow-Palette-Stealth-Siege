import * as THREE from 'three';
import { clayMat, BASE_CLAY } from './clayMaterials.js';
import { COLORS } from '../colors.js';

// Guard bot circling the plaza — appears once a PATROL_ROBOT defense exists.
export function createPatrolRobot() {
  const bot = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.4, 4, 12), clayMat(BASE_CLAY.stone));
  body.position.y = 0.55;
  body.castShadow = true;
  bot.add(body);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 10),
    new THREE.MeshStandardMaterial({ color: COLORS.RED, emissive: new THREE.Color(COLORS.RED), emissiveIntensity: 0.7 })
  );
  eye.position.set(0, 0.78, 0.24);
  bot.add(eye);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 6), clayMat(BASE_CLAY.ink));
  antenna.position.y = 1.05;
  bot.add(antenna);

  const RADIUS = 4.6;
  return {
    object: bot,
    update(elapsed) {
      const a = elapsed * 0.4;
      bot.position.set(Math.cos(a) * RADIUS, 0, Math.sin(a) * RADIUS);
      bot.rotation.y = -a - Math.PI / 2;
    },
  };
}
