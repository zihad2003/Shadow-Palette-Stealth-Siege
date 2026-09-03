import * as THREE from 'three';
import { clayMat, CLAY } from './clayMaterials.js';

export function createInnerRoadRing() {
  const road = new THREE.Mesh(
    new THREE.RingGeometry(2.05, 2.45, 32),
    clayMat(CLAY.road)
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.51;
  road.receiveShadow = true;
  road.name = 'InnerRoadRing';
  return road;
}
