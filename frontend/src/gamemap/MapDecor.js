import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  MAP_COLS,
  MAP_ROWS,
  TILE_HEIGHT,
  TILE_PITCH,
  LARGE_MAP,
  MAP_COLORS,
  tileWorldPos,
} from './mapConfig.js';
import { isDecorBannedTile } from './occupancy.js';

function hash(n, salt = 0) {
  const s = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function clay(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.04,
    ...extras,
  });
}

function noRaycast(root) {
  root.traverse((n) => {
    if (n.isMesh) n.raycast = () => {};
  });
  root.userData.isDecor = true;
  return root;
}

function barrel(i) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.42, 10), clay('#8B5A3C'));
  body.position.y = 0.22;
  body.castShadow = !LARGE_MAP;
  g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.025, 6, 12), clay('#5C4030'));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.38;
  g.add(rim);
  return g;
}

function crate(i) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.36, 0.42, 1, 0.04), clay('#C4A574'));
  box.position.y = 0.18;
  box.castShadow = !LARGE_MAP;
  g.add(box);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.44), clay('#8B7355'));
  lid.position.y = 0.38;
  g.add(lid);
  return g;
}

function pot(i) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.22, 10), clay('#B85C38'));
  pot.position.y = 0.12;
  g.add(pot);
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    clay(['#4E9C5C', '#6FA84F', '#C97BB6'][Math.floor(hash(i, 2) * 3)])
  );
  leaf.position.y = 0.3;
  leaf.scale.y = 0.7;
  g.add(leaf);
  return g;
}

function lantern(i) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 6), clay('#4A4540'));
  pole.position.y = 0.45;
  g.add(pole);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 10, 8),
    clay(MAP_COLORS.lamp, { emissive: MAP_COLORS.lamp, emissiveIntensity: 0.55 })
  );
  lamp.position.y = 0.95;
  lamp.userData.keepColor = true;
  g.add(lamp);
  return g;
}

function bench(i) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.08, 0.28, 1, 0.03), clay('#6B4A32'));
  seat.position.y = 0.28;
  g.add(seat);
  [-0.28, 0.28].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.08), clay('#5C4030'));
    leg.position.set(x, 0.13, 0);
    g.add(leg);
  });
  return g;
}

function cart(i) {
  const g = new THREE.Group();
  const bed = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.14, 0.45, 1, 0.04), clay('#8B6914'));
  bed.position.y = 0.28;
  bed.castShadow = !LARGE_MAP;
  g.add(bed);
  [-0.28, 0.28].forEach((x) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 10), clay('#3A3630'));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.14, 0.22);
    g.add(wheel);
  });
  return g;
}

function well(i) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.35, 12), clay('#8A8680'));
  base.position.y = 0.18;
  base.castShadow = !LARGE_MAP;
  g.add(base);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 16),
    clay('#5BA3C9', { emissive: '#2a6a88', emissiveIntensity: 0.2 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.34;
  g.add(water);
  return g;
}

function sack(i) {
  const g = new THREE.Group();
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), clay('#C9B896'));
  bag.scale.set(1, 1.15, 0.9);
  bag.position.y = 0.2;
  g.add(bag);
  return g;
}

function fence(i) {
  const g = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), clay('#6B4A32'));
    post.position.set(-0.25 + k * 0.25, 0.2, 0);
    g.add(post);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.04), clay('#8B6914'));
  rail.position.y = 0.28;
  g.add(rail);
  return g;
}

function signpost(i) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.7, 6), clay('#5C4030'));
  pole.position.y = 0.35;
  g.add(pole);
  const board = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.22, 0.04, 1, 0.02), clay('#D5453C'));
  board.position.set(0.12, 0.62, 0);
  g.add(board);
  return g;
}

function campfire(i) {
  const g = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.35, 6), clay('#5C4030'));
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (k / 4) * Math.PI;
    log.position.y = 0.06;
    g.add(log);
  }
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.28, 8),
    clay('#FF8A3D', { emissive: '#FF6B2C', emissiveIntensity: 0.7, transparent: true, opacity: 0.9 })
  );
  flame.position.y = 0.28;
  flame.userData.keepColor = true;
  flame.userData.motion = 'pulse';
  flame.userData.motionAmp = 1.2;
  flame.userData.baseY = 0.28;
  g.add(flame);
  return g;
}

function fountain(i) {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.2, 14), clay('#9C9994'));
  bowl.position.y = 0.12;
  g.add(bowl);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.45, 8), clay('#ABA8A3'));
  pillar.position.y = 0.4;
  g.add(pillar);
  const spray = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    clay('#7EC8E3', { emissive: '#3a8ab0', emissiveIntensity: 0.25, transparent: true, opacity: 0.75 })
  );
  spray.position.y = 0.7;
  spray.userData.motion = 'bob';
  spray.userData.motionAmp = 1;
  spray.userData.baseY = 0.7;
  g.add(spray);
  return g;
}

function marketStall(i) {
  const g = new THREE.Group();
  const table = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.08, 0.45, 1, 0.03), clay('#8B6914'));
  table.position.y = 0.35;
  g.add(table);
  [-0.28, 0.28].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), clay('#5C4030'));
    leg.position.set(x, 0.16, 0.15);
    g.add(leg);
    const leg2 = leg.clone();
    leg2.position.z = -0.15;
    g.add(leg2);
  });
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.04, 0.55),
    clay(['#D5453C', '#F4C245', '#4E9C8D'][Math.floor(hash(i, 4) * 3)])
  );
  canopy.position.y = 0.72;
  g.add(canopy);
  return g;
}

function hayBale(i) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.32, 0.35, 1, 0.06), clay('#D4C07A'));
  mesh.position.y = 0.16;
  mesh.castShadow = !LARGE_MAP;
  return mesh;
}

function mushroom(i) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.16, 8), clay('#E8DCC8'));
  stem.position.y = 0.08;
  g.add(stem);
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    clay(['#D5453C', '#F4A261', '#8B6BC7'][Math.floor(hash(i, 5) * 3)])
  );
  cap.scale.y = 0.45;
  cap.position.y = 0.18;
  g.add(cap);
  return g;
}

const MAKERS = [
  barrel,
  crate,
  pot,
  lantern,
  bench,
  cart,
  sack,
  fence,
  signpost,
  campfire,
  hayBale,
  mushroom,
  marketStall,
  well,
  fountain,
];

/**
 * Deterministic list of tiles occupied by courtyard props (same as visuals).
 */
export function listDecorOccupiedTiles(seed = 7, buildings = []) {
  const used = new Set();
  const target = LARGE_MAP ? 110 : 36;
  let placed = 0;
  let attempts = 0;

  while (placed < target && attempts < target * 40) {
    attempts += 1;
    const n = seed * 97 + attempts * 13;
    const column = 1 + Math.floor(hash(n, 1) * (MAP_COLS - 2));
    const row = 1 + Math.floor(hash(n, 2) * (MAP_ROWS - 2));
    const key = `${column},${row}`;
    if (used.has(key) || isDecorBannedTile(column, row, buildings)) continue;
    used.add(key);
    placed += 1;
  }

  const edgeStep = LARGE_MAP ? 4 : 3;
  for (let c = 2; c < MAP_COLS - 2; c += edgeStep) {
    [1, MAP_ROWS - 2].forEach((r) => {
      if (isDecorBannedTile(c, r, buildings)) return;
      used.add(`${c},${r}`);
    });
  }
  for (let r = 3; r < MAP_ROWS - 3; r += edgeStep) {
    [1, MAP_COLS - 2].forEach((c) => {
      if (isDecorBannedTile(c, r, buildings)) return;
      used.add(`${c},${r}`);
    });
  }

  return used;
}

/**
 * Scatter clay world props across the fortress courtyard — barrels, stalls,
 * lanterns, wells, flora accents. Deterministic per seed; ignores raycasts.
 */
export function createInteriorDecor({ seed = 7, buildings = [] } = {}) {
  const group = new THREE.Group();
  group.name = 'InteriorDecor';

  const target = LARGE_MAP ? 110 : 36;
  const used = new Set();
  let placed = 0;
  let attempts = 0;

  while (placed < target && attempts < target * 40) {
    attempts += 1;
    const n = seed * 97 + attempts * 13;
    const column = 1 + Math.floor(hash(n, 1) * (MAP_COLS - 2));
    const row = 1 + Math.floor(hash(n, 2) * (MAP_ROWS - 2));
    const key = `${column},${row}`;
    if (used.has(key) || isDecorBannedTile(column, row, buildings)) continue;
    used.add(key);

    const maker = MAKERS[Math.floor(hash(n, 3) * MAKERS.length)];
    const prop = noRaycast(maker(n));
    const p = tileWorldPos(column, row);
    const jitterX = (hash(n, 4) - 0.5) * TILE_PITCH * 0.28;
    const jitterZ = (hash(n, 5) - 0.5) * TILE_PITCH * 0.28;
    prop.position.set(p.x + jitterX, TILE_HEIGHT, p.z + jitterZ);
    prop.rotation.y = hash(n, 6) * Math.PI * 2;
    const sc = 0.85 + hash(n, 7) * 0.35;
    prop.scale.setScalar(sc);
    prop.userData.decorTile = key;
    prop.userData.solid = true;
    group.add(prop);
    placed += 1;
  }

  const edgeStep = LARGE_MAP ? 4 : 3;
  for (let c = 2; c < MAP_COLS - 2; c += edgeStep) {
    [1, MAP_ROWS - 2].forEach((r, idx) => {
      if (isDecorBannedTile(c, r, buildings)) return;
      const lamp = noRaycast(lantern(seed + c * 17 + idx));
      const p = tileWorldPos(c, r);
      lamp.position.set(p.x, TILE_HEIGHT, p.z);
      lamp.userData.decorTile = `${c},${r}`;
      lamp.userData.solid = true;
      group.add(lamp);
    });
  }
  for (let r = 3; r < MAP_ROWS - 3; r += edgeStep) {
    [1, MAP_COLS - 2].forEach((c, idx) => {
      if (isDecorBannedTile(c, r, buildings)) return;
      const lamp = noRaycast(lantern(seed + r * 19 + idx + 99));
      const p = tileWorldPos(c, r);
      lamp.position.set(p.x, TILE_HEIGHT, p.z);
      lamp.userData.decorTile = `${c},${r}`;
      lamp.userData.solid = true;
      group.add(lamp);
    });
  }

  return group;
}

export function tickDecorMotion(group, elapsed) {
  if (!group) return;
  group.traverse((child) => {
    const kind = child.userData?.motion;
    if (!kind) return;
    const amp = child.userData.motionAmp || 1;
    const baseY = child.userData.baseY ?? child.position.y;
    if (kind === 'bob') child.position.y = baseY + Math.sin(elapsed * 2.6 * amp) * 0.04;
    else if (kind === 'pulse') {
      const s = 1 + Math.sin(elapsed * 3.2) * 0.08 * amp;
      child.scale.set(s, s * (1 + Math.sin(elapsed * 4) * 0.05), s);
    }
  });
}

export default createInteriorDecor;
