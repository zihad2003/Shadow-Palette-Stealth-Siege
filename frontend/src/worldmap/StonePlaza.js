import * as THREE from 'three';
import { clayMat, CLAY } from './clayMaterials.js';

export function createStonePlaza() {
  const group = new THREE.Group();
  group.name = 'StonePlaza';

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.65, 0.22, 20),
    clayMat(CLAY.plaza)
  );
  pad.position.y = 0.52;
  pad.receiveShadow = true;
  pad.castShadow = true;
  group.add(pad);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.58, 0.08, 8, 24),
    clayMat(CLAY.stone)
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.62;
  group.add(rim);

  return group;
}
