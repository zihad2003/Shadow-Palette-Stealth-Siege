import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TILE_HEIGHT, TILE_PITCH, tileWorldPos, SEARCHLIGHT_TILE } from './mapConfig.js';
import { GAME_COLORS, GAME_COLOR_KEYS } from '../colors.js';
import { DEFAULT_SEARCHLIGHT_LEVEL, SEARCHLIGHT_LEVELS, searchlightSpec } from '../raid/stealthConstants.js';

const CREAM = '#E4D6B8';
const STONE = '#C4B89A';
const STONE_DK = '#9A917C';
const WOOD = '#5C4636';
const GOLD = '#F4C245';
const BRASS = '#C9A227';
const IRON = '#3A3630';
const LAMP = '#FFC85A';
const BANNER = '#D5453C';

function clay(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.58,
    metalness: 0.05,
    ...extras,
  });
}

function metal(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.32,
    metalness: 0.55,
    ...extras,
  });
}

function glow(hex, intensity = 1.8) {
  const mat = new THREE.MeshStandardMaterial({
    color: hex,
    emissive: new THREE.Color(hex),
    emissiveIntensity: intensity,
    roughness: 0.18,
    metalness: 0.08,
  });
  return mat;
}

function keep(mesh) {
  mesh.userData.keepColor = true;
  return mesh;
}

function shadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function banner(hex, w = 0.12, h = 0.38) {
  const g = new THREE.Group();
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w, h), clay(hex, { side: THREE.DoubleSide }));
  cloth.position.y = -h / 2;
  keep(cloth);
  g.add(cloth);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(w * 0.28, 0.08, 4), clay(hex));
  tip.position.y = -h - 0.03;
  keep(tip);
  g.add(tip);
  return g;
}

function goldRing(radius, tube, y) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 8, 24),
    metal(GOLD, { emissive: '#6A5010', emissiveIntensity: 0.18 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = y;
  keep(ring);
  return ring;
}

function windowGlow(w, h, hex = '#9BD4DE') {
  const pane = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, 0.04, 1, 0.015),
    clay(hex, { emissive: hex, emissiveIntensity: 0.35 })
  );
  keep(pane);
  return pane;
}

/** L1 — clay garden lantern: squat, warm, readable. */
function buildLanternL1(root) {
  const plinth = shadow(new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.16, 1.15, 3, 0.08), clay(CREAM)));
  plinth.position.y = 0.08;
  root.add(plinth);
  root.add(goldRing(0.48, 0.03, 0.17));

  const step = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.14, 8), clay(STONE)));
  step.position.y = 0.23;
  root.add(step);

  const post = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.42, 8), clay(WOOD)));
  post.position.y = 0.5;
  root.add(post);

  const house = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.42, 0.52, 2, 0.06), clay(STONE)));
  house.position.y = 0.9;
  root.add(house);

  [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((a) => {
    const pane = windowGlow(0.2, 0.22, '#FFE7A8');
    pane.position.set(Math.sin(a) * 0.27, 0.9, Math.cos(a) * 0.27);
    pane.rotation.y = a;
    root.add(pane);
  });

  const roof = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.28, 8), clay(BANNER)));
  roof.position.y = 1.24;
  root.add(roof);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), metal(GOLD));
  finial.position.y = 1.4;
  keep(finial);
  root.add(finial);

  [-0.42, 0.42].forEach((x) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.55, 6), clay(WOOD));
    pole.position.set(x, 0.5, 0.38);
    root.add(pole);
    const flag = banner(x > 0 ? GAME_COLORS.YELLOW : BANNER, 0.1, 0.28);
    flag.position.set(x, 0.72, 0.38);
    root.add(flag);
  });

  return { headY: 0.9, lensZ: 0.4, tilt: 8 };
}

/** L2 — octagonal watch turret with brass lamp. */
function buildTurretL2(root) {
  const terrace = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.8, 0.14, 8), clay(CREAM)));
  terrace.position.y = 0.07;
  root.add(terrace);
  root.add(goldRing(0.68, 0.035, 0.15));

  const base = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 0.38, 8), clay(STONE)));
  base.position.y = 0.32;
  root.add(base);

  const shaft = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 1.05, 8), clay(CREAM)));
  shaft.position.y = 1.02;
  root.add(shaft);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const hex = GAME_COLORS[GAME_COLOR_KEYS[i % 5]];
    const pane = windowGlow(0.14, 0.2, hex);
    pane.position.set(Math.sin(a) * 0.36, 1.05, Math.cos(a) * 0.36);
    pane.rotation.y = a;
    root.add(pane);
  }

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.08, 8), metal(BRASS));
  belt.position.y = 1.48;
  keep(belt);
  root.add(belt);

  const balcony = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.5, 0.07, 8), clay(STONE_DK)));
  balcony.position.y = 1.58;
  root.add(balcony);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6), metal(GOLD));
    post.position.set(Math.sin(a) * 0.48, 1.72, Math.cos(a) * 0.48);
    keep(post);
    root.add(post);
  }
  root.add(goldRing(0.5, 0.02, 1.84));

  const eaves = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.2, 8), clay(BANNER)));
  eaves.position.y = 1.72;
  root.add(eaves);

  return { headY: 1.92, lensZ: 0.48, tilt: 10 };
}

/** L3 — paint lighthouse: terraces, stained windows, crystal lantern. */
function buildLighthouseL3(root) {
  const plaza = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.14, 16), clay(CREAM)));
  plaza.position.y = 0.07;
  root.add(plaza);
  root.add(goldRing(0.92, 0.04, 0.15));

  const step = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.82, 0.22, 12), clay(STONE)));
  step.position.y = 0.24;
  root.add(step);

  const lower = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.58, 0.7, 12), clay(CREAM)));
  lower.position.y = 0.68;
  root.add(lower);

  const mid = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 1.15, 12), clay(STONE)));
  mid.position.y = 1.58;
  root.add(mid);

  GAME_COLOR_KEYS.forEach((key, i) => {
    const a = (i / 5) * Math.PI * 2;
    const pane = windowGlow(0.16, 0.28, GAME_COLORS[key]);
    pane.position.set(Math.sin(a) * 0.38, 1.15, Math.cos(a) * 0.38);
    pane.rotation.y = a;
    root.add(pane);

    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.055),
      clay(GAME_COLORS[key], { emissive: GAME_COLORS[key], emissiveIntensity: 0.55 })
    );
    gem.position.set(Math.sin(a) * 0.96, 0.22, Math.cos(a) * 0.96);
    keep(gem);
    root.add(gem);
  });

  [0.95, 1.45, 1.95].forEach((y) => root.add(goldRing(y < 1.2 ? 0.48 : 0.36, 0.025, y)));

  const balcony = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.58, 0.1, 14), clay(CREAM)));
  balcony.position.y = 2.18;
  root.add(balcony);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.26, 6), metal(GOLD));
    post.position.set(Math.sin(a) * 0.58, 2.34, Math.cos(a) * 0.58);
    keep(post);
    root.add(post);
    if (i % 2 === 0) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glow(LAMP, 1.4));
      lamp.position.set(Math.sin(a) * 0.58, 2.5, Math.cos(a) * 0.58);
      keep(lamp);
      root.add(lamp);
    }
  }
  root.add(goldRing(0.6, 0.022, 2.48));

  const neck = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.28, 12), clay(STONE_DK)));
  neck.position.y = 2.42;
  root.add(neck);

  return { headY: 2.62, lensZ: 0.42, tilt: 8 };
}

function buildHeadL1(pivot, lensZ) {
  const lenses = [];
  const cage = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.3, 0.4, 2, 0.05), clay(IRON)));
  cage.position.z = 0.04;
  pivot.add(cage);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), glow(LAMP, 2.0));
  glass.position.z = 0.12;
  keep(glass);
  pivot.add(glass);
  lenses.push(glass);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.13, 22), glow('#FFE7A8', 2.2));
  lens.position.z = lensZ;
  keep(lens);
  pivot.add(lens);
  lenses.push(lens);
  const hood = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.1, 12), metal(BRASS)));
  hood.rotation.x = Math.PI / 2;
  hood.position.z = lensZ - 0.08;
  keep(hood);
  pivot.add(hood);
  return lenses;
}

function buildHeadL2(pivot, lensZ) {
  const lenses = [];
  const yoke = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 18, Math.PI), metal(BRASS)));
  yoke.rotation.z = Math.PI / 2;
  keep(yoke);
  pivot.add(yoke);

  const drum = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.48, 14), clay(IRON)));
  drum.rotation.x = Math.PI / 2;
  drum.position.z = 0.08;
  pivot.add(drum);

  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), glow(LAMP, 2.2));
  glass.position.z = 0.14;
  keep(glass);
  pivot.add(glass);
  lenses.push(glass);

  const hood = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.2, 14, 1, true), metal(BRASS)));
  hood.rotation.x = -Math.PI / 2;
  hood.position.z = 0.36;
  keep(hood);
  pivot.add(hood);

  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.16, 26), glow('#FFE7A8', 2.4));
  lens.position.z = lensZ;
  keep(lens);
  pivot.add(lens);
  lenses.push(lens);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 22), metal(GOLD));
  rim.position.z = lensZ - 0.02;
  keep(rim);
  pivot.add(rim);
  return lenses;
}

function buildHeadL3(pivot, lensZ) {
  const lenses = [];
  const cradle = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 10, 22), metal(GOLD)));
  cradle.rotation.z = Math.PI / 2;
  keep(cradle);
  pivot.add(cradle);

  const crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), glow('#FFE08A', 2.6));
  crystal.position.z = 0.06;
  keep(crystal);
  pivot.add(crystal);
  lenses.push(crystal);

  const dish = shadow(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
      metal('#8A8070', { roughness: 0.25 })
    )
  );
  dish.rotation.x = Math.PI;
  dish.position.z = -0.12;
  pivot.add(dish);

  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.2, 28), glow('#FFF3C4', 2.8));
  lens.position.z = lensZ;
  keep(lens);
  pivot.add(lens);
  lenses.push(lens);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.03, 8, 24), metal(GOLD));
  rim.position.z = lensZ - 0.01;
  keep(rim);
  pivot.add(rim);

  const cap = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 8), clay(BANNER)));
  cap.position.y = 0.32;
  pivot.add(cap);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), glow(GOLD, 1.6));
  star.position.y = 0.46;
  keep(star);
  pivot.add(star);

  return lenses;
}

function makeCone(range, halfRad, opacity) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffe08a,
    transparent: true,
    opacity,
    side: THREE.FrontSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(halfRad) * range, range, 36, 1, true), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.z = range / 2 + 0.2;
  mesh.userData.keepColor = true;
  mesh.userData.isBeam = true;
  return { mesh, mat };
}

function wedgeGeometry(range, angleDeg) {
  const shape = new THREE.Shape();
  const half = THREE.MathUtils.degToRad(angleDeg / 2);
  const steps = 22;
  shape.moveTo(0, 0);
  for (let i = 0; i <= steps; i++) {
    const a = -half + (2 * half * i) / steps;
    shape.lineTo(Math.sin(a) * range, -Math.cos(a) * range);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

/** Pie slice on the tiles — this is the light you actually see sweeping. */
function makeGroundWedge(range, angleDeg) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffe08a,
    transparent: true,
    opacity: 0.38,
    side: THREE.FrontSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(wedgeGeometry(range, angleDeg), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.055;
  mesh.userData.keepColor = true;
  mesh.userData.isBeam = true;
  return { mesh, mat };
}

/**
 * Center-board searchlight. Tower stays put; only the lamp head sweeps.
 * L1 lantern · L2 turret · L3 lighthouse. Radius 50 / 75 / 100%.
 */
export function createSearchlight({ level = DEFAULT_SEARCHLIGHT_LEVEL } = {}) {
  const spec = searchlightSpec(level);
  const root = new THREE.Group();
  root.name = 'Searchlight';
  root.userData.isSearchlight = true;
  root.userData.keepColor = true;

  const pos = tileWorldPos(SEARCHLIGHT_TILE.column, SEARCHLIGHT_TILE.row);
  root.position.set(pos.x, TILE_HEIGHT, pos.z);

  const tower =
    spec.level >= 3 ? buildLighthouseL3(root) : spec.level === 2 ? buildTurretL2(root) : buildLanternL1(root);

  // Yaw around world-up, THEN tilt the head — same as before the redesign.
  // Putting both on one Euler made the beam nod into the sky as it swept.
  const yawGroup = new THREE.Group();
  root.add(yawGroup);

  const headPivot = new THREE.Group();
  headPivot.position.y = tower.headY;
  headPivot.rotation.x = THREE.MathUtils.degToRad(tower.tilt);
  yawGroup.add(headPivot);

  const lenses =
    spec.level >= 3
      ? buildHeadL3(headPivot, tower.lensZ)
      : spec.level === 2
        ? buildHeadL2(headPivot, tower.lensZ)
        : buildHeadL1(headPivot, tower.lensZ);

  const rangeWorld = spec.rangeTiles * TILE_PITCH;
  const halfRad = THREE.MathUtils.degToRad(spec.coneAngleDeg / 2);

  const wedge = makeGroundWedge(rangeWorld, spec.coneAngleDeg);
  yawGroup.add(wedge.mesh);

  const inner = makeCone(rangeWorld, halfRad * 0.5, 0.2);
  const outer = makeCone(rangeWorld, halfRad, 0.09);
  headPivot.add(inner.mesh);
  headPivot.add(outer.mesh);

  const spot = new THREE.SpotLight(0xffe08a, spec.spotIntensity * 6, rangeWorld + 4, halfRad, 0.32, 0.7);
  spot.position.set(0, 0, 0.18);
  spot.target.position.set(0, -rangeWorld * 0.12, rangeWorld);
  spot.castShadow = false;
  spot.userData.keepColor = true;
  headPivot.add(spot);
  headPivot.add(spot.target);

  const lampGlow = new THREE.PointLight(0xffe08a, spec.spotIntensity * 2.2, 8, 1.4);
  lampGlow.position.set(0, 0, 0.2);
  lampGlow.userData.keepColor = true;
  headPivot.add(lampGlow);

  let yaw = 180;
  let lastAlarm = false;
  let detectFlash = 0;

  const applyBeamRange = (tiles) => {
    const range = tiles * TILE_PITCH;
    [inner, outer].forEach((c, i) => {
      const ang = i === 0 ? halfRad * 0.5 : halfRad;
      c.mesh.geometry.dispose();
      c.mesh.geometry = new THREE.ConeGeometry(Math.tan(ang) * range, range, 36, 1, true);
      c.mesh.position.z = range / 2 + 0.2;
    });
    wedge.mesh.geometry.dispose();
    wedge.mesh.geometry = wedgeGeometry(range, spec.coneAngleDeg);
    spot.distance = range + 4;
    spot.target.position.set(0, -range * 0.12, range);
  };

  return {
    object: root,
    level: spec.level,
    spec,
    get beamAngleDeg() {
      return yaw;
    },
    get coneAngleDeg() {
      return spec.coneAngleDeg;
    },
    get rangeTiles() {
      return spec.rangeTiles;
    },
    /** Brief red flash when the beam catches a mismatched player. */
    flashDetect(strength = 1) {
      detectFlash = Math.max(detectFlash, 0.55 * strength);
    },
    update(dt, { alarm = false } = {}) {
      const extra = alarm ? spec.alarmRangeBonus : 0;
      if (alarm !== lastAlarm) {
        applyBeamRange(spec.rangeTiles + extra);
        lastAlarm = alarm;
      }
      const sweepMult = alarm ? 1.28 : 1;
      yaw = (yaw + spec.sweepDegPerSec * sweepMult * dt) % 360;
      yawGroup.rotation.y = THREE.MathUtils.degToRad(yaw);

      detectFlash = Math.max(0, detectFlash - dt * 2.4);
      const flashing = detectFlash > 0.02;
      const hot = flashing ? 0xff3b2e : alarm ? 0xff6b5a : 0xffe08a;
      const flashBoost = flashing ? 1 + detectFlash * 2.2 : 1;

      inner.mat.color.set(hot);
      outer.mat.color.set(hot);
      inner.mat.opacity = (alarm ? 0.34 : 0.2) * (flashing ? 1.35 : 1);
      outer.mat.opacity = (alarm ? 0.16 : 0.09) * (flashing ? 1.4 : 1);
      wedge.mat.color.set(hot);
      wedge.mat.opacity = (alarm ? 0.55 : 0.38) * (flashing ? 1.25 : 1);
      lenses.forEach((lens) => {
        lens.material.emissive.set(flashing ? '#FF2A1A' : alarm ? '#E74C3C' : '#FFC85A');
        lens.material.emissiveIntensity =
          (alarm ? 3.0 : spec.level >= 3 ? 2.7 : 2.1) * flashBoost;
      });
      spot.color.set(hot);
      spot.intensity = (alarm ? spec.spotIntensity * 8 : spec.spotIntensity * 6) * flashBoost;
      lampGlow.color.set(hot);
      lampGlow.intensity =
        (alarm ? spec.spotIntensity * 3.2 : spec.spotIntensity * 2.2) * flashBoost;
    },
  };
}

export { SEARCHLIGHT_LEVELS };
