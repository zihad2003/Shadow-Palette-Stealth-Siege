import * as THREE from 'three';
import { clayMat, BASE_CLAY } from './clayMaterials.js';

// Worn paths: gate (south) to the central plaza, plus a cross arm.
export function createDirtPaths() {
  const group = new THREE.Group();
  const mat = clayMat(BASE_CLAY.path, { roughness: 0.8 });

  const main = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 8.6), mat);
  main.rotation.x = -Math.PI / 2;
  main.position.set(0, 0.012, 5.6);
  main.receiveShadow = true;
  group.add(main);

  const cross = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 1.4), mat);
  cross.rotation.x = -Math.PI / 2;
  cross.position.set(0, 0.012, 0);
  cross.receiveShadow = true;
  group.add(cross);

  for (let i = 0; i < 7; i++) {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.05, 8), clayMat(BASE_CLAY.stone));
    stone.position.set(((i % 2) - 0.5) * 0.5, 0.03, 2.2 + i * 0.95);
    group.add(stone);
  }

  return group;
}
