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
  { id: 'WHEEL_FL', x: -0.38, z: 0.72 },
  { id: 'WHEEL_FR', x: 0.38, z: 0.72 },
  { id: 'WHEEL_RL', x: -0.4, z: -0.7 },
  { id: 'WHEEL_RR', x: 0.4, z: -0.7 },
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

export function isNearGarage(column, row, radius = 2) {
  const cx = GARAGE_ORIGIN.column + (GARAGE_SIZE - 1) / 2;
  const cy = GARAGE_ORIGIN.row + (GARAGE_SIZE - 1) / 2;
  return isGarageTile(column, row) || Math.hypot(column - cx, row - cy) <= radius;
}

export function garageCenterWorld() {
  const cx = GARAGE_ORIGIN.column + (GARAGE_SIZE - 1) / 2;
  const cy = GARAGE_ORIGIN.row + (GARAGE_SIZE - 1) / 2;
  return tileWorldPos(cx, cy);
}

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

export function findPartNear(spawns, column, row, radius = 1.7) {
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
  const mat = clay(GAME_COLORS[colorKey] || '#888888');
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

function makeWheel({ ghost = false } = {}) {
  const g = new THREE.Group();
  const tireMat = clay('#1a1a1a');
  const hubMat = clay('#C0392B');
  if (ghost) {
    tireMat.transparent = true;
    tireMat.opacity = 0.18;
    tireMat.depthWrite = false;
    hubMat.transparent = true;
    hubMat.opacity = 0.2;
    hubMat.depthWrite = false;
  }
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.09, 10, 18), tireMat);
  tire.rotation.y = Math.PI / 2;
  g.add(tire);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), hubMat);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), clay('#2c2c2c'));
  disc.rotation.z = Math.PI / 2;
  if (ghost) {
    disc.material.transparent = true;
    disc.material.opacity = 0.18;
    disc.material.depthWrite = false;
  }
  g.add(disc);
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
    w.scale.setScalar(held ? 0.95 : 1.55);
    g.add(w);
    if (!held) {
      addGroundRing(g, '#C0392B');
      addBeacon(g, '#C0392B');
    }
    return g;
  }

  if (spec.id === 'HOOD_RED') {
    const hood = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.18, 0.78, 2, 0.06), clay(hex, { emissive: hex, emissiveIntensity: 0.2 }));
    hood.position.y = 0.42;
    hood.userData.keepColor = true;
    g.add(hood);
    const chevron = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 3), clay(hex, { emissive: hex, emissiveIntensity: 0.25 }));
    chevron.rotation.x = -Math.PI / 2;
    chevron.position.set(0, 0.54, 0.18);
    chevron.userData.keepColor = true;
    g.add(chevron);
  } else if (spec.id === 'FENDER_GREEN') {
    [-0.28, 0.28].forEach((x, i) => {
      const fender = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.24, 0.72, 2, 0.06), clay(hex, { emissive: hex, emissiveIntensity: 0.18 }));
      fender.position.set(x, 0.38, 0);
      fender.rotation.z = i === 0 ? 0.14 : -0.14;
      fender.userData.keepColor = true;
      g.add(fender);
    });
  } else if (spec.id === 'DOOR_BLUE') {
    [-0.22, 0.22].forEach((x) => {
      const door = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.48, 0.78, 1, 0.04), clay(hex, { emissive: hex, emissiveIntensity: 0.18 }));
      door.position.set(x, 0.46, 0);
      door.userData.keepColor = true;
      g.add(door);
    });
  } else if (spec.id === 'CAGE_YELLOW') {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 8, 18, Math.PI), clay(hex, { emissive: hex, emissiveIntensity: 0.22 }));
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = 0.62;
    hoop.userData.keepColor = true;
    g.add(hoop);
    [-0.34, 0.34].forEach((x) => {
      const mirror = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.1, 0.16, 1, 0.03), clay(hex));
      mirror.position.set(x, 0.42, 0.22);
      mirror.userData.keepColor = true;
      g.add(mirror);
    });
  } else {
    [-0.26, 0.26].forEach((x) => {
      const rear = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.4, 0.52, 2, 0.06), clay(hex, { emissive: hex, emissiveIntensity: 0.2 }));
      rear.position.set(x, 0.44, -0.08);
      rear.userData.keepColor = true;
      g.add(rear);
    });
    const hatch = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.14, 0.28, 1, 0.05), clay(hex));
    hatch.position.set(0, 0.58, -0.22);
    hatch.userData.keepColor = true;
    g.add(hatch);
  }

  if (!held) {
    g.scale.setScalar(1.2);
    addGroundRing(g, hex);
    addBeacon(g, hex);
  }
  return g;
}

function wheel(x, z, partId, mounted) {
  const g = makeWheel({ ghost: !mounted });
  g.position.set(x, 0.24, z);
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

  const frame = clay('#2b2b2b');
  const bumper = clay('#1f1f1f');

  const tub = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.28, 1.85, 2, 0.08), frame);
  tub.position.y = 0.38;
  tub.castShadow = true;
  root.add(tub);

  const floor = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.06, 1.15, 1, 0.04), clay('#333'));
  floor.position.y = 0.48;
  root.add(floor);

  const bar = new THREE.Mesh(new RoundedBoxGeometry(1.22, 0.16, 0.22, 1, 0.05), bumper);
  bar.position.set(0, 0.34, 0.98);
  root.add(bar);

  WHEEL_SLOTS.forEach((slot) => root.add(wheel(slot.x, slot.z, slot.id, mounted.has(slot.id))));

  const seatL = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.12, 0.36, 1, 0.04), clay('#1c1c1c'));
  seatL.position.set(-0.2, 0.58, -0.08);
  root.add(seatL);
  const backL = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.32, 0.1, 1, 0.04), clay('#222'));
  backL.position.set(-0.2, 0.74, -0.24);
  root.add(backL);
  const seatR = seatL.clone();
  seatR.position.x = 0.2;
  root.add(seatR);
  const backR = backL.clone();
  backR.position.x = 0.2;
  root.add(backR);

  [-0.28, 0.28].forEach((x) => {
    const lamp = new THREE.Mesh(
      new RoundedBoxGeometry(0.18, 0.1, 0.08, 1, 0.03),
      clay('#F4C245', { emissive: '#F4C245', emissiveIntensity: 0.55 })
    );
    lamp.position.set(x, 0.42, 1.06);
    root.add(lamp);
  });
  [-0.22, 0.22].forEach((x) => {
    const tail = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.07, 0.05, 1, 0.02),
      clay('#E74C3C', { emissive: '#E74C3C', emissiveIntensity: 0.4 })
    );
    tail.position.set(x, 0.48, -0.96);
    root.add(tail);
  });

  const hood = markPart(
    new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.16, 0.7, 2, 0.06), skinMat('RED', mounted.has('HOOD_RED'))),
    'HOOD_RED'
  );
  hood.position.set(0, 0.58, 0.58);
  root.add(hood);
  const chevron = markPart(
    new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 3), skinMat('RED', mounted.has('HOOD_RED'))),
    'HOOD_RED'
  );
  chevron.rotation.x = -Math.PI / 2;
  chevron.position.set(0, 0.68, 0.72);
  root.add(chevron);

  [-0.52, 0.52].forEach((x, i) => {
    const fender = markPart(
      new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.22, 0.7, 2, 0.06), skinMat('GREEN', mounted.has('FENDER_GREEN'))),
      'FENDER_GREEN'
    );
    fender.position.set(x, 0.46, 0.55);
    fender.rotation.z = i === 0 ? 0.12 : -0.12;
    root.add(fender);
  });

  [-0.58, 0.58].forEach((x) => {
    const door = markPart(
      new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.34, 0.72, 1, 0.04), skinMat('BLUE', mounted.has('DOOR_BLUE'))),
      'DOOR_BLUE'
    );
    door.position.set(x, 0.62, 0.02);
    root.add(door);
  });

  const hoop = markPart(
    new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 8, 18, Math.PI), skinMat('YELLOW', mounted.has('CAGE_YELLOW'))),
    'CAGE_YELLOW'
  );
  hoop.rotation.x = Math.PI / 2;
  hoop.position.set(0, 0.92, -0.18);
  root.add(hoop);
  [-0.62, 0.62].forEach((x) => {
    const mirror = markPart(
      new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.08, 0.14, 1, 0.03), skinMat('YELLOW', mounted.has('CAGE_YELLOW'))),
      'CAGE_YELLOW'
    );
    mirror.position.set(x, 0.72, 0.42);
    root.add(mirror);
  });
  [-0.5, 0.5].forEach((x) => {
    const yFender = markPart(
      new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.16, 0.42, 1, 0.05), skinMat('YELLOW', mounted.has('CAGE_YELLOW'))),
      'CAGE_YELLOW'
    );
    yFender.position.set(x, 0.44, -0.62);
    root.add(yFender);
  });

  [-0.48, 0.48].forEach((x) => {
    const rear = markPart(
      new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.36, 0.5, 2, 0.06), skinMat('PURPLE', mounted.has('REAR_PURPLE'))),
      'REAR_PURPLE'
    );
    rear.position.set(x, 0.56, -0.78);
    root.add(rear);
  });
  const hatch = markPart(
    new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.14, 0.28, 1, 0.05), skinMat('PURPLE', mounted.has('REAR_PURPLE'))),
    'REAR_PURPLE'
  );
  hatch.position.set(0, 0.7, -0.92);
  root.add(hatch);

  root.userData.driverSeat = new THREE.Vector3(-0.2, 0.72, -0.02);
  root.userData.passengerSeat = new THREE.Vector3(0.2, 0.72, -0.02);
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
