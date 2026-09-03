import * as THREE from 'three';
import { clayMat, BASE_CLAY } from './clayMaterials.js';

// Stone circle under the fixed lighthouse — same spot for every player.
export function createCenterPlaza() {
  const group = new THREE.Group();

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.14, 36), clayMat(BASE_CLAY.plaza));
  disc.position.y = 0.07;
  disc.receiveShadow = true;
  group.add(disc);

  const trim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.09, 10, 40), clayMat(BASE_CLAY.wallTop));
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.15;
  group.add(trim);

  return group;
}
