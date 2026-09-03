import * as THREE from 'three';
import { clayMat, CLAY } from './clayMaterials.js';

export function createBeachRing() {
  const beach = new THREE.Mesh(
    new THREE.CylinderGeometry(8.55, 8.9, 0.28, 40),
    clayMat(CLAY.sand)
  );
  beach.position.y = -0.12;
  beach.receiveShadow = true;
  beach.name = 'BeachRing';
  return beach;
}
