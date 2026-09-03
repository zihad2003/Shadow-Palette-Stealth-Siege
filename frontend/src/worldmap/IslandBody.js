import * as THREE from 'three';
import { clayMat, CLAY } from './clayMaterials.js';

export function createIslandBody() {
  const group = new THREE.Group();
  group.name = 'IslandBody';

  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(8.0, 8.35, 0.7, 40),
    clayMat(CLAY.grass)
  );
  core.position.y = 0.05;
  core.receiveShadow = true;
  core.castShadow = true;
  group.add(core);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(7.7, 7.7, 0.16, 40),
    clayMat(CLAY.grassDark)
  );
  cap.position.y = 0.42;
  cap.receiveShadow = true;
  group.add(cap);

  return group;
}
