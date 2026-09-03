import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { MAP_COLORS } from './mapConfig.js';
import { SLAB_HALF_W, SLAB_HALF_D } from './MapGround.js';

// ─── Fortress border in the reference style ──────────────────────────────
// Running-bond clay bricks, corner + mid-wall lamp towers, and a south gate
// with red banners and a stone path. Searchlight + Makeup House are added by GameMap.

const BRICK_L = 0.72;
const BRICK_H = 0.38;
const BRICK_W = 0.7;
const COURSES = 3;
const GATE_HALF = 1.35;

export const WALL_X = SLAB_HALF_W - 0.62;
export const WALL_Z = SLAB_HALF_D - 0.62;

function rand(i, salt) {
  const s = Math.sin(i * 61.7 + salt * 43.1) * 43758.5453;
  return s - Math.floor(s);
}

// ---- Brick walls (WallBlocks) ----
function buildBrickRun(group, geo, mats, horizontal, fixed, from, to, seed) {
  const span = to - from;
  for (let course = 0; course < COURSES; course++) {
    const y = BRICK_H / 2 + course * (BRICK_H + 0.015);
    const offset = course % 2 ? BRICK_L / 2 : 0;
    const count = Math.ceil((span - offset) / (BRICK_L + 0.04));
    for (let k = 0; k < count; k++) {
      const start = from + offset + k * (BRICK_L + 0.04);
      const len = Math.min(BRICK_L, to - start);
      if (len < 0.2) continue;
      const i = seed + course * 100 + k;
      const brick = new THREE.Mesh(geo, mats[Math.floor(rand(i, 9) * mats.length)]);
      brick.scale.set(len / BRICK_L, 0.94 + rand(i, 1) * 0.12, 0.94 + rand(i, 2) * 0.1);
      if (horizontal) brick.position.set(start + len / 2, y, fixed);
      else {
        brick.rotation.y = Math.PI / 2;
        brick.position.set(fixed, y, start + len / 2);
      }
      brick.rotation.z = (rand(i, 3) - 0.5) * 0.02;
      brick.castShadow = true;
      brick.receiveShadow = true;
      group.add(brick);
    }
  }
}

// ---- Lamp (shared by towers and gate pillars) ----
function makeLamp(y) {
  const lamp = new THREE.Group();
  const cage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.22, 0.2, 8),
    new THREE.MeshStandardMaterial({ color: '#3a3630', roughness: 0.7 })
  );
  cage.position.y = y;
  lamp.add(cage);
  // Glow sits ABOVE the cage so it reads from the top-down camera
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 14, 12),
    new THREE.MeshStandardMaterial({
      color: MAP_COLORS.lamp,
      emissive: new THREE.Color(MAP_COLORS.lamp),
      emissiveIntensity: 2.4,
      roughness: 0.35,
    })
  );
  glow.position.y = y + 0.18;
  lamp.add(glow);
  const light = new THREE.PointLight(0xffa95e, 0.7, 6, 1.8);
  light.position.y = y + 0.25;
  lamp.add(light);
  return lamp;
}

// ---- Towers (corner + mid-wall) ----
function makeTower(size, height, withLamp) {
  const tower = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: MAP_COLORS.towerStone, roughness: 0.74 });
  const capMat = new THREE.MeshStandardMaterial({ color: MAP_COLORS.wallTop, roughness: 0.7 });

  const body = new THREE.Mesh(new RoundedBoxGeometry(size, height, size, 3, 0.12), mat);
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  tower.add(body);

  const cap = new THREE.Mesh(new RoundedBoxGeometry(size + 0.24, 0.26, size + 0.24, 3, 0.1), capMat);
  cap.position.y = height + 0.13;
  cap.castShadow = true;
  tower.add(cap);

  if (withLamp) tower.add(makeLamp(height + 0.45));
  return tower;
}

// ---- Gate: pillars, red banners with gold crest, bar, stone path ----
function makeBanner() {
  const banner = new THREE.Group();
  const cloth = new THREE.Mesh(
    new RoundedBoxGeometry(0.55, 1.15, 0.1, 3, 0.05),
    new THREE.MeshStandardMaterial({ color: MAP_COLORS.banner, roughness: 0.6 })
  );
  banner.add(cloth);
  const crest = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.12),
    new THREE.MeshStandardMaterial({
      color: MAP_COLORS.bannerGold,
      roughness: 0.35,
      metalness: 0.25,
      emissive: new THREE.Color(MAP_COLORS.bannerGold),
      emissiveIntensity: 0.35,
    })
  );
  crest.position.z = 0.1;
  banner.add(crest);
  return banner;
}

function buildGate(group) {
  const pillarGeo = new RoundedBoxGeometry(0.95, 1.35, 0.95, 3, 0.12);
  const pillarMat = new THREE.MeshStandardMaterial({ color: MAP_COLORS.towerStone, roughness: 0.74 });

  [-1, 1].forEach((side) => {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(side * GATE_HALF, 0.675, WALL_Z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);

    const cap = new THREE.Mesh(
      new RoundedBoxGeometry(1.15, 0.24, 1.15, 3, 0.09),
      new THREE.MeshStandardMaterial({ color: MAP_COLORS.wallTop, roughness: 0.7 })
    );
    cap.position.set(side * GATE_HALF, 1.44, WALL_Z);
    cap.castShadow = true;
    group.add(cap);

    const banner = makeBanner();
    banner.position.set(side * GATE_HALF, 0.62, WALL_Z + 0.78);
    banner.rotation.x = 0.12;
    group.add(banner);

    const lamp = makeLamp(0);
    lamp.position.set(side * GATE_HALF, 1.75, WALL_Z);
    group.add(lamp);
  });

  // Wooden gate bar with dark metal rail
  const bar = new THREE.Mesh(
    new RoundedBoxGeometry(GATE_HALF * 2 - 0.7, 0.3, 0.22, 3, 0.08),
    new THREE.MeshStandardMaterial({ color: '#7a5a3c', roughness: 0.65 })
  );
  bar.position.set(0, 0.42, WALL_Z);
  bar.castShadow = true;
  group.add(bar);
  const rail = new THREE.Mesh(
    new RoundedBoxGeometry(GATE_HALF * 2 - 0.55, 0.12, 0.3, 3, 0.05),
    new THREE.MeshStandardMaterial({ color: '#43403a', roughness: 0.55 })
  );
  rail.position.set(0, 0.66, WALL_Z);
  group.add(rail);

  // Stone path leaving the gate — proud of the terrain so it reads clearly
  const pathMat = new THREE.MeshStandardMaterial({ color: MAP_COLORS.path, roughness: 0.8 });
  for (let k = 0; k < 4; k++) {
    const slabW = 1.2 - k * 0.09;
    const slab = new THREE.Mesh(new RoundedBoxGeometry(slabW, 0.16, 0.74, 3, 0.06), pathMat);
    slab.position.set((rand(k, 7) - 0.5) * 0.24, -0.08 - k * 0.05, WALL_Z + 0.95 + k * 0.85);
    slab.receiveShadow = true;
    slab.castShadow = true;
    group.add(slab);
  }
}

export function createFortressBorder() {
  const group = new THREE.Group();
  group.name = 'FortressBorder';

  const brickGeo = new RoundedBoxGeometry(BRICK_L, BRICK_H, BRICK_W, 2, 0.08);
  // Three stone shades so the running bond reads from the top-down camera
  const brickMats = [
    new THREE.MeshStandardMaterial({ color: MAP_COLORS.wallStone, roughness: 0.78 }),
    new THREE.MeshStandardMaterial({ color: MAP_COLORS.wallStoneDark, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: MAP_COLORS.wallTop, roughness: 0.76 }),
  ];

  const cornerClear = 0.95; // bricks stop where towers stand
  // North wall + side walls run full length between corner towers
  buildBrickRun(group, brickGeo, brickMats, true, -WALL_Z, -WALL_X + cornerClear, WALL_X - cornerClear, 11);
  buildBrickRun(group, brickGeo, brickMats, false, -WALL_X, -WALL_Z + cornerClear, WALL_Z - cornerClear, 23);
  buildBrickRun(group, brickGeo, brickMats, false, WALL_X, -WALL_Z + cornerClear, WALL_Z - cornerClear, 37);
  // South wall splits around the gate opening
  buildBrickRun(group, brickGeo, brickMats, true, WALL_Z, -WALL_X + cornerClear, -GATE_HALF - 0.55, 51);
  buildBrickRun(group, brickGeo, brickMats, true, WALL_Z, GATE_HALF + 0.55, WALL_X - cornerClear, 67);

  // Corner anchors — larger than wall bricks, not giant towers
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      const tower = makeTower(1.22, 1.05, true);
      tower.position.set(sx * WALL_X, 0, sz * WALL_Z);
      group.add(tower);
    });
  });

  const midN = makeTower(0.98, 0.88, true);
  midN.position.set(0, 0, -WALL_Z);
  group.add(midN);
  const midW = makeTower(0.98, 0.88, true);
  midW.position.set(-WALL_X, 0, 0);
  group.add(midW);
  const midE = makeTower(0.98, 0.88, true);
  midE.position.set(WALL_X, 0, 0);
  group.add(midE);

  buildGate(group);

  return group;
}
