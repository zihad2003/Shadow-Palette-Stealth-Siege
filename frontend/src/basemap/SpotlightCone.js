import * as THREE from 'three';
import { BASE_CLAY } from './clayMaterials.js';

// Translucent light cone from the lamp down to the ground.
export function createSpotlightCone(lampY = 5.32) {
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(3.4, lampY, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: BASE_CLAY.beam,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  cone.position.y = lampY / 2;
  // Pivot at the lamp so the sweep tilts the cone around the tower top
  const pivot = new THREE.Group();
  cone.position.y = -lampY / 2;
  pivot.position.y = lampY;
  pivot.add(cone);
  pivot.rotation.z = 0.36;
  return pivot;
}
