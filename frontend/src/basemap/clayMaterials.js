import * as THREE from 'three';
import { HUD } from '../colors.js';

export const BASE_CLAY = {
  sky: '#0d1b1e',
  ground: '#8a9a7b',
  groundDark: '#71835f',
  skirt: '#5d7052',
  hill: '#4d5f46',
  path: '#a08a66',
  plaza: '#9aa5a0',
  wall: '#c9beac',
  wallTop: '#ddd3c2',
  wood: '#6b4a32',
  stone: '#6d7a78',
  ink: HUD.BG,
  accent: HUD.ACCENT,
  beam: '#fff3d6',
  white: '#F1FAEE',
};

export function clayMat(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.04,
    ...extras,
  });
}

export function disposeObject(root) {
  root.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
      else if (child.material) child.material.dispose();
    }
  });
}
