import * as THREE from 'three';
import {
  KIT,
  add,
  addBanner,
  addChimney,
  addDoor,
  addGableRoof,
  addGlowWindow,
  addLantern,
  addLevelExtras,
  addPlinth,
  addRubble,
  addTimberGable,
  box,
  clothColor,
  houseSpan,
  markCloth,
} from '../houseKit.js';

function addBed(group, x, y, z, smashed, yaw = 0) {
  const g = new THREE.Group();
  const frame = box(0.62, 0.1, 0.32, KIT.wood, 0.02);
  frame.position.y = smashed ? -0.04 : 0;
  if (smashed) frame.rotation.z = 0.18;
  add(g, frame);
  [
    [0.24, 0.12],
    [-0.24, 0.12],
    [0.24, -0.12],
    [-0.24, -0.12],
  ].forEach(([dx, dz]) => {
    const leg = box(0.05, 0.14, 0.05, KIT.woodDark, 0.01);
    leg.position.set(dx, -0.08, dz);
    add(g, leg);
  });
  const mattress = box(0.54, 0.07, 0.28, smashed ? KIT.stoneDk : KIT.bedding, 0.02);
  mattress.position.y = 0.08;
  markCloth(mattress);
  add(g, mattress);
  const pillow = box(0.18, 0.08, 0.2, KIT.pillow, 0.02);
  pillow.position.set(0.18, 0.15, 0);
  if (smashed) pillow.rotation.set(0.5, 0.25, 0.4);
  add(g, pillow);
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  group.add(g);
}

function addPillowBadge(group, x, y, z, smashed) {
  const badge = box(0.26, 0.22, 0.045, KIT.bannerGold, 0.02);
  badge.position.set(x, y, z);
  if (smashed) badge.rotation.z = 0.2;
  add(group, badge);
  const pillow = box(0.14, 0.1, 0.03, KIT.pillow, 0.015);
  pillow.position.set(x, y, z + 0.03);
  add(group, pillow);
}

function addCanopy(group, x, y, z, w, cloth, smashed) {
  const clothMesh = box(w, 0.045, 0.22, cloth, 0.02);
  clothMesh.position.set(x, smashed ? y - 0.12 : y, z);
  if (smashed) clothMesh.rotation.z = 0.28;
  markCloth(clothMesh);
  add(group, clothMesh);
  const trim = box(w * 0.98, 0.03, 0.04, KIT.bannerGold, 0.01);
  trim.position.set(x, smashed ? y - 0.1 : y + 0.02, z + 0.1);
  add(group, trim);
  [-w * 0.42, w * 0.42].forEach((dx) => {
    const pole = box(0.05, 0.48, 0.05, KIT.woodDark, 0.012);
    pole.position.set(x + dx, 0.32, z);
    add(group, pole);
  });
}

function addPalisade(group, bw, bd, smashed) {
  const posts = [
    [-0.5, 0.42],
    [-0.5, 0.08],
    [-0.5, -0.22],
    [0.12, 0.5],
    [0.42, 0.5],
    [0.5, 0.22],
    [0.5, -0.12],
    [-0.22, 0.5],
  ];
  posts.forEach(([nx, nz], i) => {
    if (smashed && i % 4 === 0) return;
    const h = smashed && i % 2 ? 0.22 : 0.4;
    const post = box(0.08, h, 0.08, KIT.wood, 0.02);
    post.position.set(nx * bw, h / 2 + 0.08, nz * bd);
    if (smashed) post.rotation.z = (i - 3) * 0.07;
    add(group, post);
  });
  [
    { x: -bw * 0.5, z: bd * 0.12, w: bd * 0.55, rot: Math.PI / 2 },
    { x: bw * 0.28, z: bd * 0.5, w: bw * 0.38, rot: 0 },
    { x: bw * 0.5, z: bd * 0.18, w: bd * 0.4, rot: Math.PI / 2 },
  ].forEach((r, i) => {
    [0.2, 0.32].forEach((yy, k) => {
      if (smashed && (i + k) % 3 === 0) return;
      const rail = box(r.w * (smashed ? 0.55 : 1), 0.045, 0.05, KIT.woodLight, 0.015);
      rail.position.set(r.x, smashed ? yy - 0.04 : yy, r.z);
      rail.rotation.y = r.rot;
      if (smashed) rail.rotation.z = 0.25;
      add(group, rail);
    });
  });
}

function buildSleep({ hexColor, level = 1, footprintW = 3, footprintH = 3, smashed = false }) {
  const group = new THREE.Group();
  group.userData.buildingType = 'SLEEP_HOUSE';
  const { bw, bd } = houseSpan(footprintW, footprintH);
  const cloth = clothColor(hexColor, KIT.bannerBlue);

  addPlinth(group, bw, bd);
  addPalisade(group, bw, bd, smashed);

  const path = box(0.28, 0.02, 0.48, '#8A7A62', 0.02);
  path.position.set(-bw * 0.2, 0.1, bd * 0.32);
  add(group, path);
  const runner = box(0.26, 0.025, 0.42, cloth, 0.01);
  runner.position.set(-bw * 0.2, 0.12, bd * 0.22);
  markCloth(runner);
  group.add(runner);

  const hallW = bw * 0.44;
  const hall = box(hallW, smashed ? 0.5 : 0.78, bd * 0.7, KIT.cream, 0.05);
  hall.position.set(-bw * 0.2, smashed ? 0.36 : 0.5, 0);
  add(group, hall);
  [-0.28, 0.28].forEach((nz) => {
    const post = box(0.09, smashed ? 0.45 : 0.78, 0.09, KIT.woodDark, 0.02);
    post.position.set(-bw * 0.4, smashed ? 0.34 : 0.5, nz * bd * 0.55);
    add(group, post);
  });
  const upper = box(hallW * 0.95, smashed ? 0.22 : 0.5, bd * 0.5, KIT.woodLight, 0.05);
  upper.position.set(-bw * 0.18, smashed ? 0.72 : 1.08, -0.04);
  if (smashed) upper.rotation.z = 0.16;
  add(group, upper);
  addTimberGable(group, -bw * 0.18, smashed ? 0.92 : 1.38, bd * 0.24, { w: hallW, h: 0.48, smashed });
  addGlowWindow(group, -bw * 0.18, smashed ? 1.05 : 1.3, bd * 0.26, { smashed, planter: true, w: 0.26, h: 0.22 });
  addPillowBadge(group, -bw * 0.18, smashed ? 0.78 : 0.92, bd * 0.36, smashed);

  addGableRoof(group, {
    w: bw * 0.9,
    d: bd * 0.82,
    y: smashed ? 0.88 : 1.34,
    color: KIT.shingleBlue,
    dark: KIT.shingleBlueDk,
    broken: smashed,
  });

  [
    [bw * 0.12, bd * 0.32],
    [bw * 0.42, bd * 0.32],
    [bw * 0.12, -bd * 0.28],
    [bw * 0.42, -bd * 0.22],
  ].forEach(([px, pz], i) => {
    const h = smashed && i === 3 ? 0.32 : 0.72;
    const post = box(0.09, h, 0.09, KIT.wood, 0.02);
    post.position.set(px, h / 2 + 0.08, pz);
    if (smashed && i === 3) post.rotation.z = 0.42;
    add(group, post);
  });
  const porchBeam = box(bw * 0.42, 0.08, 0.08, KIT.woodDark, 0.02);
  porchBeam.position.set(bw * 0.26, smashed ? 0.52 : 0.8, bd * 0.32);
  add(group, porchBeam);
  const porchRoof = box(bw * 0.52, 0.08, bd * 0.64, smashed ? KIT.shingleBlueDk : KIT.shingleBlueMid, 0.03);
  porchRoof.position.set(bw * 0.26, smashed ? 0.55 : 0.86, 0.02);
  porchRoof.rotation.z = smashed ? -0.32 : -0.1;
  add(group, porchRoof);
  if (!smashed) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const tile = box(0.16, 0.035, 0.14, (r + c) % 2 ? KIT.shingleBlue : KIT.shingleBlueMid, 0.012);
        tile.position.set(bw * 0.08 + r * 0.14, 0.9 - r * 0.03, -bd * 0.22 + c * 0.16);
        tile.rotation.z = -0.1;
        add(group, tile);
      }
    }
  }

  addDoor(group, -bw * 0.2, smashed ? 0.32 : 0.4, bd * 0.36, { smashed });
  addCanopy(group, -bw * 0.2, 0.74, bd * 0.42, 0.62, cloth, smashed);

  addBed(group, bw * 0.28, 0.24, 0.22, smashed);
  addBed(group, bw * 0.28, 0.24, -0.04, smashed);
  addBed(group, bw * 0.16, 0.24, -0.32, smashed, smashed ? 0.35 : 0.15);
  addBed(group, bw * 0.38, 0.24, -0.28, smashed, -0.1);

  const roll = box(0.24, smashed ? 0.09 : 0.15, 0.17, cloth, 0.03);
  roll.position.set(-bw * 0.42, 0.2, bd * 0.14);
  markCloth(roll);
  add(group, roll);
  const roll2 = box(0.24, 0.15, 0.17, KIT.bedding, 0.03);
  roll2.position.set(-bw * 0.42, smashed ? 0.14 : 0.36, bd * 0.14);
  markCloth(roll2);
  add(group, roll2);

  addChimney(group, bw * 0.16, smashed ? 0.95 : 1.4, -bd * 0.14, { h: 0.64, broken: smashed, fire: !smashed });
  addLantern(group, -bw * 0.44, 0.66, bd * 0.28, { hanging: true, level, smashed });
  addLantern(group, bw * 0.16, 0.52, bd * 0.38, { hanging: true, level });
  addLantern(group, bw * 0.4, 0.44, -0.02, { hanging: false, level });
  addLantern(group, -0.02, smashed ? 0.58 : 0.78, bd * 0.2, { hanging: true, level });

  addBanner(group, -bw * 0.02, smashed ? 1.24 : 1.72, 0.02, { hex: cloth, torn: smashed, emblem: 'pillow' });
  addBanner(group, bw * 0.42, 0.9, bd * 0.08, { hex: cloth, torn: smashed, emblem: 'pillow' });
  addBanner(group, bw * 0.46, 0.66, -bd * 0.28, { hex: cloth, torn: smashed, emblem: 'pillow' });

  if (smashed) {
    addRubble(group, 0.1, 0.16, 0.18, 6);
    const fallen = box(0.1, 0.1, bw * 0.55, KIT.woodDark, 0.02);
    fallen.position.set(0.14, 0.5, 0.04);
    fallen.rotation.set(0.5, 0.28, 0.2);
    add(group, fallen);
  }

  addLevelExtras(group, level, bw, bd, hexColor);
  return group;
}

export function buildIntact(opts) {
  return buildSleep({ ...opts, smashed: false });
}

export function buildDestroyed(opts) {
  const g = buildSleep({ ...opts, smashed: true, hexColor: opts.hexColor });
  g.userData.ruined = true;
  return g;
}
