import * as THREE from 'three';
import { COLORS, GAME_COLORS, CLAY_SKIN, hexForColor } from '../colors.js';

function clayMat(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.44,
    metalness: 0.06,
    ...extras,
  });
}

export function markKeepColor(object) {
  object.userData.keepColor = true;
  object.userData.isAttacker = true;
  object.traverse((child) => {
    child.userData.keepColor = true;
    child.userData.isAttacker = true;
  });
}

/** One clay operative with a dynamic camouflage material — not five models. */
export function buildCharacter(modelId = 1, camoKey = 'BLUE') {
  const group = new THREE.Group();
  group.name = 'Attacker';
  const camoColor = hexForColor(camoKey) || GAME_COLORS.BLUE;
  const camo = clayMat(camoColor);
  const skin = clayMat(CLAY_SKIN);
  const ink = clayMat('#0D1B1E');

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.72, 6, 18), camo);
  body.position.y = 0.72;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 24), skin);
  head.position.y = 1.44;
  head.castShadow = true;
  group.add(head);

  const eyeGeo = new THREE.SphereGeometry(0.045, 10, 10);
  const leftEye = new THREE.Mesh(eyeGeo, ink);
  leftEye.position.set(-0.1, 1.48, 0.26);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.1;
  group.add(leftEye, rightEye);

  if (modelId === 1) {
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
      ink
    );
    hood.position.y = 1.52;
    hood.rotation.x = 0.18;
    group.add(hood);

    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.11, 0.36), ink);
    mask.position.set(0, 1.36, 0.1);
    group.add(mask);
  } else if (modelId === 2) {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      clayMat(GAME_COLORS.GREEN)
    );
    cap.position.y = 1.6;
    group.add(cap);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 18), clayMat(GAME_COLORS.GREEN));
    brim.position.y = 1.5;
    group.add(brim);
  } else {
    body.material = clayMat(camoColor, { transparent: true, opacity: 0.88 });
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.055, 10, 24), clayMat('#F4A261'));
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 1.86;
    group.add(halo);
  }

  const armGeo = new THREE.CapsuleGeometry(0.1, 0.38, 4, 10);
  const leftArm = new THREE.Mesh(armGeo, camo);
  leftArm.position.set(-0.48, 0.78, 0);
  leftArm.rotation.z = 0.35;
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.48;
  rightArm.rotation.z = -0.35;
  group.add(leftArm, rightArm);

  const footGeo = new THREE.SphereGeometry(0.16, 12, 12);
  const leftFoot = new THREE.Mesh(footGeo, ink);
  leftFoot.position.set(-0.18, 0.12, 0.08);
  leftFoot.scale.set(1, 0.55, 1.35);
  const rightFoot = leftFoot.clone();
  rightFoot.position.x = 0.18;
  group.add(leftFoot, rightFoot);

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
  figure.traverse((child) => {
    if (!child.isMesh || !child.material || !child.material.color) return;
    const current = `#${child.material.color.getHexString().toUpperCase()}`;
    const gameplay = Object.values(GAME_COLORS).map((h) => h.replace('#', '').toUpperCase());
    const hexNum = child.material.color.getHex();
    const isSkin = hexNum === new THREE.Color(CLAY_SKIN).getHex() || hexNum === new THREE.Color(COLORS.WHITE).getHex();
    const isInk = hexNum < 0x222222;
    if (isSkin || isInk) return;
    if (gameplay.some((g) => current.endsWith(g))) {
      child.material.color.set(hex);
    }
  });
}
