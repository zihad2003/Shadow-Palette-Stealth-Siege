import * as THREE from 'three';
import { RAID_COLORS, boardFogRange } from './mapConfig.js';

/** Drain every clay material and light to luminance — raid world is B&W. */
export function toLumaColor(color) {
  if (!color || !color.isColor) return;
  const y = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
  color.setRGB(y, y, y);
}

export function desaturateObject(root, { force = false } = {}) {
  if (!root) return;
  root.traverse((child) => {
    // Raider clothes stay their camo color. Everything else in a raid goes gray.
    if (child.userData?.isAttacker) return;
    if (!force && (child.userData?.keepColor || child.userData?.isBeam)) return;
    if (child.isLight && child.color) toLumaColor(child.color);
    if (!child.isMesh && !child.isSprite) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (!mat) return;
      if (mat.color) toLumaColor(mat.color);
      if (mat.emissive) toLumaColor(mat.emissive);
    });
  });
}

export function applyGrayscaleWorld(scene) {
  scene.background = new THREE.Color(RAID_COLORS.sky);
  const { near, far } = boardFogRange();
  scene.fog = new THREE.Fog(RAID_COLORS.sky, near, far);
  desaturateObject(scene, { force: true });
}
