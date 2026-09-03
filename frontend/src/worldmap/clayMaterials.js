import * as THREE from 'three';
import { COLORS, HUD } from '../colors.js';

export const CLAY = {
  ocean: '#163a42',
  oceanDeep: '#0d1b1e',
  foam: '#f1faee',
  sand: '#e9c9a1',
  grass: '#2a9d8f',
  grassDark: '#1d6f66',
  dirt: '#4a3a28',
  stone: '#6d7a78',
  plaza: '#8d9b98',
  road: '#5c5348',
  cliff: '#3d4f4c',
  wood: '#6b4a32',
  leaf: '#1b4332',
  blossom: '#e63946',
  cloud: '#f1faee',
  gold: HUD.ACCENT,
  self: COLORS.BLUE,
  enemy: COLORS.RED,
  free: COLORS.GREEN,
};

export function clayMat(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.52,
    metalness: 0.05,
    ...extras,
  });
}

export function plotStatusColor(status) {
  if (status === 'CLAIMED_SELF') return CLAY.self;
  if (status === 'CLAIMED_ENEMY') return CLAY.enemy;
  return CLAY.free;
}
