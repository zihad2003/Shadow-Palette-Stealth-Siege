import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GAME_COLORS } from '../colors.js';
import { TILE_HEIGHT, TILE_PITCH, tileWorldPos, MAP_COLS, MAP_ROWS } from './mapConfig.js';
import { canEnterTile } from './occupancy.js';
import {
  ROBOT_CHASE_SPEED,
  ROBOT_HIT_SPEED,
  ROBOT_CATCH_DISTANCE,
  ROBOT_CATCH_HOLD_SECONDS,
  ROBOT_STUN_SECONDS,
} from '../raid/stealthConstants.js';
import * as sleepHouse from './houses/sleepHouse.js';
import * as craftHouse from './houses/craftHouse.js';
import * as inkHouse from './houses/inkHouse.js';
import * as coinGenerator from './houses/coinGenerator.js';
import * as jailHouse from './houses/jailHouse.js';
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
  JAIL: jailHouse,
  BASE_JAIL: jailHouse,
};

/** Concept-art clay houses. Paint (`hexColor`) tints cloth only. */
export function buildGameHouse(type, hexColor = '#C9B79A', level = 1, footprintW = 3, footprintH = 3) {
  const builder = HOUSE_BUILDERS[type] || sleepHouse;
  const group = builder.buildIntact({ hexColor, level, footprintW, footprintH });
  group.userData.buildingType = type;
  group.userData.level = level;
  group.scale.y = (type === 'JAIL' || type === 'BASE_JAIL') ? 1.05 : HOUSE_HEIGHT_SCALE;
  return group;
}

/** Type-matched smashed silhouette — not generic rubble. */
export function buildRuinedHouse(type, footprintW = 3, footprintH = 3, hexColor = '#9A958C') {
  const builder = HOUSE_BUILDERS[type] || sleepHouse;
  const group = builder.buildDestroyed({ hexColor, level: 1, footprintW, footprintH });
  group.userData.buildingType = type;
  group.userData.ruined = true;
  group.scale.y = (type === 'JAIL' || type === 'BASE_JAIL') ? 1.05 : HOUSE_HEIGHT_SCALE;
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
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.16, 8),
    new THREE.MeshBasicMaterial({ color: 0xf4a261, transparent: true, opacity: 0.95 })
  );
  tip.rotation.x = Math.PI;
  tip.position.y = -0.2;
  pin.add(tip);
  root.add(pin);

  root.visible = false;
  root.userData.keepColor = true;
  return { root, ring, disc, beam, pin, chevron: pin };
}

/** Size the ring to the house pad and sit the pin just above the roof. */
export function alignGuideMarker(marker, footprintW = 3, footprintH = 3, ruined = true) {
  if (!marker?.ring) return;
  const bw = Math.max(1, footprintW) * TILE_PITCH;
  const bd = Math.max(1, footprintH) * TILE_PITCH;
  const baseR = TILE_PITCH * 0.58;
  const sx = (bw * 0.5) / baseR;
  const sy = (bd * 0.5) / baseR;
  marker.ring.userData.sx = sx;
  marker.ring.userData.sy = sy;
  marker.disc.userData.sx = sx * 0.48;
  marker.disc.userData.sy = sy * 0.48;
  const roof = ruined ? 1.08 : 1.42;
  marker.beam.scale.set(1, roof / 1.58, 1);
  marker.beam.position.y = roof * 0.5;
  marker.pin.userData.restY = roof + 0.1;
}

const GUIDE_TINTS = {
  house: 0xf4a261,
  part: 0x8ecae6,
  garage: 0x72b83f,
};

export function tintGuideMarker(marker, kind = 'house', hex) {
  if (!marker?.ring) return;
  const color = new THREE.Color(hex || GUIDE_TINTS[kind] || GUIDE_TINTS.house);
  marker.root.userData.kind = kind;
  marker.ring.material.color.copy(color);
  marker.disc.material.color.copy(color);
  marker.beam.material.color.copy(color);
  marker.pin.children.forEach((child) => {
    if (child.material?.color && child.geometry?.type !== 'RingGeometry') child.material.color.copy(color);
  });
}

export function tickGuideMarker(marker, elapsed, camera) {
  if (!marker?.root?.visible) return;
  const wave = Math.sin(elapsed * 1.28);
  const rest = marker.pin.userData.restY ?? 1.58;
  marker.pin.position.y = rest + wave * 0.035;
  const pulse = 1 + wave * 0.025;
  const sx = marker.ring.userData.sx ?? 1;
  const sy = marker.ring.userData.sy ?? 1;
  marker.ring.scale.set(sx * pulse, sy * pulse, 1);
  if (marker.disc) {
    marker.disc.scale.set((marker.disc.userData.sx ?? 1) * pulse, (marker.disc.userData.sy ?? 1) * pulse, 1);
  }
  if (marker.disc?.material) marker.disc.material.opacity = 0.09 + wave * 0.03;
  if (marker.beam?.material) marker.beam.material.opacity = 0.16 + wave * 0.05;
  if (camera) marker.pin.quaternion.copy(camera.quaternion);
}

/** Door / floor tile in the Craft House — robot exits from here and parks back here. */
export function craftHouseHome(buildings = []) {
  const craft = (buildings || []).find((b) => b && b.buildingType === 'CRAFT_HOUSE');
  if (!craft) {
    return { column: 4, row: MAP_ROWS - 4 };
  }
  const w = Math.max(1, Number(craft.footprintWidth) || 3);
  const h = Math.max(1, Number(craft.footprintHeight) || 3);
  return {
    column: Number(craft.xPos) + (w - 1) / 2,
    row: Number(craft.yPos) + (h - 1) / 2,
  };
}

/** Yard loop around the whole fortress, inset from walls and corner houses. */
export function defaultPatrolWaypoints() {
  const inset = 6;
  const left = inset;
  const right = MAP_COLS - 1 - inset;
  const top = inset;
  const bottom = MAP_ROWS - 1 - inset;
  const midC = (MAP_COLS - 1) / 2;
  const midR = (MAP_ROWS - 1) / 2;
  return [
    { column: left, row: top },
    { column: midC, row: top },
    { column: right, row: top },
    { column: right, row: midR },
    { column: right, row: bottom },
    { column: midC, row: bottom },
    { column: left, row: bottom },
    { column: left, row: midR },
  ];
}

/** Detailed patrol robot with chase + patrol modes and state-tinted poses. */
export function createGamePatrolRobot({ home = null, parked: startParked = false } = {}) {
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
      color: GAME_COLORS.YELLOW,
      emissive: new THREE.Color(GAME_COLORS.YELLOW),
      emissiveIntensity: 0.55,
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

  const STATE_TINT = {
    patrol: { eye: GAME_COLORS.YELLOW, body: '#6E6B66', lean: 0, bob: 0.02 },
    suspicious: { eye: '#F4A261', body: '#7A6E5E', lean: 0.06, bob: 0.04 },
    alert: { eye: '#E76F51', body: '#7A5550', lean: 0.1, bob: 0.05 },
    chase: { eye: GAME_COLORS.RED, body: '#8A4545', lean: 0.14, bob: 0.08 },
    searching: { eye: '#5B8DEF', body: '#5A6570', lean: 0.04, bob: 0.06 },
    hit: { eye: GAME_COLORS.RED, body: '#A03030', lean: 0.18, bob: 0.12 },
    disabled: { eye: '#38BDF8', body: '#3A3A3A', lean: -0.22, bob: 0.005 },
  };

  const waypoints = defaultPatrolWaypoints();
  let homeCol = home?.column ?? waypoints[waypoints.length - 1].column;
  let homeRow = home?.row ?? waypoints[waypoints.length - 1].row;
  let mode = startParked ? 'park' : 'patrol';
  let wantPark = !!startParked;
  let parked = !!startParked;
  let targetCol = homeCol;
  let targetRow = homeRow;
  let col = home ? homeCol : waypoints[0].column;
  let row = home ? homeRow : waypoints[0].row;
  let catchProgress = 0;
  const nearestWp = (c, r) => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < waypoints.length; i += 1) {
      const d = Math.hypot(waypoints[i].column - c, waypoints[i].row - r);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };
  let wpIndex = nearestWp(col, row);
  let worldX = 0;
  let worldZ = 0;
  let yaw = 0;
  let primed = false;
  /** When true, pose comes from live defender updates — skip waypoint/chase AI. */
  let liveDriven = false;
  let stunTimer = 0;
  let hitReact = 0;
  let preStunMode = 'patrol';
  const impact = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.28, 16),
    new THREE.MeshBasicMaterial({ color: GAME_COLORS.YELLOW, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
  );
  impact.rotation.x = -Math.PI / 2;
  impact.position.y = 0.2;
  bot.add(impact);
  if (startParked) {
    const nest = tileWorldPos(col, row);
    worldX = nest.x;
    worldZ = nest.z;
    primed = true;
    bot.visible = false;
    bot.position.set(worldX, TILE_HEIGHT, worldZ);
  }

  const applyTint = (key) => {
    const tint = STATE_TINT[key] || STATE_TINT.patrol;
    if (eye.material) {
      eye.material.color.set(tint.eye);
      eye.material.emissive.set(tint.eye);
      eye.material.emissiveIntensity =
        key === 'chase' || key === 'hit' ? 1.35 : key === 'alert' ? 1.0 : key === 'disabled' ? 0.3 : 0.55;
    }
    if (tip.material) {
      tip.material.color.set(tint.eye);
      tip.material.emissive.set(tint.eye);
    }
    if (body.material) body.material.color.set(tint.body);
    body.rotation.x = tint.lean;
    chest.rotation.x = tint.lean * 0.6;
  };

  const lerpAngle = (a, b, t) => {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  };

  return {
    object: bot,
    get position() {
      return { column: col, row };
    },
    get chasing() {
      return (mode === 'chase' || mode === 'hit' || liveDriven) && stunTimer <= 0 && !wantPark;
    },
    get parked() {
      return parked;
    },
    setHome(next) {
      if (!next) return;
      if (next.column != null && Number.isFinite(Number(next.column))) homeCol = Number(next.column);
      if (next.row != null && Number.isFinite(Number(next.row))) homeRow = Number(next.row);
    },
    snapToHome() {
      col = homeCol;
      row = homeRow;
      const p = tileWorldPos(col, row);
      worldX = p.x;
      worldZ = p.z;
      primed = true;
      parked = true;
      wantPark = true;
      mode = 'park';
      bot.visible = false;
      bot.position.set(worldX, TILE_HEIGHT, worldZ);
    },
    get liveDriven() {
      return liveDriven;
    },
    get isStunned() {
      return stunTimer > 0;
    },
    get stunRemaining() {
      return Math.max(0, stunTimer);
    },
    stun(seconds = ROBOT_STUN_SECONDS) {
      if (mode !== 'disabled') {
        preStunMode = mode;
      }
      stunTimer = Math.max(stunTimer, Number(seconds) || ROBOT_STUN_SECONDS);
      hitReact = 0.55;
      mode = 'disabled';
      catchProgress = 0;
      applyTint('hit');
      impact.material.opacity = 0.95;
      impact.scale.set(1, 1, 1);
    },
    /** Absolute pose from a live defender (lerp in update). */
    setLivePosition(column, rowNum, snap = false) {
      liveDriven = true;
      mode = 'chase';
      applyTint('chase');
      if (column != null && Number.isFinite(Number(column))) targetCol = Number(column);
      if (rowNum != null && Number.isFinite(Number(rowNum))) targetRow = Number(rowNum);
      if (snap) {
        col = targetCol;
        row = targetRow;
        const p = tileWorldPos(col, row);
        worldX = p.x;
        worldZ = p.z;
        primed = true;
      }
    },
    clearLiveControl() {
      liveDriven = false;
    },
    /** Update chase destination without resetting mode / catch timers. */
    setChaseTarget(column, rowNum) {
      if (liveDriven) return;
      if (column != null && Number.isFinite(Number(column))) targetCol = Number(column);
      if (rowNum != null && Number.isFinite(Number(rowNum))) targetRow = Number(rowNum);
    },
    setMode(next, target) {
      const key = String(next || 'patrol').toLowerCase();
      if (key === 'park' || key === 'home') {
        wantPark = true;
        liveDriven = false;
        if (stunTimer > 0) {
          preStunMode = 'park';
          return;
        }
        if (mode === 'park' || parked) {
          applyTint('patrol');
          return;
        }
        mode = 'park';
        parked = false;
        bot.visible = true;
        applyTint('patrol');
        return;
      }
      if (stunTimer > 0) return; // Keep offline while stunned
      wantPark = false;
      const nextMode = key === 'chasing' ? 'chase' : key;
      if (target) {
        if (target.column != null) targetCol = target.column;
        if (target.row != null) targetRow = target.row;
      }
      if (parked || !bot.visible) {
        parked = false;
        bot.visible = true;
        wpIndex = nearestWp(col, row);
      }
      if (nextMode === mode) {
        applyTint(mode);
        return;
      }
      const prev = mode;
      mode = nextMode;
      if (mode !== 'hit' && prev === 'hit') catchProgress = 0;
      if (
        (mode === 'chase' || mode === 'hit') &&
        (prev === 'patrol' || prev === 'searching' || prev === 'suspicious' || prev === 'alert' || prev === 'park')
      ) {
        catchProgress = 0;
      }
      if (mode === 'patrol' || mode === 'searching' || mode === 'suspicious') {
        wpIndex = nearestWp(col, row);
      }
      applyTint(mode);
    },
    update(elapsed, dt = 0.016, solids = null) {
      tickBuildingMotion(bot, elapsed);
      const tileBlocked = (c, r, allowHome) => {
        if (!solids) return false;
        const tc = Math.round(c);
        const tr = Math.round(r);
        if (allowHome && Math.hypot(tc - homeCol, tr - homeRow) <= 1.35) return false;
        return !canEnterTile(tc, tr, solids);
      };
      const stepToward = (destC, destR, speed, allowHome) => {
        const dx = destC - col;
        const dy = destR - row;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.04) return dist;
        const step = Math.min(dist, speed * dt);
        const hereBlocked = tileBlocked(col, row, allowHome);
        const tryPos = (nc, nr) => {
          if (tileBlocked(nc, nr, allowHome) && !hereBlocked) return false;
          col = nc;
          row = nr;
          return true;
        };
        if (tryPos(col + (dx / dist) * step, row + (dy / dist) * step)) {
          return Math.hypot(destC - col, destR - row);
        }
        const horizFirst = Math.abs(dx) >= Math.abs(dy);
        const a = horizFirst
          ? [col + Math.sign(dx) * step, row]
          : [col, row + Math.sign(dy) * step];
        const b = horizFirst
          ? [col, row + Math.sign(dy) * step]
          : [col + Math.sign(dx) * step, row];
        if (tryPos(a[0], a[1]) || tryPos(b[0], b[1])) {
          return Math.hypot(destC - col, destR - row);
        }
        return dist;
      };

      // Hit pop, then 8s sleep: no walk, no catch.
      if (stunTimer > 0) {
        stunTimer -= dt;
        hitReact = Math.max(0, hitReact - dt);
        if (primed) {
          const punch = hitReact > 0 ? Math.sin((1 - hitReact / 0.55) * Math.PI) : 0;
          bot.position.set(worldX, TILE_HEIGHT + punch * 0.28, worldZ);
        }
        if (hitReact > 0) {
          applyTint('hit');
          const t = 1 - hitReact / 0.55;
          body.rotation.x = 0.42 * Math.sin(t * Math.PI);
          body.rotation.z = 0.55 * Math.sin(t * Math.PI * 2);
          chest.rotation.x = body.rotation.x * 0.7;
          impact.material.opacity = 0.9 * (1 - t);
          impact.scale.setScalar(1 + t * 2.4);
          if (eye.material) {
            eye.material.emissiveIntensity = 1.6;
            eye.material.color.set(GAME_COLORS.RED);
            eye.material.emissive.set(GAME_COLORS.RED);
          }
        } else {
          applyTint('disabled');
          const slump = 0.72 + Math.sin(elapsed * 2.2) * 0.04;
          body.rotation.x = -0.18;
          body.rotation.z = slump;
          chest.rotation.x = -0.12;
          impact.material.opacity = 0;
          if (eye.material) {
            const zzz = 0.08 + Math.max(0, Math.sin(elapsed * 1.6)) * 0.12;
            eye.material.emissiveIntensity = zzz;
            eye.material.color.set('#64748B');
            eye.material.emissive.set('#38BDF8');
          }
        }
        if (stunTimer <= 0) {
          stunTimer = 0;
          hitReact = 0;
          body.rotation.z = 0;
          impact.material.opacity = 0;
          mode = wantPark || preStunMode === 'park' ? 'park' : preStunMode === 'disabled' ? 'patrol' : (preStunMode || 'patrol');
          if (mode === 'disabled') mode = 'patrol';
          if (mode === 'park') {
            wantPark = true;
            parked = false;
            bot.visible = true;
          }
          applyTint(mode === 'park' ? 'patrol' : mode);
        }
        return {
          caught: false,
          tagged: false,
          hitting: false,
          catchProgress: 0,
          state: hitReact > 0 ? 'hit' : 'disabled',
          chasing: false,
          stunned: true,
          stunRemaining: Math.max(0, stunTimer),
        };
      }

      const tint = STATE_TINT[mode] || STATE_TINT.patrol;

      // Live defender drives the mesh — smooth lerp toward last reported tile.
      if (liveDriven) {
        const dx = targetCol - col;
        const dy = targetRow - row;
        let dist = Math.hypot(dx, dy);
        if (dist > 0.02) {
          dist = stepToward(targetCol, targetRow, ROBOT_HIT_SPEED * 1.35, false);
        }
        const p = tileWorldPos(col, row);
        const follow = 1 - Math.exp(-14 * dt);
        if (!primed) {
          worldX = p.x;
          worldZ = p.z;
          primed = true;
        }
        worldX += (p.x - worldX) * follow;
        worldZ += (p.z - worldZ) * follow;
        const face = dist > 0.02 ? Math.atan2(dx, dy) : yaw;
        yaw = lerpAngle(yaw, face, follow);
        bot.position.set(worldX, TILE_HEIGHT + Math.sin(elapsed * 10) * tint.bob, worldZ);
        bot.rotation.y = yaw;
        return { caught: false, tagged: false, hitting: false, state: 'chase', chasing: true, live: true };
      }

      if (mode === 'park') {
        const dx = homeCol - col;
        const dy = homeRow - row;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.14) {
          parked = true;
          col = homeCol;
          row = homeRow;
          const p = tileWorldPos(col, row);
          worldX = p.x;
          worldZ = p.z;
          bot.position.set(worldX, TILE_HEIGHT, worldZ);
          bot.visible = false;
          catchProgress = 0;
          return { caught: false, hitting: false, state: 'park', chasing: false, parked: true };
        }
        stepToward(homeCol, homeRow, 1.55, true);
        const p = tileWorldPos(col, row);
        if (!primed) {
          worldX = p.x;
          worldZ = p.z;
          primed = true;
        }
        const follow = 1 - Math.exp(-7 * dt);
        worldX += (p.x - worldX) * follow;
        worldZ += (p.z - worldZ) * follow;
        yaw = lerpAngle(yaw, Math.atan2(dx, dy), follow);
        bot.visible = true;
        bot.position.set(worldX, TILE_HEIGHT + Math.sin(elapsed * 7) * 0.03, worldZ);
        bot.rotation.y = yaw;
        catchProgress = 0;
        return { caught: false, hitting: false, state: 'park', chasing: false, parked: false };
      }

      // Idle orbits only — never while chasing.
      if (mode === 'patrol' || mode === 'searching' || mode === 'suspicious') {
        const speed = mode === 'searching' ? 1.6 : mode === 'suspicious' ? 1.1 : 0.85;
        let dest = waypoints[wpIndex];
        let skips = 0;
        while (dest && tileBlocked(dest.column, dest.row, false) && skips < waypoints.length) {
          wpIndex = (wpIndex + 1) % waypoints.length;
          dest = waypoints[wpIndex];
          skips += 1;
        }
        const dx = dest.column - col;
        const dy = dest.row - row;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.08) {
          wpIndex = (wpIndex + 1) % waypoints.length;
        } else {
          stepToward(dest.column, dest.row, speed, false);
        }
        const p = tileWorldPos(col, row);
        if (!primed) {
          worldX = p.x;
          worldZ = p.z;
          primed = true;
        }
        const follow = 1 - Math.exp(-(mode === 'searching' ? 8 : 5) * dt);
        worldX += (p.x - worldX) * follow;
        worldZ += (p.z - worldZ) * follow;
        const face = Math.atan2(dx, dy);
        yaw = lerpAngle(yaw, face, follow);
        bot.position.set(worldX, TILE_HEIGHT + Math.sin(elapsed * 6) * tint.bob, worldZ);
        bot.rotation.y = yaw;
        catchProgress = 0;
        return { caught: false, hitting: false, state: mode, chasing: false };
      }

      if (mode === 'alert') {
        const p = tileWorldPos(col, row);
        worldX += (p.x - worldX) * 0.2;
        worldZ += (p.z - worldZ) * 0.2;
        const face = Math.atan2(targetCol - col, targetRow - row);
        yaw = lerpAngle(yaw, face, 1 - Math.exp(-6 * dt));
        bot.position.set(worldX, TILE_HEIGHT + Math.sin(elapsed * 14) * 0.04, worldZ);
        bot.rotation.y = yaw;
        body.rotation.x = 0.12 + Math.sin(elapsed * 10) * 0.04;
        return { caught: false, hitting: false, state: mode, chasing: false };
      }

      // CHASE / HIT — full map, no beam-range limit.
      const speed = mode === 'hit' ? ROBOT_HIT_SPEED : ROBOT_CHASE_SPEED;
      const dx = targetCol - col;
      const dy = targetRow - row;
      let dist = Math.hypot(dx, dy);
      if (dist > 0.04) {
        dist = stepToward(targetCol, targetRow, speed, false);
        col = Math.max(0.5, Math.min(MAP_COLS - 1.5, col));
        row = Math.max(0.5, Math.min(MAP_ROWS - 1.5, row));
        dist = Math.hypot(targetCol - col, targetRow - row);
      }
      const p = tileWorldPos(col, row);
      const follow = 1 - Math.exp(-16 * dt);
      if (!primed) {
        worldX = p.x;
        worldZ = p.z;
        primed = true;
      }
      worldX += (p.x - worldX) * follow;
      worldZ += (p.z - worldZ) * follow;
      const face = dist > 0.02 ? Math.atan2(dx, dy) : yaw;
      yaw = lerpAngle(yaw, face, follow);
      bot.position.set(
        worldX,
        TILE_HEIGHT + (mode === 'hit' ? Math.sin(elapsed * 18) * 0.05 : Math.sin(elapsed * 10) * tint.bob),
        worldZ
      );
      bot.rotation.y = yaw;

      const near = dist <= ROBOT_CATCH_DISTANCE;
      if (near) {
        catchProgress += dt;
        if (mode !== 'hit') {
          mode = 'hit';
          applyTint('hit');
        }
        const locked = catchProgress >= ROBOT_CATCH_HOLD_SECONDS;
        return {
          caught: locked,
          tagged: locked,
          hitting: true,
          catchProgress,
          state: 'hit',
          chasing: true,
        };
      }
      if (mode === 'hit') {
        mode = 'chase';
        applyTint('chase');
      }
      catchProgress = Math.max(0, catchProgress - dt * 0.8);
      return { caught: false, tagged: false, hitting: false, catchProgress, state: 'chase', chasing: true };
    },
  };
}
