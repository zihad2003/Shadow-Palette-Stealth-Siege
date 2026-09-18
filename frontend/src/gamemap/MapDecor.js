import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  MAP_COLS,
  MAP_ROWS,
  TILE_HEIGHT,
  LARGE_MAP,
  MAP_COLORS,
  tileWorldPos,
  SEARCHLIGHT_TILE,
  GATE_SPAWN_TILE,
} from './mapConfig.js';
import { isStaticDecorBanned, buildingCoversTile, tileKey } from './occupancy.js';
import { GAME_COLORS, GAME_COLOR_KEYS } from '../colors.js';

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

function colorAt(i, salt = 0) {
  return GAME_COLORS[GAME_COLOR_KEYS[Math.floor(hash(i, salt) * GAME_COLOR_KEYS.length)]];
}

function shadow(mesh) {
  mesh.castShadow = !LARGE_MAP;
  mesh.receiveShadow = true;
  return mesh;
}

/** Sealed ink vat — the fortress's main resource. */
function inkVat(i) {
  const g = new THREE.Group();
  const body = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.48, 12), clay('#1A2428')));
  body.position.y = 0.24;
  g.add(body);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.028, 6, 16), clay('#2A9D8F'));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.32;
  g.add(band);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12), clay('#0D1B1E'));
  lid.position.y = 0.5;
  g.add(lid);
  const drip = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    clay('#2A9D8F', { emissive: '#1A6B62', emissiveIntensity: 0.35 })
  );
  drip.position.set(0.18, 0.28, 0.08);
  drip.userData.keepColor = true;
  g.add(drip);
  return g;
}

/** Open pigment pot of one of the five camo colors. */
function pigmentPot(i) {
  const hex = colorAt(i, 2);
  const g = new THREE.Group();
  const pot = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.2, 10), clay('#3A3630')));
  pot.position.y = 0.1;
  g.add(pot);
  const fill = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.04, 10),
    clay(hex, { emissive: hex, emissiveIntensity: 0.22 })
  );
  fill.position.y = 0.2;
  fill.userData.keepColor = true;
  g.add(fill);
  const drip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), clay(hex));
  drip.position.set(0.12, 0.08, 0.04);
  drip.userData.keepColor = true;
  g.add(drip);
  return g;
}

/** Cluster of 3 pigment pots — a paint cache. */
function pigmentCache(i) {
  const g = new THREE.Group();
  [-0.16, 0.14, 0].forEach((x, k) => {
    const pot = pigmentPot(i + k * 11);
    pot.position.set(x, 0, k === 2 ? -0.12 : 0.08);
    pot.scale.setScalar(0.85 + k * 0.08);
    g.add(pot);
  });
  const tray = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.05, 0.4, 1, 0.02), clay('#5C4030'));
  tray.position.y = 0.02;
  g.add(tray);
  return g;
}

/** Palette easel with a painted board — why the fortress exists. */
function paletteEasel(i) {
  const hex = colorAt(i, 3);
  const g = new THREE.Group();
  const board = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.5, 0.04, 1, 0.02), clay('#E8DCC8')));
  board.position.set(0, 0.42, 0);
  board.rotation.x = -0.18;
  g.add(board);
  [-0.1, 0, 0.1].forEach((x, k) => {
    const swatch = new THREE.Mesh(
      new THREE.CircleGeometry(0.06, 10),
      clay(GAME_COLORS[GAME_COLOR_KEYS[(Math.floor(hash(i, 4) * 5) + k) % 5]])
    );
    swatch.position.set(x, 0.44 + k * 0.02, 0.03);
    swatch.rotation.x = -0.18;
    swatch.userData.keepColor = true;
    g.add(swatch);
  });
  const splash = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), clay(hex, { emissive: hex, emissiveIntensity: 0.15 }));
  splash.scale.set(1.4, 0.35, 1);
  splash.position.set(0.08, 0.32, 0.04);
  splash.userData.keepColor = true;
  g.add(splash);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.04), clay('#6B4A32'));
  legL.position.set(-0.14, 0.22, -0.08);
  legL.rotation.z = 0.18;
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.14;
  legR.rotation.z = -0.18;
  g.add(legR);
  return g;
}

/** Camo cloth on a drying rack — raid stealth gear. */
function camoRack(i) {
  const hex = colorAt(i, 5);
  const g = new THREE.Group();
  [-0.22, 0.22].forEach((x) => {
    const post = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.72, 6), clay('#4A4540')));
    post.position.set(x, 0.36, 0);
    g.add(post);
  });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), clay('#3A3630'));
  rail.rotation.z = Math.PI / 2;
  rail.position.y = 0.68;
  g.add(rail);
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.48),
    clay(hex, { side: THREE.DoubleSide, roughness: 0.85 })
  );
  cloth.position.set(0, 0.42, 0.02);
  cloth.rotation.x = 0.08;
  cloth.userData.keepColor = true;
  cloth.userData.motion = 'sway';
  cloth.userData.motionAmp = 0.8;
  g.add(cloth);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.01), clay('#0D1B1E'));
  stripe.position.set(0, 0.55, 0.03);
  g.add(stripe);
  return g;
}

/** Spare searchlight lamp on a crate. */
function lampCrate(i) {
  const g = new THREE.Group();
  const box = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.22, 0.4, 1, 0.03), clay('#4A4540')));
  box.position.y = 0.12;
  g.add(box);
  const stencil = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.02), clay('#F4C245'));
  stencil.position.set(0, 0.18, 0.2);
  g.add(stencil);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 8),
    clay(MAP_COLORS.lamp, { emissive: MAP_COLORS.lamp, emissiveIntensity: 0.7 })
  );
  lamp.position.y = 0.36;
  lamp.userData.keepColor = true;
  lamp.userData.motion = 'pulse';
  lamp.userData.motionAmp = 0.6;
  lamp.userData.baseY = 0.36;
  g.add(lamp);
  return g;
}

/** Wall lantern — courtyard lighting. */
function lantern(i) {
  const g = new THREE.Group();
  const pole = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 6), clay('#4A4540')));
  pole.position.y = 0.45;
  g.add(pole);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 10, 8),
    clay(MAP_COLORS.lamp, { emissive: MAP_COLORS.lamp, emissiveIntensity: 0.55 })
  );
  lamp.position.y = 0.95;
  lamp.userData.keepColor = true;
  g.add(lamp);
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.1, 8), clay('#3A3630'));
  hood.position.y = 1.08;
  g.add(hood);
  return g;
}

/** Coin chest — raid loot / economy. */
function coinChest(i) {
  const g = new THREE.Group();
  const box = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.28, 0.34, 1, 0.04), clay('#8B6914')));
  box.position.y = 0.16;
  g.add(box);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.08, 0.36, 1, 0.03), clay('#C4A574'));
  lid.position.set(0, 0.34, -0.02);
  lid.rotation.x = -0.35;
  g.add(lid);
  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.02, 12),
    clay('#F4C245', { metalness: 0.45, roughness: 0.35, emissive: '#8A6A10', emissiveIntensity: 0.2 })
  );
  coin.rotation.x = Math.PI / 2;
  coin.position.set(0.06, 0.3, 0.04);
  coin.userData.keepColor = true;
  g.add(coin);
  const coin2 = coin.clone();
  coin2.position.set(-0.08, 0.28, 0.02);
  coin2.rotation.z = 0.4;
  g.add(coin2);
  return g;
}

/** Chip crate stamped with the raid token. */
function chipCrate(i) {
  const g = new THREE.Group();
  const box = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.32, 0.4, 1, 0.04), clay('#3A4A52')));
  box.position.y = 0.16;
  g.add(box);
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.1),
    clay('#8D5CC7', { emissive: '#5A2E88', emissiveIntensity: 0.4 })
  );
  gem.position.y = 0.4;
  gem.userData.keepColor = true;
  gem.userData.motion = 'bob';
  gem.userData.motionAmp = 0.8;
  gem.userData.baseY = 0.4;
  g.add(gem);
  return g;
}

/** Repair kit left by a ruin — hammer + plank crate. */
function repairKit(i) {
  const g = new THREE.Group();
  const crate = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.18, 0.32, 1, 0.03), clay('#6B4A32')));
  crate.position.y = 0.1;
  g.add(crate);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.32, 6), clay('#5C4030'));
  handle.rotation.z = 0.7;
  handle.position.set(-0.04, 0.26, 0);
  g.add(handle);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.08), clay('#8A8680'));
  head.position.set(0.1, 0.36, 0);
  g.add(head);
  const brick = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.1), clay('#9A958C'));
  brick.position.set(0.08, 0.22, 0.08);
  brick.rotation.y = 0.3;
  g.add(brick);
  return g;
}

/** Patrol charging post — socket for the robot. */
function patrolPost(i) {
  const g = new THREE.Group();
  const base = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.12, 10), clay('#2A2420')));
  base.position.y = 0.06;
  g.add(base);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.55, 8), clay('#4A4540'));
  stem.position.y = 0.38;
  g.add(stem);
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 10, 8),
    clay('#E74C3C', { emissive: '#E74C3C', emissiveIntensity: 0.55 })
  );
  orb.position.y = 0.72;
  orb.userData.keepColor = true;
  orb.userData.motion = 'pulse';
  orb.userData.motionAmp = 1;
  orb.userData.baseY = 0.72;
  g.add(orb);
  return g;
}

/** Fortress banner — house / color identity. */
function colorBanner(i) {
  const hex = colorAt(i, 8);
  const g = new THREE.Group();
  const pole = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.05, 6), clay('#5C4030')));
  pole.position.y = 0.52;
  g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.26), clay(hex, { side: THREE.DoubleSide }));
  flag.position.set(0.2, 0.88, 0);
  flag.userData.keepColor = true;
  flag.userData.motion = 'sway';
  flag.userData.motionAmp = 1.1;
  g.add(flag);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), clay('#F4C245'));
  finial.position.y = 1.06;
  g.add(finial);
  return g;
}

/** Ink fountain — courtyard landmark. */
function inkFountain(i) {
  const g = new THREE.Group();
  const bowl = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.18, 14), clay('#9C9994')));
  bowl.position.y = 0.1;
  g.add(bowl);
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 16),
    clay('#2A9D8F', { emissive: '#1A6B62', emissiveIntensity: 0.28 })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.2;
  pool.userData.keepColor = true;
  g.add(pool);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.4, 8), clay('#ABA8A3'));
  pillar.position.y = 0.38;
  g.add(pillar);
  const spray = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    clay('#2A9D8F', { emissive: '#1A6B62', emissiveIntensity: 0.4, transparent: true, opacity: 0.8 })
  );
  spray.position.y = 0.64;
  spray.userData.keepColor = true;
  spray.userData.motion = 'bob';
  spray.userData.motionAmp = 1;
  spray.userData.baseY = 0.64;
  g.add(spray);
  return g;
}

/** Paint-supply cart. */
function inkCart(i) {
  const g = new THREE.Group();
  const bed = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.12, 0.4, 1, 0.03), clay('#6B4A32')));
  bed.position.y = 0.26;
  g.add(bed);
  [-0.22, 0.22].forEach((x) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 10), clay('#2A2420'));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.12, 0.2);
    g.add(wheel);
  });
  const vat = pigmentPot(i + 3);
  vat.position.set(0, 0.28, 0);
  vat.scale.setScalar(0.75);
  g.add(vat);
  return g;
}

/** Gate / wall bench for idle patrols. */
function watchBench(i) {
  const g = new THREE.Group();
  const seat = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.08, 0.26, 1, 0.03), clay('#4A4540')));
  seat.position.y = 0.28;
  g.add(seat);
  [-0.28, 0.28].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.07), clay('#3A3630'));
    leg.position.set(x, 0.13, 0);
    g.add(leg);
  });
  return g;
}

/** Direction sign toward the gate / plaza. */
function waySign(i) {
  const g = new THREE.Group();
  const pole = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.7, 6), clay('#5C4030')));
  pole.position.y = 0.35;
  g.add(pole);
  const board = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.18, 0.04, 1, 0.02), clay('#D5453C'));
  board.position.set(0.14, 0.62, 0);
  g.add(board);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 3), clay('#D5453C'));
  tip.rotation.z = -Math.PI / 2;
  tip.position.set(0.42, 0.62, 0);
  g.add(tip);
  return g;
}

const COURTYARD = [inkVat, pigmentCache, paletteEasel, camoRack, coinChest, chipCrate, inkFountain, inkCart];
const RUIN_YARD = [repairKit, pigmentPot, inkVat, watchBench];
const GATE_YARD = [waySign, colorBanner, lampCrate, watchBench, inkCart];
const PLAZA = [lampCrate, patrolPost, colorBanner, inkFountain];

function pickMaker(n, column, row) {
  const nearGate =
    Math.abs(column - GATE_SPAWN_TILE.column) <= 8 && row >= MAP_ROWS - 10;
  const nearPlaza =
    Math.abs(column - SEARCHLIGHT_TILE.column) <= 7 && Math.abs(row - SEARCHLIGHT_TILE.row) <= 7;
  const nearEdge = column <= 4 || row <= 4 || column >= MAP_COLS - 5 || row >= MAP_ROWS - 5;
  const pool = nearGate ? GATE_YARD : nearPlaza ? PLAZA : nearEdge ? RUIN_YARD : COURTYARD;
  return pool[Math.floor(hash(n, 3) * pool.length)];
}

function collectDecorPlacements(seed = 7) {
  const used = new Set();
  const tiles = [];
  const target = LARGE_MAP ? 72 : 28;
  let placed = 0;
  let attempts = 0;

  while (placed < target && attempts < target * 40) {
    attempts += 1;
    const n = seed * 97 + attempts * 13;
    const column = 2 + Math.floor(hash(n, 1) * (MAP_COLS - 4));
    const row = 2 + Math.floor(hash(n, 2) * (MAP_ROWS - 4));
    const key = tileKey(column, row);
    if (used.has(key) || isStaticDecorBanned(column, row)) continue;
    used.add(key);
    tiles.push({ column, row, key, n });
    placed += 1;
  }

  const edgeStep = LARGE_MAP ? 5 : 3;
  for (let c = 3; c < MAP_COLS - 3; c += edgeStep) {
    [2, MAP_ROWS - 3].forEach((r, idx) => {
      if (isStaticDecorBanned(c, r)) return;
      const key = tileKey(c, r);
      if (used.has(key)) return;
      used.add(key);
      tiles.push({ column: c, row: r, key, n: seed + c * 17 + idx, lantern: true });
    });
  }
  for (let r = 4; r < MAP_ROWS - 4; r += edgeStep) {
    [2, MAP_COLS - 3].forEach((c, idx) => {
      if (isStaticDecorBanned(c, r)) return;
      const key = tileKey(c, r);
      if (used.has(key)) return;
      used.add(key);
      tiles.push({ column: c, row: r, key, n: seed + r * 19 + idx + 99, lantern: true });
    });
  }
  return tiles;
}

/**
 * Deterministic list of tiles occupied by courtyard props (same as visuals).
 */
export function listDecorOccupiedTiles(seed = 7, buildings = []) {
  const used = new Set();
  collectDecorPlacements(seed).forEach((p) => {
    if (buildings.some((b) => buildingCoversTile(b, p.column, p.row))) return;
    used.add(p.key);
  });
  return used;
}

/**
 * Scatter fortress-themed props: ink vats, pigment caches, camo racks,
 * repair kits near ruins, banners at the gate. Deterministic per seed.
 */
export function createInteriorDecor({ seed = 7, buildings = [] } = {}) {
  const group = new THREE.Group();
  group.name = 'InteriorDecor';

  collectDecorPlacements(seed).forEach((spot) => {
    if (buildings.some((b) => buildingCoversTile(b, spot.column, spot.row))) return;
    const maker = spot.lantern ? lantern : pickMaker(spot.n, spot.column, spot.row);
    const prop = noRaycast(maker(spot.n));
    const p = tileWorldPos(spot.column, spot.row);
    prop.position.set(p.x, TILE_HEIGHT, p.z);
    if (!spot.lantern) prop.rotation.y = hash(spot.n, 6) * Math.PI * 2;
    prop.scale.setScalar(spot.lantern ? 1 : 0.92 + hash(spot.n, 7) * 0.18);
    prop.userData.decorTile = spot.key;
    prop.userData.solid = true;
    group.add(prop);
  });

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
    } else if (kind === 'sway') {
      child.rotation.y = Math.sin(elapsed * 1.4 * amp) * 0.12;
    }
  });
}

export default createInteriorDecor;
