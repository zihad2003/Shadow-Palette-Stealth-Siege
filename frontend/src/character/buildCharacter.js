import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLORS, GAME_COLORS, CLAY_SKIN, hexForColor } from '../colors.js';
const SKIN = '#E4C2A0';
const HAIR = '#2A1F1E';
const HAIR_FEMALE = '#1C1412';
const NAVY = '#1B2430';
const SOLE = '#EDE6DC';
const INK = '#121820';

function clayMat(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0.04,
    ...extras,
  });
}

function markCamo(mesh, region) {
  mesh.userData.isCamo = true;
  mesh.userData.camoRegion = region;
  return mesh;
}

function addShadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function rbox(w, h, d, radius = 0.04, segments = 2) {
  return new RoundedBoxGeometry(w, h, d, segments, radius);
}

/** Capsule extends ±(len/2 + radius) from its mesh center. */
function capHalf(len, radius) {
  return len * 0.5 + radius;
}

export function normalizeModelId(modelId) {
  const n = Number(modelId) || 1;
  return n === 2 ? 2 : 1;
}

/**
 * 6.5-head clay. Crown ~1.52. One volume per body part.
 * Head width ≈ 0.21, shoulder span ≈ 2.1 heads, arms reach mid-thigh,
 * hands ≈ 0.75 of face width, legs ≈ half of height.
 */
const MALE = {
  hipY: 0.72,
  hipR: 0.112,
  torsoY: 0.98,
  torsoW: 0.32,
  torsoH: 0.48,
  torsoD: 0.2,
  waistW: 0.3,
  shoulderX: 0.168,
  shoulderY: 1.175,
  armR: 0.046,
  upperLen: 0.26,
  foreLen: 0.22,
  headR: 0.12,
  headSX: 0.92,
  headSY: 1.12,
  headSZ: 0.94,
  neckY: 1.22,
  headPivot: 1.235,
  headLocalY: 0.12,
  hipSpread: 0.08,
  thighR: 0.058,
  thighLen: 0.34,
  shinR: 0.048,
  shinLen: 0.28,
  restArmZ: 0.1,
  stride: 1,
  hz: 1,
  lean: 1,
  female: false,
};

const FEMALE = {
  hipY: 0.7,
  hipR: 0.128,
  torsoY: 0.96,
  torsoW: 0.27,
  torsoH: 0.44,
  torsoD: 0.17,
  waistW: 0.22,
  shoulderX: 0.142,
  shoulderY: 1.145,
  armR: 0.04,
  upperLen: 0.24,
  foreLen: 0.21,
  headR: 0.118,
  headSX: 0.88,
  headSY: 1.18,
  headSZ: 0.9,
  neckY: 1.18,
  headPivot: 1.198,
  headLocalY: 0.118,
  hipSpread: 0.092,
  thighR: 0.052,
  thighLen: 0.33,
  shinR: 0.044,
  shinLen: 0.27,
  restArmZ: 0.09,
  stride: 0.88,
  hz: 1.04,
  lean: 0.82,
  female: true,
};

function createHair(body) {
  const hair = new THREE.Group();
  hair.name = 'Hair';
  const r = body.headR;
  const hy = body.headLocalY;
  const mat = clayMat(body.female ? HAIR_FEMALE : HAIR);

  const cap = addShadow(
    new THREE.Mesh(new THREE.SphereGeometry(r * 1.03, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), mat)
  );
  cap.position.set(0, hy, -0.004);
  cap.scale.set(body.headSX * 1.03, body.headSY * 1.02, body.headSZ * 1.03);
  hair.add(cap);

  if (body.female) {
    [-1, 1].forEach((side) => {
      const fall = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.18, r * 0.7, 4, 8), mat));
      fall.position.set(side * r * body.headSX * 0.95, hy - r * 0.2, -r * 0.04);
      fall.rotation.z = side * 0.1;
      hair.add(fall);
    });

    const pony = new THREE.Group();
    pony.name = 'Ponytail';
    pony.position.set(0, hy + r * 0.05, -r * body.headSZ * 0.95);
    const knot = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), mat));
    pony.add(knot);
    const tail = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.24, 4, 8), mat));
    tail.position.set(0, -0.16, -0.03);
    tail.rotation.x = 0.35;
    pony.add(tail);
    hair.add(pony);
  }

  return hair;
}

function createHead(body, skin, ink) {
  const head = new THREE.Group();
  head.name = 'Head';
  head.position.y = body.headPivot;

  const r = body.headR;
  const hy = body.headLocalY;
  const f = body.female;

  const skull = addShadow(new THREE.Mesh(new THREE.SphereGeometry(r, 22, 18), skin));
  skull.position.y = hy;
  skull.scale.set(body.headSX, body.headSY, body.headSZ);
  head.add(skull);

  [-1, 1].forEach((side) => {
    const ear = addShadow(new THREE.Mesh(new THREE.SphereGeometry(r * 0.18, 8, 7), skin));
    ear.scale.set(0.45, 1.05, 0.65);
    ear.position.set(side * r * body.headSX * 1.02, hy - r * 0.02, 0);
    head.add(ear);
  });

  const eyeX = r * body.headSX * 0.4;
  const eyeY = hy + r * 0.06;
  const eyeZ = r * body.headSZ * 0.9;
  const white = clayMat('#F4EDE3');
  [-eyeX, eyeX].forEach((x) => {
    const ball = addShadow(new THREE.Mesh(new THREE.SphereGeometry(f ? 0.016 : 0.015, 8, 7), white));
    ball.scale.set(1.15, 1, 0.55);
    ball.position.set(x, eyeY, eyeZ);
    head.add(ball);
    const iris = addShadow(new THREE.Mesh(new THREE.SphereGeometry(f ? 0.009 : 0.0085, 8, 7), ink));
    iris.position.set(x, eyeY, eyeZ + 0.007);
    head.add(iris);
  });

  const nose = addShadow(new THREE.Mesh(new THREE.SphereGeometry(f ? 0.012 : 0.015, 8, 7), skin));
  nose.scale.set(0.8, 1, 1.15);
  nose.position.set(0, hy - r * 0.06, r * body.headSZ * 1.02);
  head.add(nose);

  const mouth = addShadow(new THREE.Mesh(rbox(f ? 0.028 : 0.032, 0.006, 0.01, 0.002, 1), clayMat('#A07868')));
  mouth.position.set(0, hy - r * 0.38, r * body.headSZ * 0.82);
  head.add(mouth);

  head.add(createHair(body));
  return head;
}

function createHand(side, body, camo) {
  const hand = new THREE.Group();
  hand.name = side > 0 ? 'RightHand' : 'LeftHand';
  const r = body.armR;
  const palmW = r * 2.35;
  const palmH = r * 2.2;
  const palmD = r * 1.85;

  const wrist = addShadow(new THREE.Mesh(new THREE.SphereGeometry(r * 1.08, 10, 8), camo.clone()));
  markCamo(wrist, 'GLOVES');
  wrist.position.set(0, 0, 0.004);
  hand.add(wrist);

  const palm = addShadow(new THREE.Mesh(rbox(palmW, palmH, palmD, 0.024, 2), camo.clone()));
  markCamo(palm, 'GLOVES');
  palm.position.set(0, -r * 1.2, r * 0.55);
  hand.add(palm);

  for (let i = 0; i < 3; i += 1) {
    const t = (i - 1) * r * 0.72;
    const finger = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.38, r * 0.7, 3, 6), camo.clone()));
    markCamo(finger, 'GLOVES');
    finger.position.set(t, -r * 2.35, r * 0.62);
    finger.rotation.x = 0.18;
    hand.add(finger);
  }

  const thumb = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.4, r * 0.62, 3, 6), camo.clone()));
  markCamo(thumb, 'GLOVES');
  thumb.position.set(-palmW * 0.46 * side, -r * 0.75, r * 0.85);
  thumb.rotation.z = side * 0.7;
  thumb.rotation.x = 0.45;
  hand.add(thumb);
  return hand;
}

function createArm(side, body, camo) {
  const arm = new THREE.Group();
  arm.name = side > 0 ? 'RightArm' : 'LeftArm';
  const r = body.armR;
  const upper = body.upperLen;
  const fore = body.foreLen;
  const foreR = r * 0.94;

  const shoulder = addShadow(new THREE.Mesh(new THREE.SphereGeometry(r * 1.35, 10, 8), camo.clone()));
  markCamo(shoulder, 'SHIRT');
  arm.add(shoulder);

  const sleeve = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(r, upper, 4, 10), camo.clone()));
  markCamo(sleeve, 'SHIRT');
  const upperHalf = capHalf(upper, r);
  sleeve.position.y = -upperHalf + r * 0.4;
  arm.add(sleeve);

  const forearm = new THREE.Group();
  forearm.name = 'Forearm';
  forearm.position.y = sleeve.position.y - upperHalf + r * 0.65;
  arm.add(forearm);

  const elbow = addShadow(new THREE.Mesh(new THREE.SphereGeometry(r * 1.02, 8, 7), camo.clone()));
  markCamo(elbow, 'SHIRT');
  forearm.add(elbow);

  const foreMesh = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(foreR, fore, 4, 10), camo.clone()));
  markCamo(foreMesh, 'SHIRT');
  const foreHalf = capHalf(fore, foreR);
  foreMesh.position.y = -foreHalf + r * 0.4;
  forearm.add(foreMesh);

  const hand = createHand(side, body, camo);
  hand.position.set(0, foreMesh.position.y - foreHalf + r * 0.35, 0.01);
  hand.rotation.x = 0.08;
  forearm.add(hand);

  arm.rotation.z = side * body.restArmZ;
  arm.userData.restZ = arm.rotation.z;
  arm.userData.forearm = forearm;
  arm.userData.hand = hand;
  return arm;
}

function createShoe(side, body, camo) {
  const shoe = new THREE.Group();
  shoe.name = side > 0 ? 'RightShoe' : 'LeftShoe';
  const s = body.female ? 0.86 : 1;

  const sole = addShadow(new THREE.Mesh(rbox(0.1 * s, 0.028, 0.17 * s, 0.012, 2), clayMat(SOLE)));
  sole.position.set(0, 0, 0.03);
  shoe.add(sole);

  const upper = addShadow(new THREE.Mesh(rbox(0.092 * s, 0.048, 0.14 * s, 0.018, 2), camo.clone()));
  markCamo(upper, 'SHOES');
  upper.position.set(0, 0.028, 0.016);
  shoe.add(upper);
  return shoe;
}

function createLeg(side, body, camo) {
  const leg = new THREE.Group();
  leg.name = side > 0 ? 'RightLeg' : 'LeftLeg';
  leg.position.set(side * body.hipSpread, 0, 0.008);

  const thigh = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(body.thighR, body.thighLen, 4, 10), camo.clone()));
  markCamo(thigh, 'PANTS');
  thigh.position.set(0, -(body.thighLen * 0.45), 0);
  leg.add(thigh);

  const shin = new THREE.Group();
  shin.name = 'Shin';
  shin.position.set(0, -(body.thighLen + body.thighR * 0.55), 0);
  leg.add(shin);

  const shinMesh = addShadow(
    new THREE.Mesh(new THREE.CapsuleGeometry(body.shinR, body.shinLen, 4, 10), camo.clone())
  );
  markCamo(shinMesh, 'PANTS');
  shinMesh.position.set(0, -(body.shinLen * 0.42), 0.004);
  shin.add(shinMesh);

  const shoe = createShoe(side, body, camo);
  shoe.position.set(0, -(body.shinLen + 0.045), 0.016);
  shin.add(shoe);

  leg.userData.shin = shin;
  return leg;
}

function createShirt(body, camo) {
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'Body';

  const shirt = new THREE.Group();
  shirt.name = 'Shirt';
  bodyGroup.add(shirt);

  const shell = addShadow(new THREE.Mesh(rbox(body.torsoW, body.torsoH, body.torsoD, 0.09, 3), camo.clone()));
  markCamo(shell, 'SHIRT');
  shell.position.y = body.torsoY;
  shirt.add(shell);

  if (body.female) {
    const waist = addShadow(new THREE.Mesh(rbox(body.waistW, 0.14, body.torsoD * 0.9, 0.06, 2), camo.clone()));
    markCamo(waist, 'SHIRT');
    waist.position.y = body.torsoY - body.torsoH * 0.34;
    shirt.add(waist);
  }

  return bodyGroup;
}

function createBackpack(body, navy) {
  const pack = new THREE.Group();
  pack.name = 'SmallAccessory';
  const s = body.female ? 0.78 : 1;
  const bag = addShadow(new THREE.Mesh(rbox(0.16 * s, 0.18 * s, 0.08 * s, 0.03, 2), navy.clone()));
  bag.position.set(0, body.torsoY + 0.01, -(body.torsoD * 0.5 + 0.05));
  pack.add(bag);
  return pack;
}

function buildCore(body, mats) {
  const { navy, skin, ink, camo } = mats;
  const root = new THREE.Group();
  root.name = 'Character';

  const head = createHead(body, skin, ink);
  root.add(head);

  const shirtBody = createShirt(body, camo);
  root.add(shirtBody);

  const neck = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.05, 10), skin));
  neck.position.y = body.neckY;
  root.add(neck);

  const leftArm = createArm(-1, body, camo);
  leftArm.position.set(-body.shoulderX, body.shoulderY, 0);
  const rightArm = createArm(1, body, camo);
  rightArm.position.set(body.shoulderX, body.shoulderY, 0);
  root.add(leftArm, rightArm);

  const pants = new THREE.Group();
  pants.name = 'Pants';
  pants.position.y = body.hipY;

  const hips = addShadow(new THREE.Mesh(new THREE.SphereGeometry(body.hipR, 14, 12), camo.clone()));
  markCamo(hips, 'PANTS');
  hips.scale.set(body.female ? 1.2 : 1.06, body.female ? 0.58 : 0.5, 0.82);
  pants.add(hips);

  const leftLeg = createLeg(-1, body, camo);
  const rightLeg = createLeg(1, body, camo);
  pants.add(leftLeg, rightLeg);
  root.add(pants);

  const belt = addShadow(new THREE.Mesh(new THREE.TorusGeometry(body.female ? 0.13 : 0.15, 0.014, 8, 16), ink));
  belt.rotation.x = Math.PI / 2;
  belt.position.y = body.hipY + 0.07;
  root.add(belt);

  root.add(createBackpack(body, navy));

  return {
    root,
    head,
    body,
    rig: {
      root,
      head,
      torso: shirtBody,
      leftArm,
      rightArm,
      leftFore: leftArm.userData.forearm,
      rightFore: rightArm.userData.forearm,
      leftHand: leftArm.userData.hand,
      rightHand: rightArm.userData.hand,
      leftLeg,
      rightLeg,
      leftShin: leftLeg.userData.shin,
      rightShin: rightLeg.userData.shin,
      pants,
      hairTail: head.getObjectByName('Ponytail'),
    },
  };
}

export function markKeepColor(object) {
  object.userData.keepColor = true;
  object.userData.isAttacker = true;
  object.traverse((child) => {
    child.userData.keepColor = true;
    child.userData.isAttacker = true;
  });
}

export function buildCharacter(modelId = 1, camoKey = 'BLUE') {
  const group = new THREE.Group();
  group.name = 'Attacker';
  const id = normalizeModelId(modelId);
  const body = id === 2 ? FEMALE : MALE;
  const camoHex = hexForColor(camoKey) || GAME_COLORS.BLUE;
  const mats = {
    camo: clayMat(camoHex),
    skin: clayMat(SKIN),
    ink: clayMat(INK),
    navy: clayMat(NAVY),
  };

  const { root, rig } = buildCore(body, mats);
  group.add(root);
  group.userData.rig = rig;
  group.userData.body = body;
  root.userData.rig = rig;
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
    const hexNum = child.material.color.getHex();
    const isSkin =
      hexNum === new THREE.Color(SKIN).getHex() ||
      hexNum === new THREE.Color(CLAY_SKIN).getHex() ||
      hexNum === new THREE.Color(COLORS.WHITE).getHex();
    const isInk = hexNum < 0x222222;
    if (isSkin || isInk) return;
    const current = `#${child.material.color.getHexString().toUpperCase()}`;
    const gameplay = Object.values(GAME_COLORS).map((h) => h.replace('#', '').toUpperCase());
    if (gameplay.some((g) => current.endsWith(g))) child.material.color.set(hex);
  });
}

export const CHAR_MESH_REV = 27;
/** Walk-units: 1 = walking, ~1.9 = sprint. Same contract as the last push. */
export const RUN_GAIT_SPEED = 1.35;

function resolveRig(figure) {
  const existing = figure.userData?.rig;
  if (existing?.leftArm && existing?.leftLeg && existing?.rightArm && existing?.rightLeg) return existing;
  const pick = (name) => figure.getObjectByName(name);
  const leftArm = existing?.leftArm || pick('LeftArm');
  const rightArm = existing?.rightArm || pick('RightArm');
  const leftLeg = existing?.leftLeg || pick('LeftLeg');
  const rightLeg = existing?.rightLeg || pick('RightLeg');
  if (!leftArm || !rightArm || !leftLeg || !rightLeg) return existing;
  const rig = {
    ...existing,
    root: existing?.root || pick('Character') || figure,
    head: existing?.head || pick('Head'),
    torso: existing?.torso || pick('Body'),
    leftArm,
    rightArm,
    leftFore: existing?.leftFore || leftArm.userData?.forearm || leftArm.getObjectByName('Forearm'),
    rightFore: existing?.rightFore || rightArm.userData?.forearm || rightArm.getObjectByName('Forearm'),
    leftHand: existing?.leftHand || leftArm.userData?.hand || leftArm.getObjectByName('LeftHand'),
    rightHand: existing?.rightHand || rightArm.userData?.hand || rightArm.getObjectByName('RightHand'),
    leftLeg,
    rightLeg,
    leftShin: existing?.leftShin || leftLeg.userData?.shin || leftLeg.getObjectByName('Shin'),
    rightShin: existing?.rightShin || rightLeg.userData?.shin || rightLeg.getObjectByName('Shin'),
    pants: existing?.pants || pick('Pants'),
    hairTail: existing?.hairTail || pick('Ponytail'),
  };
  figure.userData.rig = rig;
  return rig;
}

export function tickCharacter(figure, elapsed, motion = null) {
  if (!figure) return;
  const rig = resolveRig(figure);
  if (!rig?.leftArm || !rig?.leftLeg) return;
  const body = figure.userData.body || MALE;
  const dt = Math.min(0.05, Math.max(0.001, motion?.dt ?? 0.016));
  const speed = Math.max(0, motion?.speed ?? 0);
  const gait =
    figure.userData.gait ||
    (figure.userData.gait = { phase: 0, amp: 0, lean: 0, run: 0, bob: 0 });

  const targetAmp = Math.min(1.25, speed);
  gait.amp += (targetAmp - gait.amp) * (1 - Math.exp(-7.2 * dt));
  const runTarget = speed > RUN_GAIT_SPEED ? 1 : 0;
  gait.run += (runTarget - gait.run) * (1 - Math.exp(-5 * dt));

  const cadence = (5.6 + speed * 3.4) * body.hz;
  if (speed > 0.04) gait.phase += dt * cadence;
  else if (gait.amp > 0.015) {
    const rest = Math.round(gait.phase / Math.PI) * Math.PI;
    gait.phase += (rest - gait.phase) * (1 - Math.exp(-6.2 * dt));
  }

  const s = Math.sin(gait.phase);
  const c = Math.cos(gait.phase);
  const liftL = Math.max(0, s);
  const liftR = Math.max(0, -s);
  const idle = 1 - Math.min(1, gait.amp);
  const breathe = Math.sin(elapsed * 1.55);
  const stride = body.stride * gait.amp;
  const bobTarget = Math.abs(s) * (0.038 + gait.run * 0.03) * gait.amp;
  gait.bob += (bobTarget - gait.bob) * (1 - Math.exp(-10 * dt));

  const seated = !!motion?.seated;
  const picking = !!motion?.picking && !seated;
  const carrying = !!motion?.carrying && !seated && !picking;

  if (!seated && !picking) {
    const legSwing = (0.52 + gait.run * 0.28) * stride;
    rig.leftLeg.rotation.x = s * legSwing;
    rig.rightLeg.rotation.x = -s * legSwing;
    // +rotation.x swings the foot backward. Bend the knee on the forward leg.
    if (rig.leftShin) rig.leftShin.rotation.x = 0.06 * idle + liftR * (0.62 + gait.run * 0.32) * stride;
    if (rig.rightShin) rig.rightShin.rotation.x = 0.06 * idle + liftL * (0.62 + gait.run * 0.32) * stride;
  }

  const leftRestZ = rig.leftArm.userData.restZ ?? -body.restArmZ;

  if (seated) {
    // Negative X swings the thigh forward into the footwell. Shin folds down.
    rig.leftLeg.rotation.x = -1.2;
    rig.rightLeg.rotation.x = -1.2;
    if (rig.leftShin) rig.leftShin.rotation.x = -0.95;
    if (rig.rightShin) rig.rightShin.rotation.x = -0.95;
    rig.leftArm.rotation.set(-0.95, 0.15, -0.18);
    rig.rightArm.rotation.set(-0.9, -0.12, 0.18);
    if (rig.leftFore) rig.leftFore.rotation.x = 0.55;
    if (rig.rightFore) rig.rightFore.rotation.x = 0.5;
    if (rig.leftHand) rig.leftHand.rotation.set(0.2, 0, -0.04);
    if (rig.rightHand) rig.rightHand.rotation.set(0.2, 0, 0.04);
    rig.root.position.y = 0;
  } else if (picking) {
    rig.leftLeg.rotation.x = 0.32;
    rig.rightLeg.rotation.x = 0.18;
    if (rig.leftShin) rig.leftShin.rotation.x = 0.58;
    if (rig.rightShin) rig.rightShin.rotation.x = 0.44;
    rig.leftArm.rotation.set(-0.7, 0, -0.15);
    rig.rightArm.rotation.set(-1.25, 0, 0.35);
    if (rig.leftFore) rig.leftFore.rotation.x = 0.4;
    if (rig.rightFore) rig.rightFore.rotation.x = 0.55;
    if (rig.leftHand) rig.leftHand.rotation.set(0.18, 0, -0.06);
    if (rig.rightHand) rig.rightHand.rotation.set(0.22, 0, 0.08);
    rig.root.position.y = -0.12 + gait.bob;
  } else if (carrying) {
    rig.leftArm.rotation.set(-1.05 + s * 0.05 * gait.amp, 0, -0.28);
    rig.rightArm.rotation.set(-1.18 - s * 0.04 * gait.amp, 0, 0.32);
    if (rig.leftFore) rig.leftFore.rotation.x = 0.35;
    if (rig.rightFore) rig.rightFore.rotation.x = 0.4;
    if (rig.leftHand) rig.leftHand.rotation.set(0.2, 0, -0.05);
    if (rig.rightHand) rig.rightHand.rotation.set(0.2, 0, 0.05);
    rig.root.position.y = gait.bob + breathe * 0.01 * idle;
  } else {
    const armSwing = (0.48 + gait.run * 0.32) * stride;
    rig.leftArm.rotation.set(0.06 - s * armSwing, 0, -Math.abs(leftRestZ) + gait.amp * 0.04 + breathe * 0.02 * idle);
    rig.rightArm.rotation.set(0.06 + s * armSwing, 0, Math.abs(leftRestZ) - gait.amp * 0.04 - breathe * 0.02 * idle);
    // Fold the elbow forward on the backswing. +rotation.x hyperextends toward the back.
    if (rig.leftFore) rig.leftFore.rotation.x = 0.06 - liftR * 0.32 * stride;
    if (rig.rightFore) rig.rightFore.rotation.x = 0.06 - liftL * 0.32 * stride;
    if (rig.leftHand) rig.leftHand.rotation.set(0.1 - s * 0.12 * stride, 0, -0.04);
    if (rig.rightHand) rig.rightHand.rotation.set(0.1 + s * 0.12 * stride, 0, 0.04);
    rig.root.position.y = gait.bob + breathe * 0.012 * idle;
  }

  const targetLean = seated ? 0.04 : picking ? 0.14 : speed > 0.04 ? (0.04 + gait.run * 0.14) * body.lean : 0;
  gait.lean += (targetLean - gait.lean) * (1 - Math.exp(-4.2 * dt));
  rig.root.rotation.x = gait.lean;
  rig.root.rotation.y = 0;
  rig.root.rotation.z = seated || picking ? 0 : -s * 0.028 * stride + breathe * 0.01 * idle;
  rig.root.position.x = 0;
  if (rig.pants) {
    rig.pants.rotation.y = seated || picking ? 0 : s * 0.05 * stride;
    rig.pants.rotation.z = 0;
  }
  if (rig.torso) {
    rig.torso.rotation.y = seated || picking ? 0 : -s * 0.04 * stride;
    rig.torso.rotation.z = 0;
  }
  if (rig.head) {
    rig.head.rotation.x = -gait.lean * 0.55 + breathe * 0.018 * idle;
    rig.head.rotation.y = c * 0.04 * stride;
  }
  if (rig.hairTail) {
    rig.hairTail.rotation.x = 0.12 + s * 0.18 * stride + breathe * 0.04 * idle;
    rig.hairTail.rotation.z = c * 0.08 * stride;
  }
}
