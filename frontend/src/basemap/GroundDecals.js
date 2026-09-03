import * as THREE from 'three';
import { clayMat, BASE_CLAY } from './clayMaterials.js';
import { HALF } from './gridUtils.js';

// Small flat clay spots inside the walls for texture without a grid feel.
export function createGroundDecals() {
  const group = new THREE.Group();
  const mat = clayMat(BASE_CLAY.groundDark, { roughness: 0.85 });
  const rand = (i, salt) => {
    const s = Math.sin(i * 53.3 + salt * 19.1) * 43758.5453;
    return s - Math.floor(s);
  };

  for (let i = 0; i < 16; i++) {
    const x = (rand(i, 1) - 0.5) * (HALF * 2 - 3);
    const z = (rand(i, 2) - 0.5) * (HALF * 2 - 3);
    if (Math.hypot(x, z) < 3.4) continue; // keep the plaza clean
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.3 + rand(i, 3) * 0.5, 10), mat);
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(x, 0.014, z);
    group.add(spot);
  }

  return group;
}
