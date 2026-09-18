import * as THREE from 'three';
import {
  KIT,
  add,
  addCoin,
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
  metal,
} from '../houseKit.js';

function addSmoke(group, x, y, z, smashed) {
  [0, 0.14, 0.28, 0.42].forEach((dy, i) => {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(smashed ? 0.11 + i * 0.02 : 0.07 + i * 0.022, 8, 8),
      clay(smashed ? '#4A4A4A' : '#D4D8DE', {
        transparent: true,
        opacity: smashed ? 0.55 - i * 0.08 : 0.42 - i * 0.07,
      })
    );
    puff.position.set(x + (smashed ? 0.06 * i : i * 0.02), y + dy, z);
    markMotion(puff, 'bob', 1.05 + i * 0.12);
    puff.userData.baseY = puff.position.y;
    group.add(puff);
  });
}

function addRock(group, x, y, z, s = 1, tilt = 0) {
  const rock = box(0.22 * s, 0.14 * s, 0.18 * s, iStone(s), 0.04);
  rock.position.set(x, y, z);
  rock.rotation.y = tilt;
  add(group, rock);
}

function iStone(s) {
  return s > 1.1 ? KIT.stoneDk : s > 0.9 ? KIT.stone : KIT.stoneLt;
}

/** Left timber porch with a grid of bright blue shingles and a hanging lantern. */
function addBluePorch(group, bw, smashed, level) {
  const wx = -bw * 0.28;
  const wall = box(bw * 0.34, smashed ? 0.36 : 0.52, 0.42, KIT.stoneLt, 0.05);
  wall.position.set(wx, smashed ? 0.28 : 0.36, 0);
  add(group, wall);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      const brick = box(0.14, 0.12, 0.04, (r + c) % 2 ? KIT.stone : KIT.stoneLt, 0.02);
      brick.position.set(wx - 0.08 + c * 0.16, 0.2 + r * 0.13, 0.22);
      add(group, brick);
    }
  }

  const postL = box(0.09, smashed ? 0.34 : 0.56, 0.09, KIT.wood, 0.02);
  postL.position.set(wx - bw * 0.14, smashed ? 0.26 : 0.38, 0.2);
  if (smashed) postL.rotation.z = 0.18;
  add(group, postL);
  const postR = box(0.09, 0.56, 0.09, KIT.woodDark, 0.02);
  postR.position.set(wx + bw * 0.1, 0.38, 0.2);
  add(group, postR);
  const beam = box(bw * 0.32, 0.08, 0.08, KIT.wood, 0.02);
  beam.position.set(wx, smashed ? 0.52 : 0.66, 0.2);
  if (smashed) beam.rotation.z = 0.32;
  add(group, beam);
  const barge = box(0.08, 0.09, 0.48, KIT.woodDark, 0.02);
  barge.position.set(wx - bw * 0.16, smashed ? 0.54 : 0.72, 0);
  barge.rotation.z = smashed ? 0.55 : 0.38;
  add(group, barge);

  const deck = box(bw * 0.4, 0.07, 0.5, smashed ? KIT.shingleBlueDk : KIT.shingleBlue, 0.03);
  deck.position.set(wx, smashed ? 0.56 : 0.72, 0.02);
  deck.rotation.z = smashed ? 0.42 : 0.28;
  add(group, deck);

  const cols = smashed ? 3 : 3;
  const rows = smashed ? 3 : 4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (smashed && (r + c) % 3 === 0) continue;
      const tile = box(0.18, 0.045, 0.16, (r + c) % 2 ? KIT.shingleBlue : KIT.shingleBlueMid, 0.015);
      tile.position.set(
        wx - 0.16 + c * 0.14,
        smashed ? 0.54 + r * 0.03 : 0.78 - r * 0.04,
        -0.16 + r * 0.14
      );
      tile.rotation.z = smashed ? 0.55 : 0.28;
      if (smashed) tile.rotation.x = (c % 2) * 0.22;
      add(group, tile);
    }
  }
  addLantern(group, wx - bw * 0.16, 0.5, 0.22, { hanging: true, level, smashed: false });
}

function addCauldron(group, smashed, level) {
  const steel = metal(KIT.steel);
  const x = 0.1;
  const y = smashed ? 1.02 : 1.16;
  const pts = smashed
    ? [
        new THREE.Vector2(0.12, -0.18),
        new THREE.Vector2(0.34, -0.16),
        new THREE.Vector2(0.42, -0.02),
        new THREE.Vector2(0.4, 0.12),
        new THREE.Vector2(0.34, 0.16),
      ]
    : [
        new THREE.Vector2(0.16, -0.22),
        new THREE.Vector2(0.38, -0.2),
        new THREE.Vector2(0.48, -0.04),
        new THREE.Vector2(0.5, 0.12),
        new THREE.Vector2(0.46, 0.2),
      ];
  const pot = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), steel);
  pot.position.set(x, y, 0);
  if (smashed) pot.rotation.z = 0.12;
  add(group, pot);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(smashed ? 0.36 : 0.47, 0.045, 8, 24), metal(KIT.gold));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, y + (smashed ? 0.14 : 0.2), 0);
  add(group, rim);
  const band = new THREE.Mesh(new THREE.TorusGeometry(smashed ? 0.38 : 0.46, 0.03, 8, 22), metal(KIT.gold));
  band.rotation.x = Math.PI / 2;
  band.position.set(x, y - 0.02, 0);
  add(group, band);

  [-0.7, -0.2, 0.3, 0.8].forEach((a) => {
    const bolt = cyl(0.04, 0.04, 0.05, metal(KIT.gold), 8);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(x + Math.sin(a) * 0.42, y + 0.04, 0.32 + Math.cos(a) * 0.08);
    add(group, bolt);
  });

  const well = cyl(0.32, 0.34, 0.08, metal('#2A3038'), 16);
  well.position.set(x, y + (smashed ? 0.08 : 0.12), 0);
  add(group, well);

  const medal = cyl(0.18, 0.18, 0.07, metal(KIT.gold, { emissive: '#6A5010', emissiveIntensity: 0.4 }), 20);
  medal.rotation.x = Math.PI / 2;
  medal.position.set(x, y - 0.04, 0.42);
  add(group, medal);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.11, 4), metal(KIT.goldDk));
  crown.position.set(x, y - 0.02, 0.47);
  add(group, crown);

  const n = smashed ? 10 : 16 + (level >= 2 ? 4 : 0) + (level >= 3 ? 4 : 0);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const r = 0.06 + (i % 5) * 0.06;
    addCoin(group, x + Math.cos(ang) * r, y + (smashed ? 0.16 : 0.26) + (i % 4) * 0.03, Math.sin(ang) * r * 0.85, {
      scale: 1.1,
      spin: 0.85 + i * 0.04,
    });
  }
  if (smashed) {
    const crack = box(0.1, 0.32, 0.06, KIT.steelDk, 0.02);
    crack.position.set(x + 0.22, y, 0.22);
    crack.rotation.z = 0.35;
    add(group, crack);
    const chunk = box(0.16, 0.14, 0.1, KIT.steelDk, 0.03);
    chunk.position.set(x + 0.28, y - 0.08, 0.1);
    chunk.rotation.set(0.3, 0.2, 0.4);
    add(group, chunk);
  }
}

function addFurnace(group, smashed) {
  const hatch = box(0.46, 0.48, 0.1, metal(KIT.steelDk), 0.04);
  hatch.position.set(0.1, 0.46, 0.34);
  add(group, hatch);
  const inner = box(0.34, 0.36, 0.05, metal(KIT.steel), 0.03);
  inner.position.set(0.1, 0.46, 0.4);
  add(group, inner);
  const slot = box(
    0.24,
    0.08,
    0.04,
    clay(KIT.lamp, { emissive: KIT.lamp, emissiveIntensity: smashed ? 0.4 : 1.8 })
  );
  slot.position.set(0.1, 0.34, 0.44);
  add(group, slot);
  if (!smashed) markMotion(slot, 'pulse', 0.8);

  const iconRing = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 8, 14), metal(KIT.gold));
  iconRing.position.set(0.1, 0.58, 0.44);
  add(group, iconRing);
  const iconHub = cyl(0.03, 0.03, 0.03, metal(KIT.goldDk), 8);
  iconHub.rotation.x = Math.PI / 2;
  iconHub.position.set(0.1, 0.58, 0.44);
  add(group, iconHub);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const tooth = box(0.045, 0.028, 0.02, KIT.gold, 0.006);
    tooth.position.set(0.1 + Math.cos(a) * 0.07, 0.58 + Math.sin(a) * 0.07, 0.44);
    tooth.rotation.z = a;
    add(group, tooth);
  }
  [-0.2, 0.4].forEach((hx) => {
    const hinge = box(0.06, 0.44, 0.06, KIT.gold, 0.012);
    hinge.position.set(hx, 0.46, 0.38);
    add(group, hinge);
  });
}

function addFrontGears(group, smashed) {
  addGearFace(group, -0.22, 0.4, 0.36, 0.2);
  addGearFace(group, -0.16, 0.22, 0.38, 0.11);
}

function addGearFace(group, x, y, z, r, spin) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.22, 8, 16), metal(KIT.gold));
  g.add(ring);
  const hub = cyl(r * 0.3, r * 0.3, 0.08, metal(KIT.goldDk), 8);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tooth = box(r * 0.3, r * 0.22, 0.07, KIT.gold, 0.01);
    tooth.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
    tooth.rotation.z = a;
    g.add(tooth);
  }
  g.position.set(x, y, z);
  if (spin) {
    markMotion(g, 'spin', spin);
    g.userData.baseRotY = 0;
  }
  group.add(g);
}

function addConveyor(group, smashed) {
  const mouth = cyl(0.09, 0.1, 0.22, metal(KIT.steel), 10);
  mouth.rotation.z = Math.PI / 2;
  mouth.position.set(0.1, 0.24, 0.28);
  add(group, mouth);

  const belt = box(0.34, 0.06, smashed ? 0.5 : 0.78, KIT.iron, 0.02);
  belt.position.set(0.3, smashed ? 0.24 : 0.32, 0.48);
  belt.rotation.x = smashed ? 0.52 : 0.4;
  add(group, belt);
  [-0.15, 0.15].forEach((dx) => {
    const rail = box(0.05, 0.05, smashed ? 0.5 : 0.78, KIT.gold, 0.012);
    rail.position.set(0.3 + dx, smashed ? 0.28 : 0.36, 0.48);
    rail.rotation.x = smashed ? 0.52 : 0.4;
    add(group, rail);
  });
  [0.18, 0.42].forEach((zz) => {
    const bracket = box(0.38, 0.08, 0.08, metal(KIT.steel), 0.02);
    bracket.position.set(0.3, 0.22, zz);
    bracket.rotation.x = 0.4;
    add(group, bracket);
  });
  [0.28, 0.44, 0.6].forEach((zz, i) => {
    addCoin(group, 0.3, 0.44 - i * 0.09, zz, { scale: 1.2, spin: 2.1 + i });
  });

  if (smashed) {
    for (let i = 0; i < 8; i++) {
      addCoin(group, 0.18 + (i % 4) * 0.12, 0.12, 0.62 + Math.floor(i / 4) * 0.12, {
        scale: 1.05,
        spin: 0.3 + i * 0.08,
      });
    }
    return;
  }

  const crateW = 0.58;
  const crateD = 0.4;
  const crateX = 0.36;
  const crateZ = 0.78;
  const floor = box(crateW, 0.06, crateD, KIT.wood, 0.02);
  floor.position.set(crateX, 0.1, crateZ);
  add(group, floor);
  [
    [0, crateD / 2, crateW, 0.2, 0.06],
    [0, -crateD / 2, crateW, 0.2, 0.06],
    [crateW / 2, 0, 0.06, 0.2, crateD],
    [-crateW / 2, 0, 0.06, 0.2, crateD],
  ].forEach(([dx, dz, w, h, d]) => {
    const side = box(w, h, d, KIT.woodLight, 0.02);
    side.position.set(crateX + dx, 0.18, crateZ + dz);
    add(group, side);
  });
  [
    [-0.26, -0.17],
    [0.26, -0.17],
    [-0.26, 0.17],
    [0.26, 0.17],
  ].forEach(([dx, dz]) => {
    const corner = box(0.08, 0.1, 0.08, KIT.iron, 0.015);
    corner.position.set(crateX + dx, 0.16, crateZ + dz);
    add(group, corner);
  });
  for (let i = 0; i < 12; i++) {
    addCoin(group, crateX - 0.16 + (i % 4) * 0.1, 0.2 + Math.floor(i / 4) * 0.035, crateZ - 0.1 + Math.floor(i / 4) * 0.08, {
      scale: 1.08,
      spin: 0.45 + i * 0.08,
    });
  }
}

function addStack(group, smashed, cloth) {
  const steel = metal(KIT.steel);
  const x = 0.48;
  const z = -0.14;
  const pipe = cyl(0.1, 0.11, smashed ? 0.5 : 0.82, steel, 12);
  pipe.position.set(x + (smashed ? 0.08 : 0), smashed ? 0.95 : 1.22, z);
  if (smashed) pipe.rotation.z = 0.38;
  add(group, pipe);
  const elbow = cyl(0.1, 0.1, 0.36, steel, 12);
  elbow.rotation.z = Math.PI / 2;
  elbow.position.set(0.28, smashed ? 1.08 : 1.52, z);
  add(group, elbow);
  const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), metal(KIT.gold));
  knuckle.position.set(0.32, smashed ? 1.08 : 1.52, z);
  add(group, knuckle);
  [0.98, 1.22, 1.46].forEach((yy) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.022, 6, 14), metal(KIT.gold));
    ring.position.set(x + (smashed ? 0.1 : 0), smashed ? yy * 0.82 : yy, z);
    add(group, ring);
  });
  const cap = cyl(0.15, 0.15, 0.09, metal(KIT.gold), 12);
  cap.position.set(x + (smashed ? 0.14 : 0), smashed ? 1.18 : 1.62, z);
  add(group, cap);
  addSmoke(group, x + (smashed ? 0.14 : 0), smashed ? 1.3 : 1.74, z, smashed);

  if (smashed) {
    const crack = box(0.08, 0.36, 0.05, KIT.steelDk, 0.015);
    crack.position.set(x + 0.14, 1.0, z + 0.1);
    crack.rotation.z = 0.4;
    add(group, crack);
  }

  addCrownBanner(group, x + 0.22, smashed ? 1.05 : 1.28, z + 0.02, cloth, smashed);
}

function addCrownBanner(group, x, y, z, hex, torn) {
  const arm = cyl(0.03, 0.03, 0.32, metal(KIT.gold), 8);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(x, y, z);
  add(group, arm);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), metal(KIT.gold));
  knob.position.set(x + 0.18, y, z);
  add(group, knob);

  const cloth = box(torn ? 0.16 : 0.24, torn ? 0.28 : 0.5, 0.03, hex, 0.02);
  cloth.position.set(x + 0.18, y - (torn ? 0.2 : 0.32), z);
  if (torn) cloth.rotation.z = 0.18;
  markCloth(cloth);
  markMotion(cloth, 'sway', 1);
  add(group, cloth);
  const trim = box(torn ? 0.18 : 0.26, 0.045, 0.035, KIT.bannerGold, 0.01);
  trim.position.set(x + 0.18, y - 0.04, z);
  add(group, trim);
  const gem = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.09, 4), clay(KIT.bannerGold));
  gem.position.set(x + 0.18, y - 0.28, z + 0.03);
  add(group, gem);
  if (torn) {
    const scrap = box(0.12, 0.18, 0.025, hex, 0.015);
    scrap.position.set(x + 0.22, y - 0.48, z);
    scrap.rotation.z = -0.45;
    markCloth(scrap);
    markMotion(scrap, 'sway', 1.2);
    add(group, scrap);
  }
}

function addPipesAndFeet(group, smashed) {
  [-0.08, 0.28].forEach((x) => {
    const foot = box(0.2, smashed ? 0.16 : 0.22, 0.2, KIT.stoneDk, 0.03);
    foot.position.set(x, 0.16, 0.26);
    add(group, foot);
    const riser = cyl(0.055, 0.06, smashed ? 0.18 : 0.28, metal(KIT.steel), 10);
    riser.position.set(x, smashed ? 0.28 : 0.34, 0.26);
    add(group, riser);
  });
  const uBend = cyl(0.055, 0.055, 0.38, metal(KIT.steel), 10);
  uBend.rotation.z = Math.PI / 2;
  uBend.position.set(0.1, 0.18, 0.26);
  add(group, uBend);
  const knuckleL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), metal(KIT.steel));
  knuckleL.position.set(-0.08, 0.18, 0.26);
  add(group, knuckleL);
  const knuckleR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), metal(KIT.steel));
  knuckleR.position.set(0.28, 0.18, 0.26);
  add(group, knuckleR);
}

function addLeftYard(group, bw, smashed) {
  const crateX = -bw * 0.4;
  const crate = box(0.32, smashed ? 0.1 : 0.22, 0.26, KIT.wood, 0.03);
  crate.position.set(crateX, smashed ? 0.14 : 0.2, 0.16);
  if (smashed) crate.rotation.set(0.2, 0.3, 0.1);
  add(group, crate);
  const crate2 = box(0.28, smashed ? 0.08 : 0.2, 0.22, KIT.woodDark, 0.03);
  crate2.position.set(crateX + 0.06, smashed ? 0.12 : 0.18, -0.12);
  add(group, crate2);
  for (let i = 0; i < 6; i++) {
    addCoin(group, crateX - 0.06 + (i % 3) * 0.08, smashed ? 0.18 : 0.32, 0.08 + Math.floor(i / 3) * 0.1, {
      scale: 0.9,
      spin: 0.6 + i * 0.12,
    });
  }

  const posts = [
    [-0.52, 0.42],
    [-0.52, 0.12],
    [-0.52, -0.18],
    [-0.28, 0.42],
  ];
  posts.forEach(([nx, nz], i) => {
    if (smashed && i === 1) return;
    const h = smashed && i % 2 ? 0.22 : 0.4;
    const post = box(0.08, h, 0.08, KIT.wood, 0.02);
    post.position.set(nx * bw, h / 2 + 0.08, nz);
    if (smashed) post.rotation.z = (i - 1) * 0.12;
    add(group, post);
  });
  [0.22, 0.32].forEach((yy, i) => {
    const rail = box(smashed ? 0.28 : 0.55, 0.045, 0.05, KIT.woodLight, 0.015);
    rail.position.set(-bw * 0.4, smashed ? yy - 0.04 : yy, 0.42);
    if (smashed && i === 1) rail.rotation.z = 0.4;
    add(group, rail);
    const side = box(smashed ? 0.22 : 0.5, 0.045, 0.05, KIT.wood, 0.015);
    side.position.set(-bw * 0.52, yy, 0.12);
    side.rotation.y = Math.PI / 2;
    add(group, side);
  });
}

function addBaseRocks(group, bw, bd) {
  [
    [-0.46, 0.4, 1.15],
    [-0.42, -0.38, 1.0],
    [0.44, 0.36, 1.2],
    [0.4, -0.4, 0.95],
    [0.08, -0.46, 0.85],
    [-0.1, 0.46, 0.9],
    [0.28, 0.48, 0.75],
  ].forEach(([nx, nz, s], i) => {
    addRock(group, nx * bw, 0.12, nz * bd, s, i * 0.7);
  });
  const path = box(0.28, 0.02, 0.42, '#8A7A62', 0.02);
  path.position.set(0.04, 0.1, bd * 0.28);
  add(group, path);
}

function buildCoin({ hexColor, level = 1, footprintW = 3, footprintH = 3, smashed = false }) {
  const group = new THREE.Group();
  group.userData.buildingType = 'COIN_GENERATOR';
  const { bw, bd } = houseSpan(footprintW, footprintH);
  const cloth = clothColor(hexColor, KIT.bannerBlue);

  addPlinth(group, bw, bd);
  addBaseRocks(group, bw, bd);

  const tower = box(0.78, smashed ? 0.58 : 0.88, 0.74, KIT.stoneLt, 0.06);
  tower.position.set(0.1, smashed ? 0.4 : 0.54, 0);
  add(group, tower);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const brick = box(0.24, 0.14, 0.05, (row + col) % 2 ? KIT.stone : KIT.stoneLt, 0.02);
      brick.position.set(-0.12 + col * 0.22, 0.22 + row * 0.16, 0.36);
      add(group, brick);
    }
  }
  [0.24, 0.46, 0.68].forEach((yy, i) => {
    const course = box(0.8, 0.055, 0.76, i % 2 ? KIT.stone : KIT.stoneDk, 0.02);
    course.position.set(0.1, yy, 0);
    add(group, course);
  });
  const neck = box(0.82, 0.1, 0.78, KIT.gold, 0.03);
  neck.position.set(0.1, smashed ? 0.72 : 0.96, 0);
  add(group, neck);

  addBluePorch(group, bw, smashed, level);
  addCauldron(group, smashed, level);
  addFurnace(group, smashed);
  addFrontGears(group, smashed);
  addPipesAndFeet(group, smashed);
  addConveyor(group, smashed);
  addStack(group, smashed, cloth);
  addLeftYard(group, bw, smashed);

  if (smashed) {
    addRubble(group, 0.22, 0.14, -0.16, 6);
    addRubble(group, -0.2, 0.12, 0.2, 4);
  }

  addLevelExtras(group, level, bw, bd, hexColor);
  return group;
}

export function buildIntact(opts) {
  return buildCoin({ ...opts, smashed: false });
}

export function buildDestroyed(opts) {
  const g = buildCoin({ ...opts, smashed: true });
  g.userData.ruined = true;
  return g;
}
