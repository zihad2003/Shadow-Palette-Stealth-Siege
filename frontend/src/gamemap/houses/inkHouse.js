import * as THREE from 'three';
import { GAME_COLORS } from '../../colors.js';
import {
  KIT,
  add,
  addBanner,
  addBarrel,
  addDoor,
  addLantern,
  addLevelExtras,
  addPlinth,
  addRubble,
  box,
  clay,
  clothColor,
  cyl,
  houseSpan,
  markCloth,
  markMotion,
} from '../houseKit.js';

const PIPE_KEYS = ['YELLOW', 'PURPLE', 'RED', 'GREEN', 'BLUE'];

function addDrop(group, x, y, z, hex, { scale = 1, cloth = false } = {}) {
  const mat = clay(hex, { emissive: hex, emissiveIntensity: 0.2 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055 * scale, 10, 8), mat);
  bulb.position.set(x, y, z);
  add(group, bulb);
  if (cloth) markCloth(bulb);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.038 * scale, 0.075 * scale, 8), mat);
  tip.position.set(x, y - 0.065 * scale, z);
  add(group, tip);
  if (cloth) markCloth(tip);
}

function addPurpleCap(group, bw, bd, smashed) {
  const cap = box(bw * 0.72, smashed ? 0.12 : 0.24, bd * 0.7, KIT.purple, 0.08);
  cap.position.set(-0.04, smashed ? 0.64 : 0.82, 0);
  add(group, cap);
  const peak = box(bw * 0.34, smashed ? 0.1 : 0.16, bd * 0.48, KIT.purpleDk, 0.05);
  peak.position.set(-0.04, smashed ? 0.76 : 0.98, 0);
  add(group, peak);
  const cols = smashed ? 4 : 7;
  const rows = smashed ? 3 : 5;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (smashed && (r + c) % 3 === 0) continue;
      const tile = box(bw * 0.1, 0.045, bd * 0.12, (r + c) % 2 ? KIT.purple : KIT.purpleDk, 0.018);
      tile.position.set(-bw * 0.32 + c * (bw * 0.1), smashed ? 0.74 : 0.96, -bd * 0.28 + r * (bd * 0.12));
      if (smashed) tile.rotation.set((r % 2) * 0.15, 0, (c % 2) * 0.12);
      add(group, tile);
    }
  }
}

function addInkwell(group, smashed) {
  const x = -0.02;
  const y = smashed ? 0.94 : 1.2;
  const body = cyl(smashed ? 0.16 : 0.24, smashed ? 0.22 : 0.3, smashed ? 0.16 : 0.3, KIT.purple, 16);
  body.position.set(x, y, 0);
  if (smashed) body.rotation.z = 0.38;
  add(group, body);
  const neck = cyl(0.14, 0.16, 0.1, KIT.purpleDk, 14);
  neck.position.set(x + (smashed ? 0.08 : 0), y + (smashed ? 0.08 : 0.18), 0);
  add(group, neck);
  const ink = cyl(0.1, 0.12, 0.05, clay('#1A1028'), 12);
  ink.position.set(x, y + (smashed ? 0.1 : 0.2), 0);
  add(group, ink);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.032, 8, 16), clay(KIT.woodDark));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, y + (smashed ? 0.12 : 0.22), 0);
  add(group, rim);
  const quill = box(0.04, smashed ? 0.28 : 0.5, 0.04, KIT.pillow, 0.01);
  quill.position.set(x + 0.12, y + (smashed ? 0.24 : 0.46), 0);
  quill.rotation.z = smashed ? 0.8 : -0.38;
  add(group, quill);
  const feather = box(0.18, 0.045, 0.02, KIT.pillow, 0.008);
  feather.position.set(x, y + (smashed ? 0.34 : 0.66), 0);
  feather.rotation.z = smashed ? 0.45 : -0.16;
  add(group, feather);
  const nib = box(0.025, 0.09, 0.025, KIT.iron, 0.01);
  nib.position.set(x + 0.22, y + (smashed ? 0.12 : 0.26), 0);
  nib.rotation.z = smashed ? 0.8 : -0.38;
  add(group, nib);
}

function addPipesAndTanks(group, smashed) {
  PIPE_KEYS.forEach((key, i) => {
    const hex = GAME_COLORS[key];
    const mat = clay(hex);
    const z = 0.36 - i * 0.17;
    const x = 0.4;
    const topY = smashed ? 0.72 : 0.86;

    const stub = cyl(0.058, 0.058, 0.2, mat, 12);
    stub.rotation.z = Math.PI / 2;
    stub.position.set(x, topY, z);
    add(group, stub);
    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat);
    knuckle.position.set(x + 0.14, topY, z);
    add(group, knuckle);
    const down = cyl(0.058, 0.064, smashed ? 0.26 : 0.44, mat, 12);
    down.position.set(x + 0.14, smashed ? 0.52 : 0.64, z);
    if (smashed && i % 2 === 0) down.rotation.z = 0.45;
    add(group, down);
    const tank = cyl(0.12, 0.14, smashed && i === 3 ? 0.14 : 0.34, mat, 12);
    tank.position.set(x + 0.14, smashed && i === 3 ? 0.16 : 0.24, z);
    if (smashed && i === 3) tank.rotation.x = 1.15;
    add(group, tank);
    addDrop(group, x + 0.14, smashed && i === 3 ? 0.18 : 0.3, z + 0.14, hex, { scale: 0.95 });

    const drip = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      clay(hex, { emissive: hex, emissiveIntensity: 0.4 })
    );
    drip.position.set(x + 0.14 + (smashed ? 0.06 : 0), smashed ? 0.12 : 0.5, z);
    markMotion(drip, 'bob', 1 + i * 0.1);
    drip.userData.baseY = drip.position.y;
    group.add(drip);

    const puddle = box(smashed ? 0.28 : 0.2, 0.02, 0.14, hex, 0.02);
    puddle.position.set(x + 0.08, 0.11, z + 0.04);
    group.add(puddle);
  });
}

function addPalisade(group, bw, bd, smashed) {
  const posts = [
    [-0.5, 0.4],
    [-0.5, 0.08],
    [-0.5, -0.22],
    [0.48, 0.36],
    [0.48, 0.04],
    [0.48, -0.26],
    [-0.22, 0.48],
  ];
  posts.forEach(([nx, nz], i) => {
    if (smashed && i % 4 === 0) return;
    const h = smashed && i % 2 ? 0.22 : 0.38;
    const post = box(0.08, h, 0.08, KIT.wood, 0.02);
    post.position.set(nx * bw, h / 2 + 0.08, nz * bd);
    if (smashed) post.rotation.z = (i - 2) * 0.08;
    add(group, post);
  });
  [
    { x: -bw * 0.5, z: bd * 0.08, w: bd * 0.55, rot: Math.PI / 2 },
    { x: bw * 0.48, z: bd * 0.04, w: bd * 0.55, rot: Math.PI / 2 },
  ].forEach((r, i) => {
    [0.2, 0.3].forEach((yy, k) => {
      if (smashed && (i + k) % 2 === 0) return;
      const rail = box(r.w * (smashed ? 0.5 : 1), 0.04, 0.045, KIT.woodLight, 0.015);
      rail.position.set(r.x, yy, r.z);
      rail.rotation.y = r.rot;
      add(group, rail);
    });
  });
}

function buildInk({ hexColor, level = 1, footprintW = 3, footprintH = 3, smashed = false }) {
  const group = new THREE.Group();
  group.userData.buildingType = 'INK_HOUSE';
  const { bw, bd } = houseSpan(footprintW, footprintH);
  const cloth = clothColor(hexColor, KIT.purple);

  addPlinth(group, bw, bd);
  addPalisade(group, bw, bd, smashed);

  const hall = box(bw * 0.6, smashed ? 0.42 : 0.6, bd * 0.6, KIT.plaster, 0.07);
  hall.position.set(-0.12, smashed ? 0.32 : 0.42, 0);
  add(group, hall);
  [-0.24, 0.24].forEach((nz) => {
    const post = box(0.08, smashed ? 0.4 : 0.6, 0.08, KIT.woodDark, 0.02);
    post.position.set(-bw * 0.4, smashed ? 0.3 : 0.42, nz * bd * 0.45);
    add(group, post);
  });
  const gable = box(bw * 0.48, smashed ? 0.22 : 0.36, 0.08, KIT.plaster, 0.04);
  gable.position.set(-0.12, smashed ? 0.62 : 0.8, bd * 0.3);
  add(group, gable);
  addDrop(group, -0.12, smashed ? 0.7 : 0.86, bd * 0.36, KIT.purple, { scale: 1.35 });

  addPurpleCap(group, bw, bd, smashed);
  addInkwell(group, smashed);
  addPipesAndTanks(group, smashed);

  addDoor(group, -0.12, smashed ? 0.28 : 0.36, bd * 0.32, { smashed });
  const arch = cyl(0.22, 0.22, 0.08, KIT.woodDark, 12);
  arch.rotation.x = Math.PI / 2;
  arch.position.set(-0.12, smashed ? 0.52 : 0.62, bd * 0.32);
  add(group, arch);
  addLantern(group, -0.4, 0.54, bd * 0.28, { hanging: true, level });
  addLantern(group, 0.1, 0.54, bd * 0.3, { hanging: true, level });

  addBanner(group, bw * 0.42, 0.76, -0.04, { hex: cloth, torn: smashed, emblem: 'drop' });
  addBarrel(group, -bw * 0.4, 0.18, 0.08, { smashed });
  addBarrel(group, -bw * 0.36, smashed ? 0.12 : 0.18, -0.14, { smashed });

  const signPost = box(0.05, 0.52, 0.05, KIT.woodDark, 0.015);
  signPost.position.set(-bw * 0.46, 0.32, bd * 0.12);
  add(group, signPost);
  const sign = box(0.22, 0.26, 0.04, smashed ? KIT.woodDark : KIT.wood, 0.02);
  sign.position.set(-bw * 0.46, smashed ? 0.28 : 0.5, bd * 0.12);
  if (smashed) sign.rotation.z = 0.5;
  add(group, sign);
  addDrop(group, -bw * 0.46, smashed ? 0.3 : 0.52, bd * 0.15, KIT.purple, { scale: 0.9 });

  if (smashed) {
    addRubble(group, 0.02, 0.14, 0.1, 5);
    PIPE_KEYS.slice(0, 3).forEach((key, i) => {
      const stain = box(0.16, 0.22, 0.03, GAME_COLORS[key], 0.02);
      stain.position.set(-0.22 + i * 0.12, 0.36, bd * 0.3);
      stain.rotation.z = 0.2 * i;
      add(group, stain);
    });
  }

  addLevelExtras(group, level, bw, bd, hexColor);
  return group;
}

export function buildIntact(opts) {
  return buildInk({ ...opts, smashed: false });
}

export function buildDestroyed(opts) {
  const g = buildInk({ ...opts, smashed: true });
  g.userData.ruined = true;
  return g;
}
