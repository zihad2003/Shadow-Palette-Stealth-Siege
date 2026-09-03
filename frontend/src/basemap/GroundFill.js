import * as THREE from 'three';
import { GRID } from './gridUtils.js';
import { BASE_CLAY } from './clayMaterials.js';

const PX_PER_CELL = 32;
const SIZE = GRID * PX_PER_CELL;

// Deterministic pseudo-random per cell so splats don't shimmer between redraws
function cellRand(x, y, salt) {
  const s = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function drawBase(ctx) {
  ctx.fillStyle = BASE_CLAY.ground;
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Soft mottling so the ground reads as continuous clay, not a grid
  for (let i = 0; i < 220; i++) {
    const rx = cellRand(i, 3, 1) * SIZE;
    const ry = cellRand(i, 7, 2) * SIZE;
    const rr = 8 + cellRand(i, 11, 3) * 26;
    ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.045)' : 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.arc(rx, ry, rr, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSplat(ctx, x, y, hex) {
  const cx = (x + 0.5) * PX_PER_CELL;
  const cy = (y + 0.5) * PX_PER_CELL;
  ctx.fillStyle = hex;
  ctx.globalAlpha = 0.94;
  // Irregular blob: one fat center circle + jittered satellites bleeding past
  // the cell edge so neighbouring painted cells merge into patches
  ctx.beginPath();
  ctx.arc(cx, cy, PX_PER_CELL * 0.58, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = cellRand(x, y, i) * Math.PI * 2;
    const d = PX_PER_CELL * (0.3 + cellRand(x, y, i + 9) * 0.28);
    const r = PX_PER_CELL * (0.2 + cellRand(x, y, i + 17) * 0.2);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function createGroundFill() {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  drawBase(ctx);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID, GRID),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.62, metalness: 0.03 })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.005;
  mesh.receiveShadow = true;

  return {
    mesh,
    updatePaint(paintedTiles) {
      drawBase(ctx);
      Object.entries(paintedTiles).forEach(([key, hex]) => {
        if (!hex) return;
        const [x, y] = key.split(',').map(Number);
        drawSplat(ctx, x, y, hex);
      });
      texture.needsUpdate = true;
    },
    dispose() {
      texture.dispose();
      mesh.geometry.dispose();
      mesh.material.dispose();
    },
  };
}
