import * as THREE from 'three';
import { RAID_COLORS } from './mapConfig.js';

function toLuma(color) {
  const y = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
  color.setRGB(y, y, y);
}

/** Drain every clay material and light to luminance — raid world is B&W. */
export function applyGrayscaleWorld(scene) {
  scene.background = new THREE.Color(RAID_COLORS.sky);
  scene.fog = new THREE.Fog(RAID_COLORS.sky, 46, 130);

  scene.traverse((child) => {
    if (child.userData?.keepColor || child.userData?.isAttacker || child.userData?.isBeam) return;
    if (child.isLight && child.color) toLuma(child.color);

    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (!mat) return;
      if (mat.color) toLuma(mat.color);
      if (mat.emissive) toLuma(mat.emissive);
    });
  });
}
