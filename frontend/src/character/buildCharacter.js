import * as THREE from 'three';
import { COLORS, GAME_COLORS, CLAY_SKIN, hexForColor } from '../colors.js';

function clayMat(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.48,
    metalness: 0.05,
    ...extras,
  });
}

function markCamo(mesh) {
  mesh.userData.isCamo = true;
  return mesh;
}

function addShadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Compact clay mitt — local space: wrist at y=0, fingers toward -Y.
 * @param {1|-1} side 1 = right, -1 = left
 */
function createHand(inkMat, camoMat, side = 1) {
  const hand = new THREE.Group();
  hand.name = side > 0 ? 'RightHand' : 'LeftHand';

  const glove = inkMat.clone();
  const trim = camoMat.clone();

  // Sleeve overlaps forearm tip so the join reads solid
  const wrist = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.065, 0.07, 12), glove));
  wrist.position.y = 0.02;
  hand.add(wrist);

  const palm = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.05, 4, 10), glove));
  palm.position.set(0, -0.055, 0.012);
  palm.scale.set(1.2, 1, 0.88);
  hand.add(palm);

  const cushion = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), trim));
  markCamo(cushion);
  cushion.position.set(0, -0.055, 0.048);
  cushion.scale.set(1.35, 1.15, 0.45);
  hand.add(cushion);

  const fingers = [
    { x: -0.034, len: 0.08, r: 0.014 },
    { x: -0.011, len: 0.09, r: 0.015 },
    { x: 0.011, len: 0.085, r: 0.014 },
    { x: 0.032, len: 0.07, r: 0.012 },
  ];

  fingers.forEach((f, i) => {
    const digit = new THREE.Group();
    digit.position.set(f.x * side, -0.1, 0.012);
    digit.rotation.z = f.x * side * 0.55;
    digit.rotation.x = 0.5 + i * 0.04;

    const bone = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(f.r, f.len * 0.5, 3, 8), glove));
    bone.position.y = -f.len * 0.32;
    digit.add(bone);

    const tip = addShadow(new THREE.Mesh(new THREE.SphereGeometry(f.r * 1.05, 8, 6), glove));
    tip.position.y = -f.len * 0.68;
    digit.add(tip);

    hand.add(digit);
  });

  const thumb = new THREE.Group();
  thumb.position.set(-0.048 * side, -0.025, 0.032);
  thumb.rotation.set(0.85, side * 0.5, side * -0.12);

  const thumbBone = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.045, 3, 8), glove));
  thumbBone.position.y = -0.03;
  thumb.add(thumbBone);

  const thumbTip = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), glove));
  thumbTip.position.y = -0.068;
  thumb.add(thumbTip);

  hand.add(thumb);
  return hand;
}

function createArm(camoMat, inkMat, side = 1) {
  const arm = new THREE.Group();
  arm.name = side > 0 ? 'RightArm' : 'LeftArm';

  const upperMat = camoMat.clone();
  const foreMat = camoMat.clone();

  // Shoulder ball — sits in torso socket
  const shoulder = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), upperMat));
  markCamo(shoulder);
  shoulder.position.set(0, 0, 0);
  arm.add(shoulder);

  // Upper arm hangs from shoulder; capsule centered so ends meet joints
  const upper = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.34, 4, 12), upperMat.clone()));
  markCamo(upper);
  upper.position.set(0, -0.2, 0);
  arm.add(upper);

  // Elbow joint plugs the gap between capsules
  const elbow = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), upperMat.clone()));
  markCamo(elbow);
  elbow.position.set(0, -0.4, 0);
  arm.add(elbow);

  // Forearm group pivoted at elbow so hand rides with it
  const forearmGroup = new THREE.Group();
  forearmGroup.position.set(0, -0.4, 0);
  forearmGroup.rotation.z = side * 0.18;
  forearmGroup.rotation.x = 0.12;
  arm.add(forearmGroup);

  const forearm = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 12), foreMat));
  markCamo(forearm);
  forearm.position.set(0, -0.18, 0);
  forearmGroup.add(forearm);

  // Wrist ball — bridges forearm tip into mitt
  const wristBall = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), inkMat.clone()));
  wristBall.position.set(0, -0.36, 0);
  forearmGroup.add(wristBall);

  // Hand attached at wrist — no world gap
  const hand = createHand(inkMat, camoMat, side);
  hand.position.set(0, -0.4, 0.01);
  hand.rotation.set(0.25, 0, 0);
  forearmGroup.add(hand);

  // Rest pose: whole arm drops from shoulder with mild outward angle
  arm.rotation.z = side * 0.55;
  arm.rotation.x = 0.08;

  return arm;
}

export function markKeepColor(object) {
  object.userData.keepColor = true;
  object.userData.isAttacker = true;
  object.traverse((child) => {
    child.userData.keepColor = true;
    child.userData.isAttacker = true;
  });
}

function buildCore(camo, skin, ink) {
  const root = new THREE.Group();
  root.name = 'CoreFigure';

  // Pelvis / hips
  const hips = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), camo.clone()));
  markCamo(hips);
  hips.position.y = 0.52;
  hips.scale.set(1.05, 0.72, 0.9);
  root.add(hips);

  // Torso — slightly tapered clay chest
  const torso = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.42, 6, 16), camo.clone()));
  markCamo(torso);
  torso.position.y = 0.98;
  root.add(torso);

  // Chest plate accent
  const chest = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.18), camo.clone()));
  markCamo(chest);
  chest.position.set(0, 1.08, 0.22);
  chest.rotation.x = -0.12;
  root.add(chest);

  // Neck
  const neck = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 12), skin));
  neck.position.y = 1.38;
  root.add(neck);

  // Head
  const head = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 20), skin));
  head.position.y = 1.62;
  root.add(head);

  // Ears
  const earGeo = new THREE.SphereGeometry(0.07, 10, 10);
  const leftEar = addShadow(new THREE.Mesh(earGeo, skin));
  leftEar.position.set(-0.28, 1.62, 0);
  leftEar.scale.set(0.55, 1, 0.7);
  const rightEar = leftEar.clone();
  rightEar.position.x = 0.28;
  root.add(leftEar, rightEar);

  // Eyes
  const eyeWhite = clayMat('#F8F4EC');
  const pupil = ink;
  [-0.1, 0.1].forEach((x) => {
    const socket = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), eyeWhite));
    socket.position.set(x, 1.64, 0.24);
    root.add(socket);
    const iris = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), pupil));
    iris.position.set(x, 1.645, 0.285);
    root.add(iris);
  });

  // Soft brow ridge
  const brow = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.08), skin));
  brow.position.set(0, 1.72, 0.22);
  root.add(brow);

  // Continuous arms (shoulder → elbow → wrist → hand) — no floating segments
  const leftArm = createArm(camo, ink, -1);
  leftArm.position.set(-0.4, 1.22, 0);
  const rightArm = createArm(camo, ink, 1);
  rightArm.position.set(0.4, 1.22, 0);
  root.add(leftArm, rightArm);

  // Thighs
  const thighGeo = new THREE.CapsuleGeometry(0.11, 0.28, 4, 10);
  const leftThigh = addShadow(new THREE.Mesh(thighGeo, camo.clone()));
  markCamo(leftThigh);
  leftThigh.position.set(-0.16, 0.3, 0.02);
  const rightThigh = leftThigh.clone();
  rightThigh.position.x = 0.16;
  markCamo(rightThigh);
  root.add(leftThigh, rightThigh);

  // Shins
  const shinGeo = new THREE.CapsuleGeometry(0.085, 0.22, 4, 10);
  const leftShin = addShadow(new THREE.Mesh(shinGeo, camo.clone()));
  markCamo(leftShin);
  leftShin.position.set(-0.16, 0.08, 0.04);
  const rightShin = leftShin.clone();
  rightShin.position.x = 0.16;
  markCamo(rightShin);
  root.add(leftShin, rightShin);

  // Boots
  const bootGeo = new THREE.BoxGeometry(0.16, 0.12, 0.28);
  const leftBoot = addShadow(new THREE.Mesh(bootGeo, ink));
  leftBoot.position.set(-0.16, 0.02, 0.06);
  const rightBoot = leftBoot.clone();
  rightBoot.position.x = 0.16;
  root.add(leftBoot, rightBoot);

  // Belt
  const belt = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 10, 24), ink));
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.7;
  root.add(belt);

  return { root, head, torso };
}

function dressShadowNinja(group, camo, ink, accent) {
  // Deep hood
  const hood = addShadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), ink)
  );
  hood.position.set(0, 1.68, -0.04);
  hood.rotation.x = 0.22;
  group.add(hood);

  // Hood peak
  const peak = addShadow(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 8), ink));
  peak.position.set(0, 1.98, -0.12);
  peak.rotation.x = -0.5;
  group.add(peak);

  // Face wrap / mask
  const mask = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.34), ink));
  mask.position.set(0, 1.48, 0.12);
  group.add(mask);

  // Scarf tails
  const scarf = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.08), camo.clone()));
  markCamo(scarf);
  scarf.position.set(0.22, 1.15, -0.2);
  scarf.rotation.set(0.35, 0.2, 0.4);
  group.add(scarf);

  // Shoulder wraps
  [-0.42, 0.42].forEach((x, i) => {
    const wrap = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 8, 16), ink));
    wrap.position.set(x, 1.22, 0);
    wrap.rotation.z = i === 0 ? 0.5 : -0.5;
    group.add(wrap);
  });

  // Kunai pouch
  const pouch = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.1), accent));
  pouch.position.set(0.28, 0.68, 0.22);
  group.add(pouch);
}

function dressForestScout(group, camo, ink, accent) {
  // Scout cap
  const cap = addShadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), camo.clone())
  );
  markCamo(cap);
  cap.position.y = 1.78;
  group.add(cap);

  const brim = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.04, 20), camo.clone()));
  markCamo(brim);
  brim.position.set(0, 1.66, 0.08);
  group.add(brim);

  // Goggles on forehead
  const strap = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 20), ink));
  strap.position.y = 1.7;
  strap.rotation.x = Math.PI / 2;
  group.add(strap);
  [-0.1, 0.1].forEach((x) => {
    const lens = addShadow(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.05, 14),
        clayMat('#72B83F', { metalness: 0.35, roughness: 0.3 })
      )
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, 1.72, 0.28);
    group.add(lens);
  });

  // Backpack
  const pack = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.22), ink));
  pack.position.set(0, 1.05, -0.28);
  group.add(pack);
  const packLid = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.24), accent));
  packLid.position.set(0, 1.28, -0.28);
  group.add(packLid);

  // Utility pouches on belt
  [-0.22, 0.22].forEach((x) => {
    const util = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.1), accent));
    util.position.set(x, 0.68, 0.26);
    group.add(util);
  });

  // Knee pads
  [-0.16, 0.16].forEach((x) => {
    const pad = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), ink));
    pad.position.set(x, 0.2, 0.12);
    pad.scale.set(1.1, 0.7, 0.6);
    group.add(pad);
  });
}

function dressPhantomGhost(group, camo, ink, accent) {
  // Soft translucent cloak
  const cloak = addShadow(
    new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.35, 16, 1, true),
      clayMat(camo.color.getHex(), { transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.7 })
    )
  );
  markCamo(cloak);
  cloak.position.set(0, 0.95, -0.08);
  cloak.rotation.x = Math.PI;
  group.add(cloak);

  // Inner veil over face
  const veil = addShadow(
    new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.28),
      clayMat('#F1FAEE', { transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    )
  );
  veil.position.set(0, 1.55, 0.3);
  group.add(veil);

  // Floating crest / halo
  const halo = addShadow(
    new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.045, 12, 28),
      clayMat('#F4A261', { emissive: new THREE.Color('#F4A261'), emissiveIntensity: 0.35 })
    )
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 2.05;
  group.add(halo);

  // Spirit orbs
  [ -0.55, 0.55 ].forEach((x, i) => {
    const orb = addShadow(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 10),
        clayMat(i === 0 ? GAME_COLORS.PURPLE : GAME_COLORS.BLUE, {
          emissive: new THREE.Color(i === 0 ? GAME_COLORS.PURPLE : GAME_COLORS.BLUE),
          emissiveIntensity: 0.45,
          transparent: true,
          opacity: 0.9,
        })
      )
    );
    orb.position.set(x, 1.35 + i * 0.1, -0.15);
    orb.userData.floatOrb = true;
    orb.userData.floatPhase = i * Math.PI;
    group.add(orb);
  });

  // Soft collar
  const collar = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 10, 20), ink));
  collar.position.y = 1.35;
  collar.rotation.x = Math.PI / 2;
  group.add(collar);
}

/**
 * Clay operative architecture:
 * 1 Shadow Ninja — hood, mask, scarf, stealth wraps
 * 2 Forest Scout — cap, goggles, pack, utility kit
 * 3 Phantom Ghost — cloak, halo, spirit orbs
 */
export function buildCharacter(modelId = 1, camoKey = 'BLUE') {
  const group = new THREE.Group();
  group.name = 'Attacker';
  const camoHex = hexForColor(camoKey) || GAME_COLORS.BLUE;
  const camo = clayMat(camoHex);
  const skin = clayMat(CLAY_SKIN);
  const ink = clayMat('#0D1B1E');
  const accent = clayMat('#F4A261');

  const { root } = buildCore(camo, skin, ink);
  group.add(root);

  const id = Number(modelId) || 1;
  if (id === 2) dressForestScout(group, camo, ink, accent);
  else if (id === 3) dressPhantomGhost(group, camo, ink, accent);
  else dressShadowNinja(group, camo, ink, accent);

  // Idle float hooks for phantom orbs (preview/raid can animate via userData)
  group.userData.modelId = id;
  group.userData.camoKey = String(camoKey).toUpperCase();

  markKeepColor(group);
  return group;
}

export function createAttacker({ camoColor = 'BLUE', characterModel = 1, scale = 0.42 } = {}) {
  const figure = buildCharacter(characterModel, camoColor);
  figure.scale.setScalar(scale);
  return figure;
}

export function applyCamoColor(figure, camoKey) {
  const hex = hexForColor(camoKey) || GAME_COLORS.BLUE;
  figure.userData.camoKey = String(camoKey).toUpperCase();
  figure.traverse((child) => {
    if (!child.isMesh || !child.material || !child.material.color) return;
    if (child.userData.isCamo) {
      child.material.color.set(hex);
      return;
    }
    // Legacy fallback for older meshes
    const hexNum = child.material.color.getHex();
    const isSkin = hexNum === new THREE.Color(CLAY_SKIN).getHex() || hexNum === new THREE.Color(COLORS.WHITE).getHex();
    const isInk = hexNum < 0x222222;
    if (isSkin || isInk) return;
    const current = `#${child.material.color.getHexString().toUpperCase()}`;
    const gameplay = Object.values(GAME_COLORS).map((h) => h.replace('#', '').toUpperCase());
    if (gameplay.some((g) => current.endsWith(g))) {
      child.material.color.set(hex);
    }
  });
}

/** Optional subtle motion for preview / idle (orbs, scarf not needed). */
export function tickCharacter(figure, elapsed) {
  if (!figure) return;
  figure.traverse((child) => {
    if (!child.userData.floatOrb) return;
    const phase = child.userData.floatPhase || 0;
    child.position.y = 1.35 + Math.sin(elapsed * 2.2 + phase) * 0.08;
  });
}
