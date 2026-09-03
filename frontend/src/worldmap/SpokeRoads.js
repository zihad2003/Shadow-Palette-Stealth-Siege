import * as THREE from 'three';
import { clayMat, CLAY } from './clayMaterials.js';

export function createSpokeRoads() {
  const group = new THREE.Group();
  group.name = 'SpokeRoads';

  for (let i = 0; i < 8; i += 1) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.06, 5.4),
      clayMat(CLAY.road)
    );
    const a = (i / 8) * Math.PI * 2;
    spoke.position.set(Math.cos(a) * 4.7, 0.5, Math.sin(a) * 4.7);
    spoke.rotation.y = -a;
    spoke.receiveShadow = true;
    group.add(spoke);
  }

  return group;
}
