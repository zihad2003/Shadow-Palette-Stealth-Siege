import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GAME_COLORS } from '../colors.js';
import { TILE_SIZE, TILE_HEIGHT, TILE_PITCH, tileWorldPos, SEARCHLIGHT_TILE } from './mapConfig.js';
import * as sleepHouse from './houses/sleepHouse.js';
import * as craftHouse from './houses/craftHouse.js';
import * as inkHouse from './houses/inkHouse.js';
import * as coinGenerator from './houses/coinGenerator.js';
import { HOUSE_HEIGHT_SCALE } from './houseKit.js';

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

const HOUSE_BUILDERS = {
  SLEEP_HOUSE: sleepHouse,
  CRAFT_HOUSE: craftHouse,
  INK_HOUSE: inkHouse,
  COIN_GENERATOR: coinGenerator,
};

/** Concept-art clay houses. Paint (`hexColor`) tints cloth only. */
export function buildGameHouse(type, hexColor = '#C9B79A', level = 1, footprintW = 3, footprintH = 3) {
  const builder = HOUSE_BUILDERS[type] || sleepHouse;
  const group = builder.buildIntact({ hexColor, level, footprintW, footprintH });
  group.userData.buildingType = type;
  group.userData.level = level;
  group.scale.y = HOUSE_HEIGHT_SCALE;
  return group;
}

/** Type-matched smashed silhouette — not generic rubble. */
export function buildRuinedHouse(type, footprintW = 3, footprintH = 3, hexColor = '#9A958C') {
  const builder = HOUSE_BUILDERS[type] || sleepHouse;
  const group = builder.buildDestroyed({ hexColor, level: 1, footprintW, footprintH });
  group.userData.buildingType = type;
  group.userData.ruined = true;
  group.scale.y = HOUSE_HEIGHT_SCALE;
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
    if (kind === 'spin') child.rotation.y = baseRotY + elapsed * amp * 0.55;
    else if (kind === 'bob') child.position.y = baseY + Math.sin(elapsed * 1.45 * amp) * 0.016 * amp;
    else if (kind === 'pulse') {
      const s = 1 + Math.sin(elapsed * 1.25) * 0.016 * amp;
      child.scale.setScalar(s);
    } else if (kind === 'sway') child.rotation.z = Math.sin(elapsed * 1.35 * amp) * 0.07;
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
export function buildHouseBlueprint(type, hexColor = '#7dce82', level = 1, footprintW = 3, footprintH = 3) {
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
    new THREE.TorusGeometry(TILE_PITCH * 0.58, 0.016, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0xf4a261, transparent: true, opacity: 0.72, depthWrite: false })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.032;
  root.add(ring);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(TILE_PITCH * 0.28, 32),
    new THREE.MeshBasicMaterial({
      color: 0xf4a261,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.026;
  root.add(disc);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.026, 1.58, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xf4a261,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  beam.position.y = 0.82;
  root.add(beam);

  const pin = new THREE.Group();
  pin.position.y = 1.58;
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.1, 0),
    new THREE.MeshBasicMaterial({ color: 0xf4a261, transparent: true, opacity: 0.96 })
  );
  diamond.scale.set(0.78, 1.18, 0.78);
  pin.add(diamond);
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.13, 0.165, 28),
    new THREE.MeshBasicMaterial({
      color: 0xf1faee,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  pin.add(halo);
  root.add(pin);

  root.visible = false;
  root.userData.keepColor = true;
  return { root, ring, disc, beam, pin, chevron: pin };
}

export function tickGuideMarker(marker, elapsed, camera) {
  if (!marker?.root?.visible) return;
  const wave = Math.sin(elapsed * 1.28);
  marker.pin.position.y = 1.58 + wave * 0.04;
  marker.ring.scale.set(1 + wave * 0.03, 1 + wave * 0.03, 1);
  if (marker.disc?.material) marker.disc.material.opacity = 0.09 + wave * 0.03;
  if (marker.beam?.material) marker.beam.material.opacity = 0.16 + wave * 0.05;
  if (camera) marker.pin.quaternion.copy(camera.quaternion);
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
