import * as THREE from 'three';
import { BASE_CLAY } from './clayMaterials.js';

// Dark clay sky + distance fog: terrain melts into the HUD background
// at the frustum edges instead of showing a hard horizon.
export function applySkyVignette(scene) {
  scene.background = new THREE.Color(BASE_CLAY.sky);
  scene.fog = new THREE.Fog(BASE_CLAY.sky, 34, 92);
}
