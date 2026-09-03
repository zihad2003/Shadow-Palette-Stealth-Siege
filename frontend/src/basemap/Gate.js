import * as THREE from 'three';
import { clayMat, BASE_CLAY } from './clayMaterials.js';
import { WALL_EDGE, GATE_WIDTH } from './OuterWalls.js';

// Wooden gate arch on the south wall opening.
export function createGate() {
  const group = new THREE.Group();
  const wood = clayMat(BASE_CLAY.wood);
  const trim = clayMat(BASE_CLAY.accent);

  const postGeo = new THREE.CylinderGeometry(0.24, 0.3, 2.1, 10);
  const left = new THREE.Mesh(postGeo, wood);
  left.position.set(-GATE_WIDTH / 2, 1.05, WALL_EDGE);
  left.castShadow = true;
  const right = left.clone();
  right.position.x = GATE_WIDTH / 2;
  group.add(left, right);

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(GATE_WIDTH + 0.9, 0.36, 0.5), wood);
  lintel.position.set(0, 2.1, WALL_EDGE);
  lintel.castShadow = true;
  group.add(lintel);

  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.5, 0.12), trim);
  sign.position.set(0, 1.62, WALL_EDGE + 0.24);
  group.add(sign);

  return group;
}
