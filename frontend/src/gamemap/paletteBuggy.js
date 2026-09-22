import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GAME_COLORS } from '../colors.js';
import { MAP_COLS, MAP_ROWS, SEARCHLIGHT_TILE, TILE_HEIGHT, TILE_PITCH, tileWorldPos } from './mapConfig.js';
import { isDecorBannedTile, tileKey } from './occupancy.js';

export const CART_PARTS = [
  { id: 'WHEEL_FL', kind: 'wheel', color: null, label: 'Front-left wheel' },
  { id: 'WHEEL_FR', kind: 'wheel', color: null, label: 'Front-right wheel' },
  { id: 'WHEEL_RL', kind: 'wheel', color: null, label: 'Rear-left wheel' },
  { id: 'WHEEL_RR', kind: 'wheel', color: null, label: 'Rear-right wheel' },
  { id: 'HOOD_RED', kind: 'body', color: 'RED', label: 'Red hood' },
  { id: 'FENDER_GREEN', kind: 'body', color: 'GREEN', label: 'Green fenders' },
  { id: 'DOOR_BLUE', kind: 'body', color: 'BLUE', label: 'Blue doors' },
  { id: 'CAGE_YELLOW', kind: 'body', color: 'YELLOW', label: 'Yellow cage' },
  { id: 'REAR_PURPLE', kind: 'body', color: 'PURPLE', label: 'Purple rear' },
];

export const CART_PART_IDS = CART_PARTS.map((p) => p.id);
export const WHEEL_PART_IDS = CART_PARTS.filter((p) => p.kind === 'wheel').map((p) => p.id);
export const BODY_PART_IDS = CART_PARTS.filter((p) => p.kind === 'body').map((p) => p.id);

export const WHEEL_SLOTS = [
  { id: 'WHEEL_FL', x: -0.58, z: 0.82 },
  { id: 'WHEEL_FR', x: 0.58, z: 0.82 },
  { id: 'WHEEL_RL', x: -0.6, z: -0.78 },
  { id: 'WHEEL_RR', x: 0.6, z: -0.78 },
];

export const GARAGE_ORIGIN = {
  column: Math.floor(SEARCHLIGHT_TILE.column) - 1,
  row: Math.floor(SEARCHLIGHT_TILE.row) + 5,
};
export const GARAGE_SIZE = 4;

function clay(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.52,
    metalness: 0.08,
    ...extras,
  });
}

export function isGarageTile(column, row) {
  return (
    column >= GARAGE_ORIGIN.column &&
    column < GARAGE_ORIGIN.column + GARAGE_SIZE &&
    row >= GARAGE_ORIGIN.row &&
    row < GARAGE_ORIGIN.row + GARAGE_SIZE
  );
}

export function isNearGarage(column, row, radius = 3) {
  const cx = GARAGE_ORIGIN.column + (GARAGE_SIZE - 1) / 2;
  const cy = GARAGE_ORIGIN.row + (GARAGE_SIZE - 1) / 2;
  return isGarageTile(column, row) || Math.hypot(column - cx, row - cy) <= radius;
}

export function garageCenterWorld() {
  const cx = GARAGE_ORIGIN.column + (GARAGE_SIZE - 1) / 2;
  const cy = GARAGE_ORIGIN.row + (GARAGE_SIZE - 1) / 2;
  return tileWorldPos(cx, cy);
}

export function garageCenterTile() {
  return {
    column: Math.round(GARAGE_ORIGIN.column + (GARAGE_SIZE - 1) / 2),
    row: Math.round(GARAGE_ORIGIN.row + (GARAGE_SIZE - 1) / 2),
  };
}

/** Matches GameMap `buggyMesh.scale`. Hips sit on the cushion, not the feet. */
export const BUGGY_WORLD_SCALE = 1.48 * 0.75;
export const SEATED_CHAR_SCALE = 0.78;
const HIP_Y = 0.72;
const CUSHION_TOP = 0.63;
const SEAT_Y = CUSHION_TOP - (HIP_Y * SEATED_CHAR_SCALE) / BUGGY_WORLD_SCALE;

export function garageTileKeys() {
  const keys = [];
  for (let dx = 0; dx < GARAGE_SIZE; dx++) {
    for (let dy = 0; dy < GARAGE_SIZE; dy++) {
      keys.push(tileKey(GARAGE_ORIGIN.column + dx, GARAGE_ORIGIN.row + dy));
    }
  }
  return keys;
}

function clampTile(column, row) {
  return {
    column: Math.max(1, Math.min(MAP_COLS - 2, Math.round(column))),
    row: Math.max(1, Math.min(MAP_ROWS - 2, Math.round(row))),
  };
}

function findOpenTile(column, row, used, buildings = []) {
  const start = clampTile(column, row);
  for (let rad = 0; rad <= 6; rad++) {
    for (let dx = -rad; dx <= rad; dx++) {
      for (let dy = -rad; dy <= rad; dy++) {
        if (rad > 0 && Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
        const col = start.column + dx;
        const rw = start.row + dy;
        const key = tileKey(col, rw);
        if (col <= 0 || rw <= 0 || col >= MAP_COLS - 1 || rw >= MAP_ROWS - 1) continue;
        if (used.has(key) || isGarageTile(col, rw) || isDecorBannedTile(col, rw, buildings)) continue;
        return { column: col, row: rw, key };
      }
    }
  }
  return null;
}

/**
 * Scatter the 9 architecture pieces across the fortress — 4 wheels in the
 * quadrants, color skins in between — so they are hunted one by one.
 */
export function scatterCartParts(buildings = []) {
  const used = new Set(garageTileKeys());
  const targets = {
    WHEEL_FL: { column: 7, row: 7 },
    WHEEL_FR: { column: MAP_COLS - 8, row: 7 },
    WHEEL_RL: { column: 7, row: MAP_ROWS - 8 },
    WHEEL_RR: { column: MAP_COLS - 8, row: MAP_ROWS - 8 },
    HOOD_RED: { column: 16, row: 11 },
    FENDER_GREEN: { column: MAP_COLS - 17, row: 11 },
    DOOR_BLUE: { column: 10, row: 22 },
    CAGE_YELLOW: { column: MAP_COLS - 11, row: 22 },
    REAR_PURPLE: { column: Math.floor(MAP_COLS / 2), row: 8 },
  };
  return CART_PARTS.map((part, i) => {
    const guess = targets[part.id] || {
      column: 6 + (i % 5) * 8,
      row: 8 + Math.floor(i / 5) * 12,
    };
    const hit = findOpenTile(guess.column, guess.row, used, buildings);
    if (hit) {
      used.add(hit.key);
      return { id: part.id, column: hit.column, row: hit.row };
    }
    const fallback = clampTile(4 + i * 4, 6 + (i % 3) * 10);
    used.add(tileKey(fallback.column, fallback.row));
    return { id: part.id, ...fallback };
  });
}

export function findPartNear(spawns, column, row, radius = 2.2) {
  let best = null;
  let bestD = radius;
  (spawns || []).forEach((p) => {
    const d = Math.hypot(p.column - column, p.row - row);
    if (d <= bestD) {
      best = p;
      bestD = d;
    }
  });
  return best;
}

function skinMat(colorKey, mounted) {
  const hex = GAME_COLORS[colorKey] || '#888888';
  const mat = clay(hex, mounted ? { emissive: hex, emissiveIntensity: 0.14 } : {});
  mat.transparent = !mounted;
  mat.opacity = mounted ? 1 : 0.22;
  mat.depthWrite = mounted;
  mat.userData.partSkin = colorKey;
  return mat;
}

function markPart(mesh, partId) {
  mesh.userData.partId = partId;
  mesh.traverse((n) => {
    n.userData.partId = partId;
  });
  return mesh;
}

function ghostMat(mat, ghost) {
  if (!ghost) return mat;
  mat.transparent = true;
  mat.opacity = 0.2;
  mat.depthWrite = false;
  return mat;
}

function axleMesh(r, h, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), mat);
  m.rotation.z = Math.PI / 2;
  m.castShadow = true;
  return m;
}

function clayBar(from, to, radius, mat) {
  const a = from instanceof THREE.Vector3 ? from : new THREE.Vector3(...from);
  const b = to instanceof THREE.Vector3 ? to : new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 8), mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  return mesh;
}

function makeWheel({ ghost = false } = {}) {
  const g = new THREE.Group();
  const tireMat = ghostMat(clay('#1c1c1c'), ghost);
  const treadMat = ghostMat(clay('#111111'), ghost);
  const hubMat = ghostMat(clay('#C0392B'), ghost);
  const rimMat = ghostMat(clay('#3a3a3a'), ghost);

  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.18, 18), tireMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);
  const bulge = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.055, 8, 18), treadMat);
  bulge.rotation.y = Math.PI / 2;
  g.add(bulge);
  [-0.07, 0.07].forEach((x) => {
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.028, 6, 16), treadMat);
    lip.rotation.y = Math.PI / 2;
    lip.position.x = x;
    g.add(lip);
  });
  const rim = axleMesh(0.15, 0.14, rimMat);
  g.add(rim);
  const hub = axleMesh(0.09, 0.2, hubMat);
  g.add(hub);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), hubMat);
  cap.scale.set(0.55, 1, 1);
  cap.position.x = 0.1;
  g.add(cap);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const lug = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), rimMat);
    lug.position.set(0.09, Math.cos(a) * 0.09, Math.sin(a) * 0.09);
    g.add(lug);
  }
  g.userData.isWheel = true;
  return g;
}

function addGroundRing(g, hex) {
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.68, 24),
    new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.03;
  glow.userData.keepColor = true;
  g.add(glow);
}

function addBeacon(g, hex) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.06, 1.85, 8),
    new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
  );
  pole.position.y = 1.25;
  pole.userData.keepColor = true;
  pole.userData.isBeacon = true;
  g.add(pole);
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 10, 8),
    new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.9, depthWrite: false })
  );
  cap.position.y = 2.2;
  cap.userData.keepColor = true;
  cap.userData.isBeacon = true;
  g.add(cap);
}

function addHood(root, mounted) {
  const mat = skinMat('RED', mounted);
  const hood = markPart(new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.14, 0.82, 2, 0.07), mat), 'HOOD_RED');
  hood.position.set(0, 0.62, 0.62);
  hood.rotation.x = -0.16;
  hood.castShadow = true;
  hood.userData.keepColor = true;
  root.add(hood);
  const nose = markPart(new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.18, 0.28, 2, 0.06), mat), 'HOOD_RED');
  nose.position.set(0, 0.5, 0.98);
  nose.castShadow = true;
  nose.userData.keepColor = true;
  root.add(nose);
  const chevron = markPart(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 3), mat), 'HOOD_RED');
  chevron.rotation.x = -Math.PI / 2;
  chevron.position.set(0, 0.74, 0.78);
  chevron.userData.keepColor = true;
  root.add(chevron);
  const stripe = markPart(
    new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.04, 0.7, 1, 0.02), mat),
    'HOOD_RED'
  );
  stripe.position.set(0, 0.7, 0.58);
  stripe.rotation.x = -0.16;
  stripe.userData.keepColor = true;
  root.add(stripe);
}

function addFenders(root, mounted) {
  const mat = skinMat('GREEN', mounted);
  [-0.52, 0.52].forEach((x, i) => {
    const arch = markPart(new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.22, 0.72, 2, 0.08), mat), 'FENDER_GREEN');
    arch.position.set(x, 0.5, 0.78);
    arch.rotation.z = i === 0 ? 0.22 : -0.22;
    arch.castShadow = true;
    arch.userData.keepColor = true;
    root.add(arch);
    const lip = markPart(new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.1, 0.5, 1, 0.04), mat), 'FENDER_GREEN');
    lip.position.set(x + (i === 0 ? -0.14 : 0.14), 0.38, 0.78);
    lip.userData.keepColor = true;
    root.add(lip);
    const flare = markPart(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 6, 12, Math.PI), mat), 'FENDER_GREEN');
    flare.rotation.set(0, Math.PI / 2, i === 0 ? 0.2 : -0.2);
    flare.position.set(x, 0.42, 0.82);
    flare.userData.keepColor = true;
    root.add(flare);
  });
}

function addDoors(root, mounted) {
  const mat = skinMat('BLUE', mounted);
  const glass = skinMat('BLUE', mounted);
  glass.opacity = mounted ? 0.55 : 0.12;
  glass.transparent = true;
  [-0.5, 0.5].forEach((x, i) => {
    const door = markPart(new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.38, 0.78, 2, 0.04), mat), 'DOOR_BLUE');
    door.position.set(x, 0.64, 0.04);
    door.rotation.z = i === 0 ? 0.06 : -0.06;
    door.castShadow = true;
    door.userData.keepColor = true;
    root.add(door);
    const pane = markPart(new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.16, 0.42, 1, 0.02), glass), 'DOOR_BLUE');
    pane.position.set(x + (i === 0 ? -0.06 : 0.06), 0.78, 0.02);
    pane.userData.keepColor = true;
    root.add(pane);
    const handle = markPart(new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.04, 0.1, 1, 0.015), mat), 'DOOR_BLUE');
    handle.position.set(x + (i === 0 ? -0.08 : 0.08), 0.58, 0.18);
    handle.userData.keepColor = true;
    root.add(handle);
  });
}

function addCage(root, mounted) {
  const mat = skinMat('YELLOW', mounted);
  const r = 0.038;
  const hoopPts = [
    [[-0.34, 0.58, 0.32], [-0.34, 1.08, -0.08]],
    [[0.34, 0.58, 0.32], [0.34, 1.08, -0.08]],
    [[-0.34, 1.08, -0.08], [0.34, 1.08, -0.08]],
    [[-0.34, 1.08, -0.08], [-0.34, 0.58, -0.42]],
    [[0.34, 1.08, -0.08], [0.34, 0.58, -0.42]],
    [[-0.34, 1.08, -0.08], [-0.12, 1.12, -0.42]],
    [[0.34, 1.08, -0.08], [0.12, 1.12, -0.42]],
    [[-0.12, 1.12, -0.42], [0.12, 1.12, -0.42]],
  ];
  hoopPts.forEach(([a, b]) => {
    const bar = markPart(clayBar(a, b, r, mat), 'CAGE_YELLOW');
    bar.userData.keepColor = true;
    root.add(bar);
  });
  [-0.58, 0.58].forEach((x, i) => {
    const stalk = markPart(clayBar([x * 0.72, 0.7, 0.38], [x, 0.78, 0.48], 0.022, mat), 'CAGE_YELLOW');
    stalk.userData.keepColor = true;
    root.add(stalk);
    const mirror = markPart(new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.1, 0.16, 1, 0.03), mat), 'CAGE_YELLOW');
    mirror.position.set(x, 0.8, 0.5);
    mirror.rotation.y = i === 0 ? 0.35 : -0.35;
    mirror.userData.keepColor = true;
    root.add(mirror);
  });
  [-0.52, 0.52].forEach((x) => {
    const scoop = markPart(new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.16, 0.46, 2, 0.06), mat), 'CAGE_YELLOW');
    scoop.position.set(x, 0.46, -0.58);
    scoop.castShadow = true;
    scoop.userData.keepColor = true;
    root.add(scoop);
  });
}

function addRear(root, mounted) {
  const mat = skinMat('PURPLE', mounted);
  [-0.42, 0.42].forEach((x) => {
    const quarter = markPart(new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.4, 0.58, 2, 0.07), mat), 'REAR_PURPLE');
    quarter.position.set(x, 0.58, -0.82);
    quarter.castShadow = true;
    quarter.userData.keepColor = true;
    root.add(quarter);
  });
  const deck = markPart(new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.16, 0.42, 2, 0.06), mat), 'REAR_PURPLE');
  deck.position.set(0, 0.74, -0.88);
  deck.userData.keepColor = true;
  root.add(deck);
  const lip = markPart(new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.08, 0.16, 1, 0.04), mat), 'REAR_PURPLE');
  lip.position.set(0, 0.86, -1.04);
  lip.userData.keepColor = true;
  root.add(lip);
  [-0.16, 0.16].forEach((x) => {
    const pipe = markPart(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.22, 8), mat), 'REAR_PURPLE');
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(x, 0.42, -1.08);
    pipe.userData.keepColor = true;
    root.add(pipe);
  });
}

function addBodyPart(root, partId, mounted) {
  if (partId === 'HOOD_RED') addHood(root, mounted);
  else if (partId === 'FENDER_GREEN') addFenders(root, mounted);
  else if (partId === 'DOOR_BLUE') addDoors(root, mounted);
  else if (partId === 'CAGE_YELLOW') addCage(root, mounted);
  else if (partId === 'REAR_PURPLE') addRear(root, mounted);
}

function centerPickup(inner) {
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  const c = box.getCenter(new THREE.Vector3());
  inner.position.set(-c.x, -c.y + 0.42, -c.z);
  const wrap = new THREE.Group();
  wrap.add(inner);
  return wrap;
}

/** World pickup / carried piece — same silhouette as the buggy part. */
export function buildPartPickup(partId, { held = false } = {}) {
  const spec = cartPartById(partId) || CART_PARTS[0];
  const g = new THREE.Group();
  g.name = `CartPart_${spec.id}`;
  g.userData.partId = spec.id;
  g.userData.keepColor = true;
  const hex = spec.color ? GAME_COLORS[spec.color] : '#C0392B';

  if (spec.kind === 'wheel') {
    const w = makeWheel();
    w.position.y = 0.38;
    w.scale.setScalar(held ? 0.95 : 1.45);
    g.add(w);
    if (!held) {
      addGroundRing(g, '#C0392B');
      addBeacon(g, '#C0392B');
    }
    return g;
  }

  const inner = new THREE.Group();
  addBodyPart(inner, spec.id, true);
  const clustered = centerPickup(inner);
  clustered.scale.setScalar(held ? 0.85 : 1.05);
  g.add(clustered);
  if (!held) {
    addGroundRing(g, hex);
    addBeacon(g, hex);
  }
  return g;
}

function wheel(x, z, partId, mounted) {
  const g = makeWheel({ ghost: !mounted });
  g.position.set(x, 0.27, z);
  if (x > 0) g.rotation.y = Math.PI;
  return markPart(g, partId);
}

/**
 * Concept-art 2-seater palette buggy. Frame always present; wheels and
 * color skins light up as `mountedParts` are snapped on.
 */
export function buildPaletteBuggy(mountedParts = []) {
  const mounted = new Set(mountedParts);
  const root = new THREE.Group();
  root.name = 'PaletteBuggy';
  root.userData.isBuggy = true;

  const frame = clay('#2c2c2e');
  const bumper = clay('#18181a');
  const seatMat = clay('#141416');
  const stitch = clay('#2a2a2c');

  const tub = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.3, 1.55, 3, 0.1), frame);
  tub.position.y = 0.4;
  tub.castShadow = true;
  root.add(tub);
  const keel = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.1, 1.7, 2, 0.05), bumper);
  keel.position.y = 0.26;
  root.add(keel);
  const floor = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.06, 0.95, 2, 0.04), clay('#333338'));
  floor.position.y = 0.52;
  root.add(floor);

  const bar = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.18, 0.22, 2, 0.06), bumper);
  bar.position.set(0, 0.36, 1.08);
  bar.castShadow = true;
  root.add(bar);
  [-0.38, 0.38].forEach((x) => {
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 6, 10, Math.PI), bumper);
    hook.rotation.x = Math.PI / 2;
    hook.position.set(x, 0.34, 1.2);
    root.add(hook);
  });

  const dash = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.12, 0.22, 2, 0.04), bumper);
  dash.position.set(0, 0.68, 0.38);
  root.add(dash);

  const axleMat = clay('#1a1a1c');
  const frontAxle = axleMesh(0.04, 1.12, axleMat);
  frontAxle.position.set(0, 0.27, 0.82);
  root.add(frontAxle);
  const rearAxle = axleMesh(0.04, 1.16, axleMat);
  rearAxle.position.set(0, 0.27, -0.78);
  root.add(rearAxle);

  WHEEL_SLOTS.forEach((slot) => root.add(wheel(slot.x, slot.z, slot.id, mounted.has(slot.id))));

  [-0.2, 0.2].forEach((x) => {
    const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.1, 0.34, 2, 0.04), seatMat);
    cushion.position.set(x, 0.58, -0.06);
    cushion.castShadow = true;
    root.add(cushion);
    const back = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.36, 0.1, 2, 0.04), seatMat);
    back.position.set(x, 0.78, -0.22);
    back.rotation.x = -0.12;
    root.add(back);
    const head = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.12, 0.08, 1, 0.03), stitch);
    head.position.set(x, 0.98, -0.24);
    root.add(head);
  });

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.28, 8), bumper);
  column.position.set(-0.2, 0.72, 0.22);
  column.rotation.x = 0.7;
  root.add(column);
  const helm = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 8, 14), stitch);
  helm.position.set(-0.2, 0.82, 0.12);
  helm.rotation.x = 1.15;
  root.add(helm);

  [-0.28, 0.28].forEach((x) => {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 10, 8),
      clay('#F4C245', { emissive: '#F4C245', emissiveIntensity: 0.7 })
    );
    lamp.position.set(x, 0.46, 1.16);
    lamp.scale.set(1.15, 0.85, 0.7);
    root.add(lamp);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 6, 12), bumper);
    bezel.position.set(x, 0.46, 1.18);
    root.add(bezel);
  });
  [-0.22, 0.22].forEach((x) => {
    const tail = new THREE.Mesh(
      new RoundedBoxGeometry(0.16, 0.08, 0.05, 1, 0.02),
      clay('#E74C3C', { emissive: '#E74C3C', emissiveIntensity: 0.45 })
    );
    tail.position.set(x, 0.5, -1.12);
    root.add(tail);
  });

  addHood(root, mounted.has('HOOD_RED'));
  addFenders(root, mounted.has('FENDER_GREEN'));
  addDoors(root, mounted.has('DOOR_BLUE'));
  addCage(root, mounted.has('CAGE_YELLOW'));
  addRear(root, mounted.has('REAR_PURPLE'));

  root.userData.driverSeat = new THREE.Vector3(-0.2, SEAT_Y, -0.02);
  root.userData.passengerSeat = new THREE.Vector3(0.2, SEAT_Y, -0.02);
  return root;
}

export function buildGaragePad() {
  const g = new THREE.Group();
  g.name = 'GaragePad';
  const mat = new THREE.MeshStandardMaterial({
    color: '#3d4a58',
    roughness: 0.78,
    metalness: 0.08,
  });
  const slab = new THREE.Mesh(
    new RoundedBoxGeometry(GARAGE_SIZE * TILE_PITCH * 0.98, 0.12, GARAGE_SIZE * TILE_PITCH * 0.98, 1, 0.05),
    mat
  );
  slab.position.y = 0.04;
  slab.receiveShadow = true;
  g.add(slab);
  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(GARAGE_SIZE * TILE_PITCH * 0.78, 0.22),
    new THREE.MeshBasicMaterial({ color: '#F4A261', transparent: true, opacity: 0.85, depthWrite: false })
  );
  stripe.rotation.x = -Math.PI / 2;
  stripe.position.y = 0.11;
  g.add(stripe);
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(GARAGE_SIZE * TILE_PITCH * 0.42, GARAGE_SIZE * TILE_PITCH * 0.48, 28),
    new THREE.MeshBasicMaterial({
      color: '#F4C245',
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.12;
  g.add(rim);
  const c = garageCenterWorld();
  g.position.set(c.x, TILE_HEIGHT, c.z);
  return g;
}

/** Oval around the searchlight plaza, inside the walls. */
export function buggyTrackPose(t) {
  const cx = SEARCHLIGHT_TILE.column;
  const cy = SEARCHLIGHT_TILE.row;
  const rx = 8.2;
  const rz = 5.6;
  const ang = (t % 1) * Math.PI * 2;
  const col = cx + Math.cos(ang) * rx;
  const row = cy + Math.sin(ang) * rz;
  const p = tileWorldPos(col, row);
  const nAng = ang + 0.04;
  const np = tileWorldPos(cx + Math.cos(nAng) * rx, cy + Math.sin(nAng) * rz);
  const yaw = Math.atan2(np.x - p.x, np.z - p.z);
  return { x: p.x, z: p.z, yaw, y: TILE_HEIGHT };
}

export const BUGGY_GEAR_SPEED = [0, 0.045, 0.09, 0.155];

export function cartPartById(id) {
  return CART_PARTS.find((p) => p.id === id) || null;
}
