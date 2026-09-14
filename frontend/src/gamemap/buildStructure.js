import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GAME_COLORS } from '../colors.js';
import { TILE_SIZE, TILE_HEIGHT, TILE_PITCH, tileWorldPos, SEARCHLIGHT_TILE } from './mapConfig.js';

function clay(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.58,
    metalness: 0.05,
    ...extras,
  });
}

function markMotion(mesh, kind, amp = 1) {
  mesh.userData.motion = kind;
  mesh.userData.motionAmp = amp;
  mesh.userData.baseY = mesh.position.y;
  mesh.userData.baseRotY = mesh.rotation.y;
  return mesh;
}

/** Detailed clay houses with idle motion hooks. */
export function buildGameHouse(type, hexColor = '#C9B79A', level = 1, footprintW = 2, footprintH = 2) {
  const group = new THREE.Group();
  group.userData.buildingType = type;
  group.userData.level = level;

  const bw = footprintW * TILE_PITCH * 0.78;
  const bd = footprintH * TILE_PITCH * 0.78;
  const wallH = 0.62 + level * 0.14;
  const body = clay(hexColor);
  const wood = clay('#5C4636');
  const accent = clay('#F4A261');
  const ink = clay('#2A3A4A');
  const cream = clay('#E8DCC8');

  const plinth = new THREE.Mesh(new RoundedBoxGeometry(bw * 1.08, 0.12, bd * 1.08, 2, 0.06), cream);
  plinth.position.y = 0.06;
  plinth.receiveShadow = true;
  group.add(plinth);

  const walls = new THREE.Mesh(new RoundedBoxGeometry(bw, wallH, bd, 2, 0.1), body);
  walls.position.y = 0.12 + wallH / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  walls.userData.isBody = true;
  group.add(walls);

  const trim = new THREE.Mesh(new RoundedBoxGeometry(bw * 1.02, 0.06, bd * 1.02, 1, 0.03), wood);
  trim.position.y = 0.12 + wallH;
  group.add(trim);

  const door = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.42, 0.07, 1, 0.03), wood);
  door.position.set(0, 0.12 + 0.22, bd / 2 + 0.02);
  group.add(door);

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), accent);
  knob.position.set(0.1, 0.12 + 0.22, bd / 2 + 0.06);
  group.add(knob);

  [-0.28, 0.28].forEach((x) => {
    const win = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.16, 0.04, 1, 0.02), clay('#9BD4DE', { emissive: '#3a6a72', emissiveIntensity: 0.15 }));
    win.position.set(x, 0.12 + wallH * 0.55, bd / 2 + 0.01);
    group.add(win);
  });

  if (type === 'SLEEP_HOUSE') {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.68, 0.55, 4), ink);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.12 + wallH + 0.28;
    roof.castShadow = true;
    group.add(roof);
    const chimney = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.32, 0.16, 1, 0.03), wood);
    chimney.position.set(bw * 0.22, 0.12 + wallH + 0.45, -bd * 0.15);
    chimney.castShadow = true;
    group.add(chimney);
    const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), clay('#D0D5DA', { transparent: true, opacity: 0.55 }));
    smoke.position.set(bw * 0.22, 0.12 + wallH + 0.72, -bd * 0.15);
    markMotion(smoke, 'bob', 1.2);
    group.add(smoke);
    const moon = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 16, Math.PI * 1.4), accent);
    moon.position.set(0, 0.12 + wallH + 0.62, 0);
    moon.rotation.z = 0.4;
    markMotion(moon, 'spin', 0.6);
    group.add(moon);
  } else if (type === 'INK_HOUSE') {
    const vat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.48, 14), ink);
    vat.position.set(0, 0.12 + wallH + 0.28, 0);
    vat.castShadow = true;
    markMotion(vat, 'pulse', 0.8);
    group.add(vat);
    const drip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), ink);
    drip.position.set(0.28, 0.12 + wallH + 0.08, 0.22);
    markMotion(drip, 'bob', 1.4);
    group.add(drip);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 8), wood);
    spout.rotation.z = Math.PI / 2;
    spout.position.set(0.38, 0.12 + wallH + 0.2, 0);
    group.add(spout);
  } else if (type === 'CRAFT_HOUSE') {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.68, 0.5, 4), wood);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.12 + wallH + 0.26;
    roof.castShadow = true;
    group.add(roof);
    const chimney = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.4, 0.18, 1, 0.03), clay('#6B6560'));
    chimney.position.set(bw * 0.25, 0.12 + wallH + 0.48, -bd * 0.18);
    group.add(chimney);
    const gear = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 8, 14), accent);
    gear.position.set(0, 0.12 + wallH * 0.55, bd / 2 + 0.05);
    markMotion(gear, 'spin', 1.4);
    group.add(gear);
    const gear2 = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 12), clay('#E5B93D'));
    gear2.position.set(0.22, 0.12 + wallH * 0.45, bd / 2 + 0.05);
    markMotion(gear2, 'spin', -1.8);
    group.add(gear2);
  } else if (type === 'COIN_GENERATOR') {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.68, 0.5, 4), accent);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.12 + wallH + 0.26;
    roof.castShadow = true;
    group.add(roof);
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 18), clay(GAME_COLORS.YELLOW, { metalness: 0.35, roughness: 0.35 }));
    coin.rotation.x = Math.PI / 2;
    coin.position.set(0, 0.12 + wallH + 0.62, 0);
    coin.castShadow = true;
    markMotion(coin, 'spin', 1.6);
    group.add(coin);
    const coin2 = coin.clone();
    coin2.position.set(0.16, 0.12 + wallH + 0.52, 0.08);
    coin2.scale.setScalar(0.7);
    markMotion(coin2, 'spin', -1.2);
    group.add(coin2);
  } else {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.68, 0.5, 4), clay('#8D5CC7'));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.12 + wallH + 0.26;
    roof.castShadow = true;
    group.add(roof);
  }

  for (let i = 0; i < level; i++) {
    const pip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), accent);
    pip.position.set(-bw / 2 + 0.14 + i * 0.15, 0.18, bd / 2 + 0.05);
    markMotion(pip, 'bob', 0.5 + i * 0.15);
    group.add(pip);
  }

  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.02), accent);
  flag.position.set(bw * 0.35, 0.12 + wallH + 0.55, 0);
  markMotion(flag, 'sway', 1);
  group.add(flag);

  return group;
}

/** Collapsed clay shell — same footprint, broken walls + rubble pile. */
export function buildRuinedHouse(type, footprintW = 2, footprintH = 2) {
  const group = new THREE.Group();
  group.userData.buildingType = type;
  group.userData.ruined = true;

  const bw = footprintW * TILE_PITCH * 0.78;
  const bd = footprintH * TILE_PITCH * 0.78;
  const rubble = clay('#7A756E');
  const cracked = clay('#9A958C');
  const dark = clay('#5C574F');

  const plinth = new THREE.Mesh(new RoundedBoxGeometry(bw * 1.05, 0.1, bd * 1.05, 2, 0.05), dark);
  plinth.position.y = 0.05;
  plinth.receiveShadow = true;
  group.add(plinth);

  // Broken low walls — uneven heights
  const stubs = [
    { x: 0, z: -bd * 0.35, w: bw * 0.9, d: 0.14, h: 0.38 },
    { x: -bw * 0.35, z: 0.05, w: 0.14, d: bd * 0.55, h: 0.52 },
    { x: bw * 0.32, z: 0.1, w: 0.14, d: bd * 0.4, h: 0.28 },
  ];
  stubs.forEach((s, i) => {
    const wall = new THREE.Mesh(new RoundedBoxGeometry(s.w, s.h, s.d, 1, 0.04), i % 2 ? cracked : rubble);
    wall.position.set(s.x, 0.1 + s.h / 2, s.z);
    wall.rotation.z = (i - 1) * 0.04;
    wall.castShadow = true;
    group.add(wall);
  });

  // Rubble chunks
  for (let i = 0; i < 5; i++) {
    const chunk = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.1 + (i % 3) * 0.04, 0),
      clay(i % 2 ? '#8A8680' : '#6E6B66')
    );
    chunk.position.set((i - 2) * 0.18, 0.12, (i % 2 ? 0.2 : -0.15));
    chunk.rotation.set(i * 0.4, i * 0.7, 0);
    group.add(chunk);
  }

  // Fallen roof slab
  const slab = new THREE.Mesh(new RoundedBoxGeometry(bw * 0.55, 0.08, bd * 0.4, 1, 0.03), clay('#6B6560'));
  slab.position.set(0.15, 0.18, 0.05);
  slab.rotation.set(0.35, 0.4, 0.2);
  group.add(slab);

  // Dust puff marker
  const dust = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    clay('#C8C4BC', { transparent: true, opacity: 0.35 })
  );
  dust.position.set(-0.1, 0.45, 0);
  markMotion(dust, 'bob', 0.8);
  dust.userData.baseY = 0.45;
  group.add(dust);

  const label = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.02), clay('#F4A261'));
  label.position.set(0, 0.55, bd * 0.4);
  group.add(label);

  return group;
}

export function tickBuildingMotion(house, elapsed) {
  if (!house) return;
  house.traverse((child) => {
    const kind = child.userData?.motion;
    if (!kind) return;
    const amp = child.userData.motionAmp || 1;
    const baseY = child.userData.baseY ?? child.position.y;
    const baseRotY = child.userData.baseRotY ?? 0;
    if (kind === 'spin') child.rotation.y = baseRotY + elapsed * amp;
    else if (kind === 'bob') child.position.y = baseY + Math.sin(elapsed * 2.4 * amp) * 0.04 * amp;
    else if (kind === 'pulse') {
      const s = 1 + Math.sin(elapsed * 2.2) * 0.04 * amp;
      child.scale.setScalar(s);
    } else if (kind === 'sway') child.rotation.z = Math.sin(elapsed * 3 * amp) * 0.25;
  });
}

export function placeHouseOnTile(house, xPos, yPos, footprintW, footprintH) {
  const cx = xPos + (footprintW - 1) / 2;
  const cy = yPos + (footprintH - 1) / 2;
  const p = tileWorldPos(cx, cy);
  house.position.set(p.x, TILE_HEIGHT, p.z);
  return house;
}

export function tintBlueprint(root, ok) {
  if (!root) return;
  const hex = ok ? 0x7dce82 : 0xe63946;
  root.traverse((n) => {
    if (!n.material) return;
    const mats = Array.isArray(n.material) ? n.material : [n.material];
    mats.forEach((mat) => {
      if (mat.color) mat.color.setHex(hex);
      if (mat.emissive) {
        mat.emissive.setHex(hex);
        mat.emissiveIntensity = 0.4;
      }
      mat.transparent = true;
      mat.opacity = ok ? 0.38 : 0.5;
      mat.depthWrite = false;
    });
  });
}

/** Translucent house silhouette for relocate targeting. */
export function buildHouseBlueprint(type, hexColor = '#7dce82', level = 1, footprintW = 2, footprintH = 2) {
  const house = buildGameHouse(type, hexColor, level, footprintW, footprintH);
  house.userData.isBlueprint = true;
  house.traverse((n) => {
    n.castShadow = false;
    n.receiveShadow = false;
    n.userData.keepColor = true;
    n.userData.isBlueprint = true;
    if (n.material) {
      n.material = n.material.clone();
      n.material.transparent = true;
      n.material.opacity = 0.38;
      n.material.depthWrite = false;
    }
  });
  tintBlueprint(house, true);
  return house;
}

/** Dust puffs around a ruin while hold-F rebuild is in progress. */
export function createRebuildFX() {
  const group = new THREE.Group();
  group.name = 'RebuildFX';
  const geo = new THREE.SphereGeometry(0.07, 6, 6);
  const puffs = [];
  for (let i = 0; i < 12; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xcbb89a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.keepColor = true;
    group.add(mesh);
    puffs.push({
      mesh,
      t: Math.random(),
      speed: 0.55 + Math.random() * 0.7,
      ox: (Math.random() - 0.5) * 1.15,
      oz: (Math.random() - 0.5) * 1.15,
    });
  }
  group.visible = false;
  return { group, puffs };
}

export function tickRebuildFX(fx, dt, active, progress) {
  if (!fx) return;
  if (!active || progress < 0.02) {
    fx.group.visible = false;
    return;
  }
  fx.group.visible = true;
  fx.puffs.forEach((p) => {
    p.t += dt * p.speed;
    if (p.t > 1) p.t -= 1;
    p.mesh.position.set(p.ox, 0.08 + p.t * 1.05, p.oz);
    p.mesh.material.opacity = (1 - p.t) * 0.5 * Math.min(1, progress * 1.8);
    p.mesh.scale.setScalar(0.45 + p.t * 1.35);
  });
}

export function createGuideMarker() {
  const root = new THREE.Group();
  root.name = 'GuideMarker';
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(TILE_PITCH * 0.85, 0.055, 10, 36),
    new THREE.MeshBasicMaterial({ color: 0xf4a261, transparent: true, opacity: 0.92, depthWrite: false })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  root.add(ring);
  const chevron = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.4, 4),
    new THREE.MeshBasicMaterial({ color: 0xf4a261, transparent: true, opacity: 0.95 })
  );
  chevron.rotation.x = Math.PI;
  chevron.position.y = 1.4;
  root.add(chevron);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 1.15, 8),
    new THREE.MeshBasicMaterial({ color: 0xf4c245, transparent: true, opacity: 0.42, depthWrite: false })
  );
  beam.position.y = 0.72;
  root.add(beam);
  root.visible = false;
  root.userData.keepColor = true;
  return { root, ring, chevron, beam };
}

/** Detailed patrol robot with chase + patrol modes. */
export function createGamePatrolRobot() {
  const bot = new THREE.Group();
  bot.name = 'PatrolRobot';

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.34, 4, 12), clay('#6E6B66'));
  body.position.y = 0.48;
  body.castShadow = true;
  bot.add(body);

  const chest = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.18, 0.2, 1, 0.04), clay('#8A8680'));
  chest.position.set(0, 0.55, 0.06);
  bot.add(chest);

  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 10),
    new THREE.MeshStandardMaterial({
      color: GAME_COLORS.RED,
      emissive: new THREE.Color(GAME_COLORS.RED),
      emissiveIntensity: 0.85,
    })
  );
  eye.position.set(0, 0.72, 0.18);
  eye.userData.isEye = true;
  bot.add(eye);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 6), clay('#2A3A4A'));
  antenna.position.y = 0.95;
  bot.add(antenna);
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 8),
    new THREE.MeshStandardMaterial({ color: GAME_COLORS.YELLOW, emissive: GAME_COLORS.YELLOW, emissiveIntensity: 0.5 })
  );
  tip.position.y = 1.1;
  markMotion(tip, 'bob', 1.3);
  bot.add(tip);

  [-0.14, 0.14].forEach((x) => {
    const tread = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), clay('#2A2A2A'));
    tread.rotation.z = Math.PI / 2;
    tread.position.set(x, 0.1, 0);
    bot.add(tread);
  });

  const radius = TILE_SIZE * 2.4;
  let mode = 'patrol';
  let targetCol = SEARCHLIGHT_TILE.column;
  let targetRow = SEARCHLIGHT_TILE.row;
  let col = SEARCHLIGHT_TILE.column + 2;
  let row = SEARCHLIGHT_TILE.row;
  let catchProgress = 0;

  return {
    object: bot,
    get position() {
      return { column: col, row };
    },
    setMode(next, target) {
      mode = next;
      if (target) {
        targetCol = target.column;
        targetRow = target.row;
      }
      if (eye.material) {
        const hot = mode === 'chase' || mode === 'hit';
        eye.material.color.set(hot ? GAME_COLORS.RED : GAME_COLORS.YELLOW);
        eye.material.emissive.set(hot ? GAME_COLORS.RED : GAME_COLORS.YELLOW);
        eye.material.emissiveIntensity = hot ? 1.2 : 0.5;
      }
    },
    update(elapsed, dt = 0.016) {
      tickBuildingMotion(bot, elapsed);
      if (mode === 'patrol') {
        const a = elapsed * 0.45;
        const p = tileWorldPos(SEARCHLIGHT_TILE.column, SEARCHLIGHT_TILE.row);
        bot.position.set(p.x + Math.cos(a) * radius, TILE_HEIGHT, p.z + Math.sin(a) * radius);
        bot.rotation.y = -a - Math.PI / 2;
        col = SEARCHLIGHT_TILE.column + Math.cos(a) * 2;
        row = SEARCHLIGHT_TILE.row + Math.sin(a) * 2;
        catchProgress = 0;
        return { caught: false, hitting: false };
      }

      const speed = mode === 'hit' ? 3.2 : 2.4;
      const dx = targetCol - col;
      const dy = targetRow - row;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.05) {
        const step = speed * dt;
        col += (dx / dist) * Math.min(step, dist);
        row += (dy / dist) * Math.min(step, dist);
      }
      const p = tileWorldPos(col, row);
      bot.position.set(p.x, TILE_HEIGHT + (mode === 'hit' ? Math.sin(elapsed * 18) * 0.05 : 0), p.z);
      bot.rotation.y = Math.atan2(dx, dy);

      if (dist < 0.55) {
        catchProgress += dt;
        this.setMode('hit', { column: targetCol, row: targetRow });
        return { caught: catchProgress > 0.35, hitting: true };
      }
      catchProgress = Math.max(0, catchProgress - dt * 0.5);
      return { caught: false, hitting: false };
    },
  };
}
