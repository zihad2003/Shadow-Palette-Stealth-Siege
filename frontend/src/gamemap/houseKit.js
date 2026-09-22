import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GAME_COLORS } from '../colors.js';
import { TILE_PITCH } from './mapConfig.js';

/** Bump when house geometry changes so GameMap drops cached meshes. */
export const HOUSE_MESH_REV = 13;

/** Visual height vs the 3×3 pad — concept cottages read as tall clay buildings. */
export const HOUSE_HEIGHT_SCALE = 3;

export const KIT = {
  wood: '#6B4A32',
  woodDark: '#4A3224',
  woodLight: '#8B5E3C',
  woodPale: '#A06C48',
  stone: '#C4B89A',
  stoneDk: '#9A917C',
  stoneLt: '#E8DCC8',
  shingleBlue: GAME_COLORS.BLUE,
  shingleBlueDk: '#3A4EAE',
  shingleBlueMid: '#6B82E8',
  purple: GAME_COLORS.PURPLE,
  purpleDk: '#6A3FA0',
  gold: GAME_COLORS.YELLOW,
  goldDk: '#C9A227',
  iron: '#3A3630',
  ironLt: '#5A5550',
  cream: '#EDE4D4',
  plaster: '#F3E6D0',
  grass: GAME_COLORS.GREEN,
  bannerBlue: GAME_COLORS.BLUE,
  bannerGold: GAME_COLORS.YELLOW,
  lamp: '#FFB25A',
  pillow: '#F1FAEE',
  bedding: GAME_COLORS.BLUE,
  steel: '#5A6570',
  steelDk: '#3E4850',
  red: GAME_COLORS.RED,
};

export function clay(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.58,
    metalness: 0.05,
    ...extras,
  });
}

export function metal(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.32,
    metalness: 0.45,
    ...extras,
  });
}

export function shadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function markMotion(mesh, kind, amp = 1) {
  mesh.userData.motion = kind;
  mesh.userData.motionAmp = amp;
  mesh.userData.baseY = mesh.position.y;
  mesh.userData.baseRotY = mesh.rotation.y;
  return mesh;
}

export function markCloth(mesh) {
  mesh.userData.isBody = true;
  mesh.userData.isCloth = true;
  return mesh;
}

export function houseSpan(footprintW = 3, footprintH = 3) {
  return {
    bw: footprintW * TILE_PITCH * 0.86,
    bd: footprintH * TILE_PITCH * 0.86,
  };
}

export function clothColor(hexColor, fallback) {
  if (!hexColor) return fallback;
  const h = String(hexColor).toUpperCase();
  if (h === '#9A958C' || h === '#C9B79A' || h === '#C8C8C8' || h === '#B0B0B0' || h === '#9A9A9A' || h === '#D0D0D0') {
    return fallback;
  }
  return hexColor;
}

export function roofPair(hex) {
  const c = new THREE.Color(hex || GAME_COLORS.BLUE);
  const dark = c.clone().multiplyScalar(0.72);
  return { color: `#${c.getHexString()}`, dark: `#${dark.getHexString()}` };
}

/** Shared cottage body so every rebuilt building reads as a house. */
export function addCottageFrame(group, { bw, bd, smashed = false, wall = KIT.cream, roofHex = GAME_COLORS.BLUE } = {}) {
  addPlinth(group, bw, bd);
  const bodyW = bw * 0.78;
  const bodyD = bd * 0.7;
  const bodyH = smashed ? 0.5 : 0.84;
  const hall = box(bodyW, bodyH, bodyD, wall, 0.06);
  hall.position.set(0, bodyH / 2 + 0.1, 0);
  add(group, hall);
  const roof = roofPair(roofHex);
  addGableRoof(group, {
    w: bw * 0.94,
    d: bd * 0.84,
    y: smashed ? 0.64 : 1.04,
    color: roof.color,
    dark: roof.dark,
    broken: smashed,
  });
  addTimberGable(group, 0, smashed ? 0.86 : 1.22, bodyD * 0.36, { w: bodyW * 0.9, h: 0.42, smashed });
  addDoor(group, 0, smashed ? 0.32 : 0.42, bodyD * 0.51, { smashed });
  addGlowWindow(group, -bodyW * 0.22, smashed ? 0.54 : 0.74, bodyD * 0.51, { smashed, planter: true });
  addGlowWindow(group, bodyW * 0.22, smashed ? 0.54 : 0.74, bodyD * 0.51, { smashed, planter: false });
  addChimney(group, bodyW * 0.28, smashed ? 0.8 : 1.2, -bodyD * 0.1, { h: 0.48, broken: smashed, fire: !smashed });
  return { bodyW, bodyD, bodyH };
}

export function add(group, mesh) {
  group.add(shadow(mesh));
  return mesh;
}

export function box(w, h, d, color, r = 0.04) {
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), typeof color === 'string' ? clay(color) : color);
}

export function cyl(rt, rb, h, color, segs = 10) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), typeof color === 'string' ? clay(color) : color);
}

export function addPlinth(group, bw, bd) {
  const pad = box(bw * 1.08, 0.1, bd * 1.08, KIT.stoneLt, 0.06);
  pad.position.y = 0.05;
  pad.receiveShadow = true;
  group.add(pad);
  const rim = box(bw * 1.16, 0.09, bd * 1.16, KIT.stoneDk, 0.05);
  rim.position.y = 0.02;
  group.add(rim);
  [[-0.44, -0.42], [0.4, -0.4], [-0.38, 0.42], [0.42, 0.38], [0.06, -0.48], [-0.12, 0.46]].forEach(([x, z], i) => {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.08 + (i % 2) * 0.025, 0.14, 5), clay(KIT.grass));
    tuft.position.set(x * bw, 0.13, z * bd);
    tuft.rotation.y = i;
    group.add(tuft);
  });
}

export function addLantern(group, x, y, z, { hanging = true, level = 1, smashed = false } = {}) {
  const g = new THREE.Group();
  if (hanging) {
    const arm = box(0.045, 0.045, 0.28, KIT.woodDark, 0.01);
    arm.position.set(0, 0.16, -0.1);
    g.add(arm);
    const hook = cyl(0.012, 0.012, 0.1, KIT.iron, 6);
    hook.position.set(0, 0.08, 0.02);
    g.add(hook);
  }
  const cage = cyl(0.055, 0.06, smashed ? 0.07 : 0.12, KIT.iron, 8);
  g.add(cage);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 10, 8),
    clay(KIT.lamp, { emissive: KIT.lamp, emissiveIntensity: smashed ? 0.35 : 1.7 + level * 0.2, transparent: true, opacity: 0.92 })
  );
  markMotion(glow, 'pulse', 0.7);
  g.add(glow);
  const cap = box(0.1, 0.03, 0.1, KIT.ironLt, 0.01);
  cap.position.y = smashed ? 0.05 : 0.08;
  g.add(cap);
  g.position.set(x, y, z);
  if (smashed) g.rotation.z = 0.35;
  group.add(g);
  return g;
}

export function addFence(group, bw, bd, { gapFront = 0.42, smashed = false } = {}) {
  const posts = [
    [-0.48, -0.48],
    [0.48, -0.48],
    [-0.48, 0.48],
    [0.48, 0.48],
    [-0.48, -0.16],
    [-0.48, 0.16],
    [0.48, -0.16],
    [0.48, 0.16],
    [-0.16, -0.48],
    [0.16, -0.48],
  ];
  posts.forEach(([nx, nz], i) => {
    if (smashed && i % 4 === 0) return;
    const h = smashed && i % 2 ? 0.22 : 0.38;
    const post = box(0.08, h, 0.08, KIT.wood, 0.02);
    post.position.set(nx * bw, h / 2 + 0.06, nz * bd);
    if (smashed) post.rotation.z = (i - 3) * 0.08;
    add(group, post);
  });
  [
    { x: 0, z: -0.48 * bd, w: bw * 0.9, rot: 0 },
    { x: -0.48 * bw, z: 0, w: bd * 0.82, rot: Math.PI / 2 },
    { x: 0.48 * bw, z: 0, w: bd * 0.82, rot: Math.PI / 2 },
  ].forEach((r, i) => {
    if (smashed && i === 0) return;
    [0.22, 0.32].forEach((yy) => {
      const rail = box(r.w * (smashed ? 0.55 : 1), 0.04, 0.045, KIT.woodLight, 0.015);
      rail.position.set(r.x + (smashed ? 0.1 : 0), yy, r.z);
      rail.rotation.y = r.rot;
      if (smashed) rail.rotation.z = 0.28;
      add(group, rail);
    });
  });
  const opening = box(gapFront, 0.04, 0.1, KIT.stoneDk, 0.02);
  opening.position.set(0, 0.08, bd * 0.5);
  group.add(opening);
}

export function addBanner(group, x, y, z, { hex, torn = false, emblem = 'crown' } = {}) {
  const pole = box(0.05, torn ? 0.55 : 0.78, 0.05, KIT.woodDark, 0.015);
  pole.position.set(x, y - 0.08, z);
  add(group, pole);
  const cloth = box(torn ? 0.16 : 0.24, torn ? 0.26 : 0.42, 0.03, hex, 0.02);
  cloth.position.set(x + 0.14, y + (torn ? 0.02 : 0.08), z);
  if (torn) cloth.rotation.z = 0.32;
  markCloth(cloth);
  markMotion(cloth, 'sway', 1);
  add(group, cloth);
  const trim = box(torn ? 0.18 : 0.26, 0.045, 0.035, KIT.bannerGold, 0.01);
  trim.position.set(x + 0.14, y + (torn ? 0.16 : 0.28), z);
  add(group, trim);
  if (emblem === 'crown') {
    const gem = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 4), clay(KIT.bannerGold));
    gem.position.set(x + 0.14, y + 0.08, z + 0.03);
    add(group, gem);
  } else if (emblem === 'pillow') {
    const p = box(0.09, 0.055, 0.04, KIT.pillow, 0.02);
    p.position.set(x + 0.14, y + 0.06, z + 0.03);
    add(group, p);
  } else if (emblem === 'hammer') {
    const h1 = box(0.12, 0.035, 0.03, KIT.iron, 0.01);
    h1.position.set(x + 0.14, y + 0.08, z + 0.03);
    h1.rotation.z = 0.45;
    add(group, h1);
  } else if (emblem === 'drop') {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), clay(hex));
    drop.position.set(x + 0.14, y + 0.06, z + 0.03);
    markCloth(drop);
    add(group, drop);
  }
}

/** Layered clay shingles on a gable, plus timber bargeboards. */
export function addGableRoof(group, { w, d, y, color, dark, broken = false, cloth = false }) {
  const mat = clay(color);
  const dk = clay(dark || color);
  const mid = clay(color);
  const slope = broken ? 0.62 : 0.4;
  const deckL = box(w * 0.58, 0.07, d * 1.06, mat, 0.03);
  deckL.rotation.z = broken ? 0.78 : slope;
  deckL.position.set(-w * 0.16, y + (broken ? 0.02 : 0.1), broken ? 0.06 : 0);
  if (cloth) markCloth(deckL);
  add(group, deckL);
  const deckR = box(w * 0.58, 0.07, d * 1.06, dk, 0.03);
  deckR.rotation.z = broken ? -0.12 : -slope;
  deckR.position.set(w * (broken ? 0.26 : 0.16), y + (broken ? -0.04 : 0.1), broken ? -0.08 : 0);
  if (cloth) markCloth(deckR);
  add(group, deckR);

  const rows = broken ? 3 : 5;
  const cols = broken ? 4 : 6;
  for (const side of [-1, 1]) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (broken && (r + c + (side > 0 ? 1 : 0)) % 3 === 0) continue;
        const tile = box(w * 0.15, 0.038, d * 0.18, (r + c) % 2 ? mat : (c % 2 ? dk : mid), 0.012);
        const nx = side * (0.1 + r * 0.105) * w;
        const nz = -d * 0.4 + c * (d * 0.82 / Math.max(1, cols - 1));
        const ny = y + 0.08 + (rows - r) * 0.055;
        tile.position.set(nx, ny - (broken ? r * 0.05 : 0), nz + (broken ? (r % 2) * 0.06 : 0));
        tile.rotation.z = side * (broken && r > 1 ? 0.95 : slope);
        if (broken) tile.rotation.x = (c % 2) * 0.25;
        if (cloth) markCloth(tile);
        add(group, tile);
      }
    }
  }

  const bargeL = box(0.07, 0.08, d * 1.12, KIT.wood, 0.02);
  bargeL.rotation.z = broken ? 0.7 : slope;
  bargeL.position.set(-w * 0.28, y + (broken ? 0.02 : 0.16), 0);
  add(group, bargeL);
  const bargeR = box(0.07, 0.08, d * 1.12, KIT.woodDark, 0.02);
  bargeR.rotation.z = broken ? -0.15 : -slope;
  bargeR.position.set(w * 0.28, y + (broken ? 0 : 0.16), 0);
  add(group, bargeR);
  if (!broken) {
    const ridge = box(0.1, 0.09, d * 1.14, KIT.woodDark, 0.02);
    ridge.position.set(0, y + 0.34, 0);
    add(group, ridge);
  } else {
    const beam = box(0.09, 0.09, w * 0.7, KIT.woodDark, 0.02);
    beam.position.set(0.08, y + 0.08, 0.04);
    beam.rotation.set(0.45, 0.25, 0.2);
    add(group, beam);
  }
}

/** One-sided lean-to (craft workshop bay). */
export function addShedRoof(group, { w, d, y, color, dark, broken = false, tilt = -0.22 }) {
  const mat = clay(color);
  const dk = clay(dark || color);
  const deck = box(w, 0.07, d, mat, 0.03);
  deck.rotation.z = broken ? tilt - 0.25 : tilt;
  deck.position.set(0, y, 0);
  add(group, deck);
  const rows = broken ? 2 : 4;
  const cols = broken ? 3 : 5;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (broken && (r + c) % 2 === 0) continue;
      const tile = box(w * 0.28, 0.035, d * 0.2, (r + c) % 2 ? mat : dk, 0.012);
      tile.position.set(-w * 0.22 + r * (w * 0.28), y + 0.04 - r * 0.04, -d * 0.35 + c * (d * 0.18));
      tile.rotation.z = broken ? 0.5 : tilt;
      add(group, tile);
    }
  }
  const beam = box(0.07, 0.07, d * 1.02, KIT.wood, 0.02);
  beam.position.set(-w * 0.42, y + 0.02, 0);
  add(group, beam);
}

export function addTimberGable(group, x, y, z, { w = 0.9, h = 0.55, smashed = false } = {}) {
  const left = box(0.08, h, 0.08, KIT.wood, 0.02);
  left.position.set(x - w * 0.28, y, z);
  left.rotation.z = smashed ? 0.35 : 0.55;
  add(group, left);
  const right = box(0.08, h, 0.08, KIT.woodDark, 0.02);
  right.position.set(x + w * 0.28, y, z);
  right.rotation.z = smashed ? -0.1 : -0.55;
  add(group, right);
  const king = box(0.07, h * 0.7, 0.07, KIT.woodLight, 0.02);
  king.position.set(x, y + (smashed ? -0.04 : 0.04), z);
  add(group, king);
  const collar = box(w * 0.55, 0.06, 0.06, KIT.wood, 0.015);
  collar.position.set(x, y - h * 0.12, z);
  add(group, collar);
}

export function addGlowWindow(group, x, y, z, { w = 0.22, h = 0.2, smashed = false, planter = false } = {}) {
  const frame = box(w, h, 0.05, KIT.woodDark, 0.02);
  frame.position.set(x, y, z);
  add(group, frame);
  const pane = box(w * 0.72, h * 0.7, 0.03, clay('#F4C245', { emissive: '#F4C245', emissiveIntensity: smashed ? 0.18 : 0.75 }));
  pane.position.set(x, y, z + 0.015);
  add(group, pane);
  const v = box(0.025, h * 0.68, 0.04, KIT.wood);
  v.position.set(x, y, z + 0.02);
  add(group, v);
  const hz = box(w * 0.68, 0.025, 0.04, KIT.wood);
  hz.position.set(x, y, z + 0.02);
  add(group, hz);
  if (planter) {
    const boxP = box(w * 0.95, 0.07, 0.1, KIT.wood, 0.02);
    boxP.position.set(x, y - h * 0.58, z + 0.04);
    add(group, boxP);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.09, 5), clay(KIT.grass));
    leaf.position.set(x, y - h * 0.42, z + 0.06);
    group.add(leaf);
  }
}

export function addDoor(group, x, y, z, { smashed = false } = {}) {
  const door = box(0.36, smashed ? 0.32 : 0.52, 0.07, KIT.woodDark, 0.03);
  door.position.set(x, y, z);
  if (smashed) door.rotation.y = 0.4;
  add(group, door);
  [-0.08, 0.08].forEach((dx) => {
    const plank = box(0.1, smashed ? 0.26 : 0.46, 0.02, KIT.wood, 0.01);
    plank.position.set(x + dx, y, z + 0.04);
    add(group, plank);
  });
  [0.1, -0.08].forEach((dy) => {
    const band = box(0.34, 0.035, 0.03, KIT.iron, 0.008);
    band.position.set(x, y + dy, z + 0.045);
    add(group, band);
  });
  if (!smashed) {
    [-0.06, 0.06].forEach((dx) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 6, 10), metal(KIT.iron));
      ring.position.set(x + dx, y + 0.02, z + 0.06);
      group.add(ring);
    });
  }
}

export function addChimney(group, x, y, z, { h = 0.62, broken = false, fire = false } = {}) {
  const n = 4;
  for (let i = 0; i < n; i++) {
    const hh = (broken ? h * 0.55 : h) / n;
    const stack = box(0.26 + (i === n - 1 ? 0.05 : 0), hh, 0.26, i % 2 ? KIT.stone : KIT.stoneLt, 0.03);
    stack.position.set(x + (broken && i > 1 ? 0.05 : 0), y + i * hh + hh / 2, z);
    if (broken && i === n - 1) stack.rotation.z = 0.22;
    add(group, stack);
  }
  const cap = box(0.32, 0.06, 0.32, KIT.stoneDk, 0.02);
  cap.position.set(x + (broken ? 0.07 : 0), y + (broken ? h * 0.5 : h) + 0.02, z);
  add(group, cap);
  if (fire && !broken) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.14, 5),
      clay(KIT.lamp, { emissive: KIT.lamp, emissiveIntensity: 1.5 })
    );
    flame.position.set(x, y + h + 0.12, z);
    markMotion(flame, 'pulse', 1.2);
    group.add(flame);
  }
  [0, 0.1, 0.2].forEach((dy, i) => {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(broken ? 0.09 : 0.07 + i * 0.02, 8, 8),
      clay('#D0D5DA', { transparent: true, opacity: broken ? 0.4 : 0.38 - i * 0.08 })
    );
    puff.position.set(x + (broken ? 0.06 : 0), y + (broken ? h * 0.65 : h + 0.22) + dy, z);
    markMotion(puff, 'bob', 1.1 + i * 0.15);
    puff.userData.baseY = puff.position.y;
    group.add(puff);
  });
}

export function addCoin(group, x, y, z, { scale = 1, spin = 1.4 } = {}) {
  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1 * scale, 0.1 * scale, 0.032 * scale, 16),
    metal(KIT.gold, { emissive: '#6A5010', emissiveIntensity: 0.22 })
  );
  coin.rotation.x = Math.PI / 2;
  coin.position.set(x, y, z);
  markMotion(coin, 'spin', spin);
  add(group, coin);
  const stamp = new THREE.Mesh(new THREE.ConeGeometry(0.03 * scale, 0.04 * scale, 4), metal(KIT.goldDk));
  stamp.position.set(x, y, z + 0.02 * scale);
  stamp.rotation.x = Math.PI / 2;
  group.add(stamp);
  return coin;
}

export function addGear(group, x, y, z, r, { spin = 1.2 } = {}) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.22, 8, 14), metal(KIT.gold));
  g.add(ring);
  const hub = cyl(r * 0.32, r * 0.32, 0.07, metal(KIT.goldDk), 8);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tooth = box(r * 0.28, r * 0.2, 0.06, KIT.gold, 0.01);
    tooth.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
    tooth.rotation.z = a;
    g.add(tooth);
  }
  g.position.set(x, y, z);
  markMotion(g, 'spin', spin);
  g.userData.baseRotY = 0;
  group.add(g);
  return g;
}

export function addCrate(group, x, y, z, { smashed = false, scale = 1 } = {}) {
  const c = box(0.3 * scale, smashed ? 0.12 : 0.24 * scale, 0.24 * scale, KIT.wood, 0.03);
  c.position.set(x, y, z);
  if (smashed) c.rotation.set(0.3, 0.4, 0.15);
  add(group, c);
  const band = box(0.31 * scale, 0.03, 0.04, KIT.iron, 0.008);
  band.position.set(x, y + (smashed ? 0 : 0.02), z + 0.11 * scale);
  add(group, band);
}

export function addBarrel(group, x, y, z, { smashed = false } = {}) {
  const b = cyl(0.11, 0.12, smashed ? 0.12 : 0.24, KIT.woodDark, 10);
  b.position.set(x, y, z);
  if (smashed) {
    b.rotation.z = Math.PI / 2;
    b.rotation.y = 0.4;
  }
  add(group, b);
  if (!smashed) {
    [-0.06, 0.06].forEach((dy) => {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 12), metal(KIT.iron));
      hoop.rotation.x = Math.PI / 2;
      hoop.position.set(x, y + dy, z);
      group.add(hoop);
    });
  }
}

export function addAnvil(group, x, y, z, { smashed = false } = {}) {
  const base = box(0.16, 0.1, 0.14, KIT.iron, 0.02);
  base.position.set(x, y - 0.08, z);
  add(group, base);
  const body = box(0.22, 0.1, 0.12, KIT.ironLt, 0.02);
  body.position.set(x, y + 0.02, z);
  if (smashed) body.rotation.z = 0.5;
  add(group, body);
  const horn = box(0.12, 0.06, 0.07, KIT.iron, 0.02);
  horn.position.set(x + 0.14, y + 0.02, z);
  add(group, horn);
}

export function addRubble(group, x, y, z, n = 4) {
  for (let i = 0; i < n; i++) {
    const chunk = box(0.12 + (i % 3) * 0.05, 0.07, 0.1, i % 2 ? KIT.stoneDk : KIT.woodDark, 0.02);
    chunk.position.set(x + (i - n / 2) * 0.12, y, z + (i % 2 ? 0.08 : -0.06));
    chunk.rotation.set(i * 0.3, i * 0.5, 0.2);
    add(group, chunk);
  }
}

export function addLevelExtras(group, level, bw, bd, hexColor) {
  if (level < 2) return;
  addLantern(group, -bw * 0.42, 0.78, bd * 0.18, { hanging: false, level });
  if (level >= 3) {
    addBanner(group, bw * 0.46, 1.12, -bd * 0.08, { hex: clothColor(hexColor, KIT.bannerBlue), emblem: 'crown' });
  }
}
