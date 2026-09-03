import * as THREE from 'three';
import { clayMat, CLAY } from './clayMaterials.js';

export function createWaterRipples() {
  const group = new THREE.Group();
  group.name = 'WaterRipples';

  for (let i = 0; i < 3; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(7.4 + i * 0.55, 7.55 + i * 0.55, 48),
      clayMat(CLAY.foam, { transparent: true, opacity: 0.12 + i * 0.04 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.24;
    ring.userData.speed = 0.08 + i * 0.03;
    group.add(ring);
  }

  return group;
}
