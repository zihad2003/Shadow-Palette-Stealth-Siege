import * as THREE from 'three';
import {
  KIT,
  add,
  addAnvil,
  addBarrel,
  addCrate,
  addGableRoof,
  addGlowWindow,
  addLantern,
  addLevelExtras,
  addPlinth,
  addRubble,
  addTimberGable,
  box,
  clay,
  clothColor,
  cyl,
  houseSpan,
  markCloth,
  markMotion,
  metal,
} from '../houseKit.js';

function addHammer(group, x, y, z, rot = 0, scale = 1) {
  const handle = box(0.04 * scale, 0.26 * scale, 0.04 * scale, KIT.wood, 0.01);
  handle.position.set(x, y, z);
  handle.rotation.z = rot;
  add(group, handle);
  const head = box(0.2 * scale, 0.08 * scale, 0.08 * scale, KIT.iron, 0.015);
  head.position.set(x + Math.sin(rot) * 0.14 * scale, y + Math.cos(rot) * 0.14 * scale, z);
  head.rotation.z = rot;
  add(group, head);
}

function addRock(group, x, y, z, s = 1, tilt = 0) {
  const rock = box(0.22 * s, 0.14 * s, 0.18 * s, s > 1.05 ? KIT.stoneDk : KIT.stone, 0.04);
  rock.position.set(x, y, z);
  rock.rotation.y = tilt;
  add(group, rock);
}

function addSmithDoor(group, x, y, z, smashed) {
  const door = box(0.38, smashed ? 0.42 : 0.56, 0.08, KIT.woodDark, 0.03);
  door.position.set(x, y, z);
  if (smashed) door.rotation.y = 0.12;
  add(group, door);
  [-0.09, 0.09].forEach((dx) => {
    const plank = box(0.14, smashed ? 0.36 : 0.5, 0.03, KIT.wood, 0.012);
    plank.position.set(x + dx, y, z + 0.05);
    add(group, plank);
  });
  [0.14, 0, -0.14].forEach((dy) => {
    const band = box(0.36, 0.04, 0.035, KIT.iron, 0.008);
    band.position.set(x, y + dy, z + 0.055);
    add(group, band);
  });
  const arch = cyl(0.2, 0.2, 0.08, KIT.woodDark, 12);
  arch.rotation.x = Math.PI / 2;
  arch.position.set(x, y + (smashed ? 0.2 : 0.26), z);
  add(group, arch);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 8, 12), metal(KIT.ironLt));
  ring.position.set(x + 0.08, y + 0.02, z + 0.08);
  add(group, ring);
  if (smashed) {
    const hole = box(0.1, 0.1, 0.04, KIT.iron, 0.01);
    hole.position.set(x - 0.04, y + 0.08, z + 0.07);
    add(group, hole);
  }
}

function addStoneJamb(group, x, h, z) {
  const pillar = box(0.32, h, 0.5, KIT.stone, 0.05);
  pillar.position.set(x, h / 2 + 0.1, z);
  add(group, pillar);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 2; c++) {
      const brick = box(0.14, 0.13, 0.04, (r + c) % 2 ? KIT.stoneLt : KIT.stoneDk, 0.02);
      brick.position.set(x - 0.07 + c * 0.14, 0.22 + r * 0.14, z + 0.26);
      add(group, brick);
    }
  }
}

function addChimneyStack(group, x, y, z, smashed) {
  const n = smashed ? 3 : 5;
  for (let i = 0; i < n; i++) {
    const hh = smashed ? 0.14 : 0.13;
    const stack = box(0.28 + (i === n - 1 ? 0.06 : 0), hh, 0.28, i % 2 ? KIT.stoneLt : KIT.stone, 0.03);
    stack.position.set(x + (smashed && i > 1 ? 0.06 : 0), y + i * hh + hh / 2, z);
    if (smashed && i === n - 1) stack.rotation.z = 0.28;
    add(group, stack);
  }
  const cap = box(0.34, 0.07, 0.34, KIT.stoneDk, 0.02);
  cap.position.set(x + (smashed ? 0.08 : 0), y + (smashed ? 0.42 : 0.68), z);
  add(group, cap);
  const brace = box(0.12, 0.08, 0.22, KIT.wood, 0.02);
  brace.position.set(x - 0.16, y + 0.06, z);
  add(group, brace);

  [0, 0.12, 0.24].forEach((dy, i) => {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(smashed ? 0.1 : 0.07 + i * 0.02, 8, 8),
      clay(smashed ? '#4A4A4A' : '#D0D5DA', { transparent: true, opacity: smashed ? 0.5 : 0.38 - i * 0.08 })
    );
    puff.position.set(x + (smashed ? 0.08 : 0), y + (smashed ? 0.55 : 0.82) + dy, z);
    markMotion(puff, 'bob', 1.1 + i * 0.12);
    puff.userData.baseY = puff.position.y;
    group.add(puff);
  });
}

function addHammerSign(group, x, y, z, smashed) {
  const arm = box(0.06, 0.06, 0.46, KIT.wood, 0.015);
  arm.position.set(x, smashed ? y - 0.12 : y, z);
  if (smashed) arm.rotation.z = 0.42;
  add(group, arm);
  const post = box(0.05, 0.16, 0.05, KIT.woodDark, 0.01);
  post.position.set(x + 0.18, smashed ? y - 0.18 : y - 0.04, z);
  add(group, post);
  const sign = box(0.3, 0.24, 0.05, KIT.woodLight, 0.02);
  sign.position.set(x + 0.22, smashed ? y - 0.32 : y - 0.2, z);
  if (smashed) sign.rotation.z = 0.55;
  add(group, sign);
  const c1 = box(0.2, 0.045, 0.03, KIT.iron, 0.01);
  c1.position.copy(sign.position);
  c1.position.z += 0.04;
  c1.rotation.z = smashed ? 0.55 : 0.7;
  add(group, c1);
  const c2 = box(0.2, 0.045, 0.03, KIT.iron, 0.01);
  c2.position.copy(sign.position);
  c2.position.z += 0.04;
  c2.rotation.z = smashed ? -0.2 : -0.7;
  add(group, c2);
}

function addCrownBanner(group, x, y, z, hex, torn) {
  const rod = cyl(0.025, 0.025, 0.28, metal(KIT.gold), 8);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(x, y, z);
  add(group, rod);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), metal(KIT.gold));
  knob.position.set(x + 0.16, y, z);
  add(group, knob);
  const cloth = box(torn ? 0.16 : 0.22, torn ? 0.26 : 0.46, 0.03, hex, 0.02);
  cloth.position.set(x + 0.16, y - (torn ? 0.18 : 0.28), z);
  if (torn) cloth.rotation.z = 0.2;
  markCloth(cloth);
  markMotion(cloth, 'sway', 1);
  add(group, cloth);
  const trim = box(torn ? 0.18 : 0.24, 0.04, 0.035, KIT.bannerGold, 0.01);
  trim.position.set(x + 0.16, y - 0.04, z);
  add(group, trim);
  const gem = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 4), clay(KIT.bannerGold));
  gem.position.set(x + 0.16, y - 0.24, z + 0.03);
  add(group, gem);
  if (torn) {
    const scrap = box(0.12, 0.16, 0.025, hex, 0.015);
    scrap.position.set(x + 0.2, y - 0.44, z);
    scrap.rotation.z = -0.4;
    markCloth(scrap);
    markMotion(scrap, 'sway', 1.15);
    add(group, scrap);
  }
}

function addBayInterior(group, smashed) {
  const glow = box(0.7, 0.4, 0.02, clay(KIT.lamp, { emissive: KIT.lamp, emissiveIntensity: smashed ? 0.35 : 0.9 }));
  glow.position.set(0.28, 0.42, -0.18);
  add(group, glow);

  const back = box(0.72, smashed ? 0.4 : 0.52, 0.08, KIT.stoneLt, 0.04);
  back.position.set(0.28, 0.36, -0.22);
  add(group, back);

  const rack = box(0.06, 0.28, 0.32, KIT.woodDark, 0.02);
  rack.position.set(0.18, 0.5, -0.14);
  add(group, rack);
  [-0.1, 0, 0.1].forEach((dz, i) => addHammer(group, 0.22, 0.52, -0.14 + dz, 0.2 + i * 0.18, 0.75));

  const bench = box(0.42, 0.08, 0.22, KIT.wood, 0.03);
  bench.position.set(0.22, smashed ? 0.22 : 0.32, -0.02);
  add(group, bench);
  [[-0.16, 0.08], [0.16, 0.08], [-0.16, -0.08], [0.16, -0.08]].forEach(([dx, dz]) => {
    const leg = box(0.05, 0.2, 0.05, KIT.woodDark, 0.012);
    leg.position.set(0.22 + dx, 0.18, dz);
    add(group, leg);
  });
  addAnvil(group, 0.38, smashed ? 0.22 : 0.34, 0.08, { smashed });
  const stump = cyl(0.1, 0.11, 0.16, KIT.woodDark, 8);
  stump.position.set(0.38, 0.16, 0.08);
  add(group, stump);
}

function addYard(group, bw, smashed) {
  const table = box(0.52, 0.08, 0.28, KIT.wood, 0.03);
  table.position.set(0.36, smashed ? 0.2 : 0.3, 0.38);
  if (smashed) table.rotation.z = -0.12;
  add(group, table);
  [[-0.2, 0.1], [0.2, 0.1], [-0.2, -0.1], [0.2, -0.1]].forEach(([dx, dz]) => {
    const leg = box(0.06, smashed ? 0.12 : 0.22, 0.06, KIT.woodDark, 0.015);
    leg.position.set(0.36 + dx, smashed ? 0.12 : 0.16, 0.38 + dz);
    add(group, leg);
  });
  addHammer(group, 0.28, smashed ? 0.24 : 0.4, 0.4, smashed ? 1.1 : 0.35);
  const vise = box(0.16, 0.08, 0.12, KIT.iron, 0.02);
  vise.position.set(0.46, smashed ? 0.22 : 0.36, 0.36);
  add(group, vise);

  const bucket = cyl(0.09, 0.1, smashed ? 0.1 : 0.2, KIT.woodDark, 10);
  bucket.position.set(0.06, smashed ? 0.12 : 0.2, 0.4);
  if (smashed) bucket.rotation.z = 1.15;
  add(group, bucket);
  if (!smashed) {
    addHammer(group, 0.04, 0.34, 0.4, 0.15, 0.85);
    addHammer(group, 0.08, 0.32, 0.42, -0.2, 0.8);
  }

  const ingotCrate = box(0.32, smashed ? 0.08 : 0.14, 0.22, KIT.wood, 0.03);
  ingotCrate.position.set(0.4, 0.12, 0.56);
  add(group, ingotCrate);
  [0.32, 0.44].forEach((ix, i) => {
    const ingot = box(0.14, 0.07, 0.09, i ? KIT.ironLt : KIT.iron, 0.02);
    ingot.position.set(ix, smashed ? 0.14 : 0.2, 0.56);
    if (smashed) ingot.rotation.x = 0.5;
    add(group, ingot);
  });

  const horseX = bw * 0.38;
  const horseZ = 0.12;
  [-0.1, 0.1].forEach((dz) => {
    const a = box(0.06, smashed ? 0.18 : 0.32, 0.06, KIT.wood, 0.015);
    a.position.set(horseX - 0.08, smashed ? 0.16 : 0.24, horseZ + dz);
    a.rotation.z = 0.35;
    add(group, a);
    const b = box(0.06, smashed ? 0.16 : 0.32, 0.06, KIT.woodDark, 0.015);
    b.position.set(horseX + 0.08, smashed ? 0.14 : 0.24, horseZ + dz);
    b.rotation.z = -0.35;
    add(group, b);
  });
  const beam = box(0.28, 0.06, 0.28, KIT.woodLight, 0.015);
  beam.position.set(horseX, smashed ? 0.28 : 0.4, horseZ);
  add(group, beam);
  addHammer(group, horseX - 0.04, smashed ? 0.32 : 0.5, horseZ + 0.04, 0.9, 0.7);
  addHammer(group, horseX + 0.04, smashed ? 0.3 : 0.48, horseZ - 0.04, -0.85, 0.7);
}

function addLeftStores(group, bw, smashed) {
  addCrate(group, -bw * 0.42, smashed ? 0.14 : 0.22, 0.18, { smashed });
  addCrate(group, -bw * 0.38, 0.2, 0.0, { smashed: false, scale: 0.85 });
  addBarrel(group, -bw * 0.44, smashed ? 0.12 : 0.2, -0.18, { smashed });
  const scrollBox = box(0.26, smashed ? 0.08 : 0.16, 0.2, KIT.wood, 0.03);
  scrollBox.position.set(-bw * 0.32, smashed ? 0.12 : 0.16, 0.1);
  if (smashed) scrollBox.rotation.set(0.4, 0.2, 0.3);
  add(group, scrollBox);
  [0, 0.06, -0.05].forEach((dx, i) => {
    const scroll = cyl(0.03, 0.03, 0.16, i % 2 ? KIT.pillow : KIT.cream, 8);
    scroll.rotation.z = smashed ? 0.9 : Math.PI / 2;
    scroll.position.set(-bw * 0.32 + dx, smashed ? 0.14 : 0.28, 0.1 + i * 0.04);
    add(group, scroll);
  });
}

function addPalisade(group, bw, bd, smashed) {
  const posts = [
    [-0.5, 0.42],
    [-0.5, 0.12],
    [-0.5, -0.18],
    [-0.28, 0.46],
    [0.18, 0.5],
    [0.46, 0.48],
    [0.5, 0.18],
    [0.5, -0.16],
  ];
  posts.forEach(([nx, nz], i) => {
    if (smashed && i % 4 === 0) return;
    const h = smashed && i % 2 ? 0.22 : 0.4;
    const post = box(0.08, h, 0.08, KIT.wood, 0.02);
    post.position.set(nx * bw, h / 2 + 0.08, nz * bd);
    if (smashed) post.rotation.z = (i - 3) * 0.08;
    add(group, post);
  });
  [
    { x: -bw * 0.4, z: bd * 0.46, w: bw * 0.32, rot: 0 },
    { x: -bw * 0.5, z: bd * 0.12, w: bd * 0.5, rot: Math.PI / 2 },
    { x: bw * 0.34, z: bd * 0.5, w: bw * 0.28, rot: 0 },
    { x: bw * 0.5, z: bd * 0.16, w: bd * 0.42, rot: Math.PI / 2 },
  ].forEach((r, i) => {
    [0.2, 0.32].forEach((yy, k) => {
      if (smashed && (i + k) % 3 === 0) return;
      const rail = box(r.w * (smashed ? 0.55 : 1), 0.045, 0.05, KIT.woodLight, 0.015);
      rail.position.set(r.x, smashed ? yy - 0.04 : yy, r.z);
      rail.rotation.y = r.rot;
      if (smashed) rail.rotation.z = 0.28;
      add(group, rail);
    });
  });
}

function addBase(group, bw, bd) {
  [
    [-0.46, 0.4, 1.1],
    [-0.42, -0.38, 1.0],
    [0.44, 0.4, 1.15],
    [0.42, -0.38, 0.95],
    [0.08, -0.46, 0.8],
    [-0.08, 0.48, 0.85],
  ].forEach(([nx, nz, s], i) => addRock(group, nx * bw, 0.12, nz * bd, s, i * 0.6));
  const path = box(0.32, 0.02, 0.5, '#8A7A62', 0.02);
  path.position.set(-0.12, 0.1, bd * 0.32);
  add(group, path);
  [-0.08, 0.06, -0.16].forEach((dx, i) => {
    const slab = box(0.16, 0.03, 0.12, KIT.stone, 0.02);
    slab.position.set(-0.14 + dx, 0.11, bd * 0.22 + i * 0.12);
    add(group, slab);
  });
}

function addBayFrame(group, bw, bd, smashed) {
  const posts = [
    [bw * 0.18, bd * 0.22],
    [bw * 0.42, bd * 0.22],
    [bw * 0.18, -bd * 0.18],
    [bw * 0.42, -bd * 0.18],
  ];
  posts.forEach(([x, z], i) => {
    const h = smashed && i === 1 ? 0.32 : 0.58;
    const post = box(0.09, h, 0.09, i % 2 ? KIT.woodDark : KIT.wood, 0.02);
    post.position.set(x, smashed && i === 1 ? 0.24 : 0.38, z);
    if (smashed && i === 1) post.rotation.z = 0.38;
    add(group, post);
  });
  const beam = box(bw * 0.32, 0.08, 0.08, KIT.wood, 0.02);
  beam.position.set(bw * 0.3, smashed ? 0.52 : 0.68, bd * 0.2);
  if (smashed) beam.rotation.z = 0.22;
  add(group, beam);
  const side = box(0.08, 0.08, bd * 0.42, KIT.woodDark, 0.02);
  side.position.set(bw * 0.42, smashed ? 0.5 : 0.68, 0.02);
  add(group, side);

  const shedW = bw * 0.4;
  const shedD = bd * 0.55;
  const shedY = smashed ? 0.52 : 0.72;
  const deck = box(shedW, 0.07, shedD, smashed ? KIT.shingleBlueDk : KIT.shingleBlue, 0.03);
  deck.position.set(bw * 0.3, shedY, 0.02);
  deck.rotation.z = smashed ? -0.42 : -0.16;
  add(group, deck);
  const rows = smashed ? 2 : 4;
  const cols = smashed ? 3 : 5;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (smashed && (r + c) % 2 === 0) continue;
      const tile = box(shedW * 0.26, 0.04, shedD * 0.18, (r + c) % 2 ? KIT.shingleBlue : KIT.shingleBlueMid, 0.012);
      tile.position.set(bw * 0.18 + r * (shedW * 0.2), shedY + 0.04 - r * 0.03, -shedD * 0.32 + c * (shedD * 0.16));
      tile.rotation.z = smashed ? 0.45 : -0.16;
      if (smashed) tile.rotation.x = (c % 2) * 0.2;
      add(group, tile);
    }
  }
}

function buildCraft({ hexColor, level = 1, footprintW = 3, footprintH = 3, smashed = false }) {
  const group = new THREE.Group();
  group.userData.buildingType = 'CRAFT_HOUSE';
  const { bw, bd } = houseSpan(footprintW, footprintH);
  const cloth = clothColor(hexColor, KIT.bannerBlue);

  addPlinth(group, bw, bd);
  addBase(group, bw, bd);
  addPalisade(group, bw, bd, smashed);

  const hallW = bw * 0.5;
  const cottage = box(hallW, smashed ? 0.48 : 0.62, bd * 0.58, KIT.woodPale, 0.05);
  cottage.position.set(-bw * 0.16, smashed ? 0.34 : 0.42, -0.02);
  add(group, cottage);
  addStoneJamb(group, 0.06, smashed ? 0.5 : 0.62, 0.02);

  addTimberGable(group, -bw * 0.16, smashed ? 0.7 : 0.92, bd * 0.28, { w: hallW, h: 0.46, smashed });
  addGableRoof(group, {
    w: bw * 0.68,
    d: bd * 0.72,
    y: smashed ? 0.64 : 0.88,
    color: KIT.shingleBlue,
    dark: KIT.shingleBlueDk,
    broken: smashed,
  });
  addGlowWindow(group, -bw * 0.18, smashed ? 0.78 : 0.98, bd * 0.26, { smashed, planter: true, w: 0.26, h: 0.22 });
  addSmithDoor(group, -bw * 0.18, smashed ? 0.32 : 0.38, bd * 0.3, smashed);
  addLantern(group, -bw * 0.4, 0.58, bd * 0.26, { hanging: true, level, smashed: false });

  addBayFrame(group, bw, bd, smashed);
  addBayInterior(group, smashed);
  addChimneyStack(group, bw * 0.08, smashed ? 0.78 : 1.02, -bd * 0.08, smashed);
  addHammerSign(group, bw * 0.22, smashed ? 0.92 : 1.18, -bd * 0.04, smashed);
  addCrownBanner(group, bw * 0.46, 0.78, 0.08, cloth, smashed);

  addYard(group, bw, smashed);
  addLeftStores(group, bw, smashed);

  if (smashed) {
    addRubble(group, 0.12, 0.14, 0.12, 6);
    const rafter = box(0.1, 0.1, 0.8, KIT.woodDark, 0.02);
    rafter.position.set(0.08, 0.62, 0);
    rafter.rotation.set(0.4, 0.2, 0.18);
    add(group, rafter);
    const tile = box(0.18, 0.04, 0.16, KIT.shingleBlueDk, 0.012);
    tile.position.set(0.2, 0.14, 0.28);
    tile.rotation.set(0.4, 0.3, 0.2);
    add(group, tile);
  }

  addLevelExtras(group, level, bw, bd, hexColor);
  return group;
}

export function buildIntact(opts) {
  return buildCraft({ ...opts, smashed: false });
}

export function buildDestroyed(opts) {
  const g = buildCraft({ ...opts, smashed: true });
  g.userData.ruined = true;
  return g;
}
