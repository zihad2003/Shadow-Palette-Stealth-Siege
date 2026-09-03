import * as THREE from 'three';
import { clayMat, CLAY } from './clayMaterials.js';

export function createShoreFoam() {
  const foam = new THREE.Mesh(
    new THREE.RingGeometry(8.05, 8.55, 48),
    clayMat(CLAY.foam, { transparent: true, opacity: 0.35 })
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = -0.18;
  foam.name = 'ShoreFoam';
  return foam;
}
