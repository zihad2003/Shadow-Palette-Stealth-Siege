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

const HAIR_HEX = '#2A1F1E';
const HAIR_FEMALE = '#1A1214';
const MOUTH_HEX = '#5A3A3A';
const CHEEK_HEX = '#F2A08A';

/** 1 = male, 2 = female. Older ids (3) map to female. */
export function normalizeModelId(modelId) {
  const n = Number(modelId) || 1;
  return n === 1 ? 1 : 2;
}

const MALE = {
  hipY: 0.52,
  hipS: [1.14, 0.74, 0.96],
  torsoY: 1.02,
  torsoR: 0.36,
  torsoLen: 0.46,
  chestW: 0.5,
  chestH: 0.3,
  shoulderX: 0.46,
  shoulderY: 1.28,
  armR: 0.092,
  armLen: 0.36,
  headR: 0.3,
  neckY: 1.42,
  headPivot: 1.48,
  headWorld: 1.66,
  hipSpread: 0.175,
  thighR: 0.122,
  shinR: 0.09,
  stride: 1,
  hz: 1,
  lean: 1,
};

const FEMALE = {
  hipY: 0.5,
  hipS: [0.94, 0.68, 0.9],
  torsoY: 0.98,
  torsoR: 0.28,
  torsoLen: 0.4,
  chestW: 0.36,
  chestH: 0.24,
  shoulderX: 0.34,
  shoulderY: 1.2,
  armR: 0.07,
  armLen: 0.32,
  headR: 0.275,
  neckY: 1.34,
  headPivot: 1.4,
  headWorld: 1.56,
  hipSpread: 0.145,
  thighR: 0.098,
  shinR: 0.075,
  stride: 0.86,
  hz: 1.1,
  lean: 0.82,
};

function hy(body, worldY) {
  return worldY - body.headPivot;
}

function createHand(inkMat, camoMat, side = 1, scale = 1) {
  const hand = new THREE.Group();
  hand.name = side > 0 ? 'RightHand' : 'LeftHand';
  const glove = inkMat.clone();
  const s = scale;

  const wrist = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.055 * s, 0.06 * s, 0.06, 12), glove));
  wrist.position.y = 0.02;
  hand.add(wrist);

  const palm = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.048 * s, 0.045, 4, 10), glove));
  palm.position.set(0, -0.05, 0.01);
  palm.scale.set(1.18, 1, 0.88);
  hand.add(palm);

  const cushion = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.034 * s, 10, 8), camoMat.clone()));
  markCamo(cushion);
  cushion.position.set(0, -0.05, 0.044);
  cushion.scale.set(1.3, 1.1, 0.42);
  hand.add(cushion);

  [
    { x: -0.032, len: 0.075, r: 0.013 },
    { x: -0.01, len: 0.085, r: 0.014 },
    { x: 0.01, len: 0.08, r: 0.013 },
    { x: 0.03, len: 0.065, r: 0.011 },
  ].forEach((f, i) => {
    const digit = new THREE.Group();
    digit.position.set(f.x * side * s, -0.095 * s, 0.01);
    digit.rotation.z = f.x * side * 0.5;
    digit.rotation.x = 0.45 + i * 0.04;
    const bone = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(f.r * s, f.len * 0.45, 3, 8), glove));
    bone.position.y = -f.len * 0.3;
    digit.add(bone);
    const tip = addShadow(new THREE.Mesh(new THREE.SphereGeometry(f.r * 1.05 * s, 8, 6), glove));
    tip.position.y = -f.len * 0.65;
    digit.add(tip);
    hand.add(digit);
  });

  const thumb = new THREE.Group();
  thumb.position.set(-0.044 * side * s, -0.022, 0.028);
  thumb.rotation.set(0.8, side * 0.48, side * -0.1);
  const thumbBone = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.014 * s, 0.04, 3, 8), glove));
  thumbBone.position.y = -0.028;
  thumb.add(thumbBone);
  const thumbTip = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.015 * s, 8, 6), glove));
  thumbTip.position.y = -0.062;
  thumb.add(thumbTip);
  hand.add(thumb);
  return hand;
}

function createArm(camo, ink, side, body) {
  const arm = new THREE.Group();
  arm.name = side > 0 ? 'RightArm' : 'LeftArm';
  const r = body.armR;
  const len = body.armLen;

  const shoulder = addShadow(new THREE.Mesh(new THREE.SphereGeometry(r * 1.45, 14, 12), camo.clone()));
  markCamo(shoulder);
  arm.add(shoulder);

  const upper = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(r, len * 0.92, 4, 12), camo.clone()));
  markCamo(upper);
  upper.position.set(0, -len * 0.55, 0);
  arm.add(upper);

  const elbow = addShadow(new THREE.Mesh(new THREE.SphereGeometry(r * 1.02, 12, 10), camo.clone()));
  markCamo(elbow);
  elbow.position.set(0, -len * 1.08, 0);
  arm.add(elbow);

  const forearm = new THREE.Group();
  forearm.name = 'Forearm';
  forearm.position.set(0, -len * 1.08, 0);
  forearm.rotation.z = side * 0.16;
  forearm.rotation.x = 0.12;
  forearm.userData.restX = 0.12;
  forearm.userData.restZ = side * 0.16;
  arm.add(forearm);

  const foreMesh = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.82, len * 0.78, 4, 12), camo.clone()));
  markCamo(foreMesh);
  foreMesh.position.set(0, -len * 0.48, 0);
  forearm.add(foreMesh);

  const wristBall = addShadow(new THREE.Mesh(new THREE.SphereGeometry(r * 0.62, 10, 8), ink.clone()));
  wristBall.position.set(0, -len * 0.95, 0);
  forearm.add(wristBall);

  const hand = createHand(ink, camo, side, body.armR / 0.092);
  hand.position.set(0, -len * 1.05, 0.01);
  hand.rotation.set(0.22, 0, 0);
  forearm.add(hand);

  arm.rotation.z = side * (body === FEMALE ? 0.48 : 0.55);
  arm.rotation.x = 0.06;
  arm.userData.restZ = arm.rotation.z;
  arm.userData.forearm = forearm;
  return arm;
}

function createLeg(camo, ink, side, body) {
  const leg = new THREE.Group();
  leg.name = side > 0 ? 'RightLeg' : 'LeftLeg';
  leg.position.set(side * body.hipSpread, body.hipY - 0.04, 0.02);

  const hipBall = addShadow(new THREE.Mesh(new THREE.SphereGeometry(body.thighR * 0.95, 12, 10), camo.clone()));
  markCamo(hipBall);
  leg.add(hipBall);

  const thigh = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(body.thighR, 0.26, 4, 10), camo.clone()));
  markCamo(thigh);
  thigh.position.set(0, -0.18, 0);
  leg.add(thigh);

  const knee = addShadow(new THREE.Mesh(new THREE.SphereGeometry(body.shinR * 1.05, 12, 10), camo.clone()));
  markCamo(knee);
  knee.position.set(0, -0.32, 0.01);
  leg.add(knee);

  const shin = new THREE.Group();
  shin.name = 'Shin';
  shin.position.set(0, -0.32, 0.01);
  leg.add(shin);

  const shinMesh = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(body.shinR, 0.2, 4, 10), camo.clone()));
  markCamo(shinMesh);
  shinMesh.position.set(0, -0.12, 0.01);
  shin.add(shinMesh);

  const strap = addShadow(new THREE.Mesh(new THREE.TorusGeometry(body.thighR * 1.02, 0.016, 8, 16), ink));
  strap.rotation.x = Math.PI / 2;
  strap.position.set(0, -0.12, 0);
  leg.add(strap);

  const cuff = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(body.shinR * 1.15, body.shinR * 1.08, 0.055, 14), ink));
  cuff.position.set(0, -0.22, 0.02);
  shin.add(cuff);

  const boot = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, body === FEMALE ? 0.24 : 0.28), ink));
  boot.position.set(0, -0.28, 0.04);
  shin.add(boot);

  const toe = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.078, 12, 10), ink));
  toe.position.set(0, -0.29, body === FEMALE ? 0.14 : 0.17);
  toe.scale.set(0.92, 0.68, 0.78);
  shin.add(toe);

  const sole = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.032, body === FEMALE ? 0.26 : 0.3), clayMat('#3B3A38')));
  sole.position.set(0, -0.335, 0.05);
  shin.add(sole);

  leg.userData.shin = shin;
  return leg;
}

function buildCore(camo, skin, ink, accent, body) {
  const root = new THREE.Group();
  root.name = 'CoreFigure';

  const hips = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 14), camo.clone()));
  markCamo(hips);
  hips.position.y = body.hipY;
  hips.scale.set(...body.hipS);
  root.add(hips);

  const torso = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(body.torsoR, body.torsoLen, 6, 16), camo.clone()));
  markCamo(torso);
  torso.position.y = body.torsoY;
  root.add(torso);

  const chest = addShadow(new THREE.Mesh(new THREE.BoxGeometry(body.chestW, body.chestH, 0.16), camo.clone()));
  markCamo(chest);
  chest.position.set(0, body.torsoY + 0.08, 0.2);
  chest.rotation.x = -0.1;
  root.add(chest);

  [-1, 1].forEach((side) => {
    const strap = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.62, 0.035), ink));
    strap.position.set(side * 0.02, body.torsoY, 0.3);
    strap.rotation.z = side * 0.55;
    root.add(strap);
  });
  const pin = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.028, 12), accent));
  pin.rotation.x = Math.PI / 2;
  pin.position.set(0, body.torsoY, 0.325);
  root.add(pin);

  const neck = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.13, 12), skin));
  neck.position.y = body.neckY;
  root.add(neck);

  const headGroup = new THREE.Group();
  headGroup.name = 'Head';
  headGroup.position.y = body.headPivot;
  root.add(headGroup);

  const head = addShadow(new THREE.Mesh(new THREE.SphereGeometry(body.headR, 24, 20), skin));
  head.position.y = hy(body, body.headWorld);
  if (body === MALE) head.scale.set(1.04, 1, 1.02);
  else head.scale.set(0.98, 1.02, 1);
  headGroup.add(head);

  const hairHex = body === FEMALE ? HAIR_FEMALE : HAIR_HEX;
  const hair = addShadow(
    new THREE.Mesh(new THREE.SphereGeometry(body.headR * 1.04, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), clayMat(hairHex))
  );
  hair.position.set(0, hy(body, body.headWorld + 0.01), -0.02);
  hair.rotation.x = -0.1;
  headGroup.add(hair);

  const earGeo = new THREE.SphereGeometry(0.065, 10, 10);
  const leftEar = addShadow(new THREE.Mesh(earGeo, skin));
  leftEar.position.set(-body.headR * 0.92, hy(body, body.headWorld), 0);
  leftEar.scale.set(0.52, 1, 0.68);
  const rightEar = leftEar.clone();
  rightEar.position.x = body.headR * 0.92;
  headGroup.add(leftEar, rightEar);

  const eyeWhite = clayMat('#F8F4EC');
  const catchlight = clayMat('#FFFFFF', { emissive: new THREE.Color('#FFFFFF'), emissiveIntensity: 0.6 });
  const eyeX = body === FEMALE ? 0.09 : 0.1;
  [-eyeX, eyeX].forEach((x) => {
    const socket = addShadow(new THREE.Mesh(new THREE.SphereGeometry(body === FEMALE ? 0.05 : 0.055, 12, 10), eyeWhite));
    socket.position.set(x, hy(body, body.headWorld + 0.02), body.headR * 0.8);
    headGroup.add(socket);
    const iris = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), ink));
    iris.position.set(x, hy(body, body.headWorld + 0.025), body.headR * 0.94);
    headGroup.add(iris);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), catchlight);
    spark.position.set(x + 0.01, hy(body, body.headWorld + 0.04), body.headR * 1.02);
    headGroup.add(spark);
    const brow = addShadow(new THREE.Mesh(new THREE.BoxGeometry(body === FEMALE ? 0.1 : 0.12, body === FEMALE ? 0.018 : 0.03, 0.035), clayMat(hairHex)));
    brow.position.set(x, hy(body, body.headWorld + 0.1), body.headR * 0.85);
    brow.rotation.z = body === FEMALE ? -x * 0.8 : -x * 1.35;
    headGroup.add(brow);
  });

  const nose = addShadow(new THREE.Mesh(new THREE.SphereGeometry(body === FEMALE ? 0.024 : 0.03, 10, 8), skin));
  nose.position.set(0, hy(body, body.headWorld - 0.03), body.headR * 1.0);
  headGroup.add(nose);

  const mouth = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.011, 6, 14, Math.PI), clayMat(MOUTH_HEX)));
  mouth.position.set(0, hy(body, body.headWorld - 0.1), body.headR * 0.9);
  mouth.rotation.set(0.12, 0, Math.PI);
  headGroup.add(mouth);

  const cheekMat = clayMat(CHEEK_HEX, { transparent: true, opacity: body === FEMALE ? 0.7 : 0.5, roughness: 0.8 });
  [-0.15, 0.15].forEach((x) => {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), cheekMat);
    cheek.position.set(x, hy(body, body.headWorld - 0.055), body.headR * 0.7);
    cheek.scale.set(1, 0.65, 0.42);
    headGroup.add(cheek);
  });

  const leftArm = createArm(camo, ink, -1, body);
  leftArm.position.set(-body.shoulderX, body.shoulderY, 0);
  const rightArm = createArm(camo, ink, 1, body);
  rightArm.position.set(body.shoulderX, body.shoulderY, 0);
  root.add(leftArm, rightArm);

  const leftLeg = createLeg(camo, ink, -1, body);
  const rightLeg = createLeg(camo, ink, 1, body);
  root.add(leftLeg, rightLeg);

  const belt = addShadow(new THREE.Mesh(new THREE.TorusGeometry(body === FEMALE ? 0.26 : 0.3, 0.04, 10, 24), ink));
  belt.rotation.x = Math.PI / 2;
  belt.position.y = body.hipY + 0.18;
  root.add(belt);
  const buckle = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.045), accent));
  buckle.position.set(0, body.hipY + 0.18, 0.29);
  root.add(buckle);

  return {
    root,
    head: headGroup,
    torso,
    body,
    rig: {
      root,
      head: headGroup,
      torso,
      leftArm,
      rightArm,
      leftFore: leftArm.userData.forearm,
      rightFore: rightArm.userData.forearm,
      leftLeg,
      rightLeg,
      leftShin: leftLeg.userData.shin,
      rightShin: rightLeg.userData.shin,
    },
  };
}

function dressMale(group, camo, ink, accent, body) {
  const rig = group.userData.rig;
  const head = rig.head;
  const steel = clayMat('#C9CDD2', { metalness: 0.65, roughness: 0.28 });

  const hood = addShadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16, Math.PI * 0.22, Math.PI * 1.56, 0, Math.PI * 0.58), ink)
  );
  hood.position.set(0, hy(body, body.headWorld + 0.04), -0.05);
  hood.rotation.set(0.05, Math.PI / 2, 0);
  head.add(hood);
  const hoodTop = addShadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.3), ink)
  );
  hoodTop.position.set(0, hy(body, body.headWorld + 0.04), -0.05);
  head.add(hoodTop);

  const mask = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.32), ink));
  mask.position.set(0, hy(body, body.headWorld - 0.14), 0.1);
  head.add(mask);
  const stripe = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 0.33), camo.clone()));
  markCamo(stripe);
  stripe.position.set(0, hy(body, body.headWorld - 0.13), 0.1);
  head.add(stripe);

  [-0.06, 0.06].forEach((x, i) => {
    const tail = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.3, 0.02), camo.clone()));
    markCamo(tail);
    tail.position.set(x, hy(body, body.headWorld - 0.12), -0.32);
    tail.rotation.set(0.5, 0, i === 0 ? 0.22 : -0.22);
    head.add(tail);
  });

  const scarf = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.07), camo.clone()));
  markCamo(scarf);
  scarf.position.set(0.2, 1.12, -0.18);
  scarf.rotation.set(0.32, 0.18, 0.38);
  group.add(scarf);

  [-body.shoulderX, body.shoulderX].forEach((x, i) => {
    const wrap = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.032, 8, 16), ink));
    wrap.position.set(x, body.shoulderY, 0);
    wrap.rotation.z = i === 0 ? 0.48 : -0.48;
    group.add(wrap);
  });

  [rig.leftFore, rig.rightFore].forEach((fore) => {
    if (!fore) return;
    [-0.12, -0.2, -0.28].forEach((y) => {
      const band = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 6, 14), ink));
      band.rotation.x = Math.PI / 2;
      band.position.set(0, y, 0);
      fore.add(band);
    });
  });

  const blade = new THREE.Group();
  blade.position.set(-0.12, 1.02, -0.34);
  blade.rotation.set(0.08, 0, 0.58);
  const steelBlade = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.95, 0.014), steel));
  steelBlade.position.y = 0.48;
  blade.add(steelBlade);
  const guard = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.018, 14), accent));
  blade.add(guard);
  const grip = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.026, 0.28, 10), ink));
  grip.position.y = -0.15;
  blade.add(grip);
  group.add(blade);

  const pouch = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.09), accent));
  pouch.position.set(0.26, 0.68, 0.2);
  group.add(pouch);
}

function dressFemale(group, camo, ink, accent, body) {
  const rig = group.userData.rig;
  const head = rig.head;
  const hairHex = HAIR_FEMALE;

  const bangs = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10, 0, Math.PI, 0, Math.PI * 0.45), clayMat(hairHex)));
  bangs.position.set(0, hy(body, body.headWorld + 0.04), 0.12);
  bangs.rotation.x = 0.35;
  head.add(bangs);

  const pony = new THREE.Group();
  pony.name = 'Ponytail';
  pony.position.set(0, hy(body, body.headWorld + 0.02), -0.22);
  const knot = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), clayMat(hairHex)));
  pony.add(knot);
  const tie = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 12), camo.clone()));
  markCamo(tie);
  tie.rotation.x = Math.PI / 2;
  pony.add(tie);
  const tail = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.42, 4, 10), clayMat(hairHex)));
  tail.position.set(0, -0.28, -0.04);
  tail.rotation.x = 0.35;
  pony.add(tail);
  const tip = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), clayMat(hairHex)));
  tip.position.set(0, -0.52, -0.12);
  pony.add(tip);
  head.add(pony);
  rig.hairTail = pony;

  const cowl = addShadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14, Math.PI * 0.28, Math.PI * 1.44, 0, Math.PI * 0.5), ink)
  );
  cowl.position.set(0, hy(body, body.headWorld), -0.06);
  cowl.rotation.set(0.08, Math.PI / 2, 0);
  head.add(cowl);

  const sash = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.05), camo.clone()));
  markCamo(sash);
  sash.position.set(-0.16, 1.02, -0.16);
  sash.rotation.set(0.28, -0.15, -0.35);
  group.add(sash);
  const sash2 = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.04), camo.clone()));
  markCamo(sash2);
  sash2.position.set(0.12, 1.0, -0.2);
  sash2.rotation.set(0.4, 0.1, 0.2);
  group.add(sash2);

  const skirt = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.28, 14, 1, true), camo.clone()));
  markCamo(skirt);
  skirt.position.set(0, 0.52, 0);
  group.add(skirt);

  [-body.shoulderX, body.shoulderX].forEach((x, i) => {
    const wrap = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.026, 8, 14), ink));
    wrap.position.set(x, body.shoulderY, 0);
    wrap.rotation.z = i === 0 ? 0.42 : -0.42;
    group.add(wrap);
  });

  const steel = clayMat('#C9CDD2', { metalness: 0.6, roughness: 0.3 });
  [-0.2, 0.2].forEach((x) => {
    const kunai = addShadow(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.14, 6), steel));
    kunai.position.set(x, 0.7, 0.2);
    kunai.rotation.set(0.2, 0, x > 0 ? 0.15 : -0.15);
    group.add(kunai);
  });

  [rig.leftLeg, rig.rightLeg].forEach((leg) => {
    const pad = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), ink));
    pad.position.set(0, -0.3, 0.09);
    pad.scale.set(1.05, 0.65, 0.55);
    leg.add(pad);
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

export function buildCharacter(modelId = 1, camoKey = 'BLUE') {
  const group = new THREE.Group();
  group.name = 'Attacker';
  const id = normalizeModelId(modelId);
  const body = id === 2 ? FEMALE : MALE;
  const camoHex = hexForColor(camoKey) || GAME_COLORS.BLUE;
  const camo = clayMat(camoHex);
  const skin = clayMat(CLAY_SKIN);
  const ink = clayMat('#0D1B1E');
  const accent = clayMat('#F4A261');

  const { root, rig } = buildCore(camo, skin, ink, accent, body);
  group.add(root);
  group.userData.rig = rig;
  group.userData.body = body;
  root.userData.rig = rig;

  if (id === 2) dressFemale(root, camo, ink, accent, body);
  else dressMale(root, camo, ink, accent, body);

  group.userData.modelId = id;
  group.userData.camoKey = String(camoKey).toUpperCase();
  markKeepColor(group);
  return group;
}

export function createAttacker({ camoColor = 'BLUE', characterModel = 1, scale = 0.42 } = {}) {
  const figure = buildCharacter(characterModel, camoColor);
  const body = figure.userData.body || MALE;
  figure.scale.setScalar(scale * (body === FEMALE ? 0.96 : 1));
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
    const isSkin = hexNum === new THREE.Color(CLAY_SKIN).getHex() || hexNum === new THREE.Color(COLORS.WHITE).getHex();
    const isInk = hexNum < 0x222222;
    if (isSkin || isInk) return;
    const current = `#${child.material.color.getHexString().toUpperCase()}`;
    const gameplay = Object.values(GAME_COLORS).map((h) => h.replace('#', '').toUpperCase());
    if (gameplay.some((g) => current.endsWith(g))) child.material.color.set(hex);
  });
}

export const RUN_GAIT_SPEED = 1.35;

export function tickCharacter(figure, elapsed, motion = null) {
  if (!figure) return;
  const rig = figure.userData.rig;
  if (!rig) return;
  const body = figure.userData.body || MALE;
  const dt = Math.min(0.05, Math.max(0.001, motion?.dt ?? 0.016));
  const speed = Math.max(0, motion?.speed ?? 0);
  const gait =
    figure.userData.gait ||
    (figure.userData.gait = { phase: 0, amp: 0, lean: 0, run: 0, bob: 0 });

  const targetAmp = Math.min(1.25, speed);
  gait.amp += (targetAmp - gait.amp) * (1 - Math.exp(-9 * dt));
  const runTarget = speed > RUN_GAIT_SPEED ? 1 : 0;
  gait.run += (runTarget - gait.run) * (1 - Math.exp(-6 * dt));

  const cadence = (5.6 + speed * 3.4) * body.hz;
  if (speed > 0.04) {
    gait.phase += dt * cadence;
  } else if (gait.amp > 0.015) {
    const rest = Math.round(gait.phase / Math.PI) * Math.PI;
    gait.phase += (rest - gait.phase) * (1 - Math.exp(-8 * dt));
  }

  const s = Math.sin(gait.phase);
  const c = Math.cos(gait.phase);
  const liftL = Math.max(0, s);
  const liftR = Math.max(0, -s);
  const idle = 1 - Math.min(1, gait.amp);
  const breathe = Math.sin(elapsed * 1.55);
  const stride = body.stride * gait.amp;
  const bobTarget = Math.abs(s) * (0.042 + gait.run * 0.035) * gait.amp;
  gait.bob += (bobTarget - gait.bob) * (1 - Math.exp(-12 * dt));

  const legSwing = (0.52 + gait.run * 0.28) * stride;
  rig.leftLeg.rotation.x = s * legSwing;
  rig.rightLeg.rotation.x = -s * legSwing;

  if (rig.leftShin) rig.leftShin.rotation.x = 0.06 * idle + liftL * (0.62 + gait.run * 0.32) * stride;
  if (rig.rightShin) rig.rightShin.rotation.x = 0.06 * idle + liftR * (0.62 + gait.run * 0.32) * stride;

  const leftRestZ = rig.leftArm.userData.restZ ?? -0.52;
  const rightRestZ = rig.rightArm.userData.restZ ?? 0.52;

  if (motion?.picking) {
    rig.leftArm.rotation.x = -0.7;
    rig.rightArm.rotation.x = -1.25;
    rig.leftArm.rotation.z = -0.15;
    rig.rightArm.rotation.z = 0.35;
    if (rig.leftFore) rig.leftFore.rotation.x = 0.4;
    if (rig.rightFore) rig.rightFore.rotation.x = 0.55;
    rig.root.position.y = -0.12 + gait.bob;
  } else if (motion?.carrying) {
    rig.leftArm.rotation.x = -1.05 + s * 0.05 * gait.amp;
    rig.rightArm.rotation.x = -1.18 - s * 0.04 * gait.amp;
    rig.leftArm.rotation.z = -0.28;
    rig.rightArm.rotation.z = 0.32;
    if (rig.leftFore) rig.leftFore.rotation.x = 0.35;
    if (rig.rightFore) rig.rightFore.rotation.x = 0.4;
    rig.root.position.y = gait.bob + breathe * 0.01 * idle;
  } else {
    const armSwing = (0.48 + gait.run * 0.32) * stride;
    rig.leftArm.rotation.x = 0.06 - s * armSwing;
    rig.rightArm.rotation.x = 0.06 + s * armSwing;
    const tuck = Math.abs(leftRestZ) - gait.amp * 0.12 - gait.run * 0.1;
    rig.leftArm.rotation.z = -tuck + breathe * 0.025 * idle;
    rig.rightArm.rotation.z = tuck - breathe * 0.025 * idle;
    if (rig.leftFore) {
      const rest = rig.leftFore.userData.restX ?? 0.12;
      rig.leftFore.rotation.x = rest + liftR * 0.28 * stride;
    }
    if (rig.rightFore) {
      const rest = rig.rightFore.userData.restX ?? 0.12;
      rig.rightFore.rotation.x = rest + liftL * 0.28 * stride;
    }
    rig.root.position.y = gait.bob + breathe * 0.012 * idle;
  }

  const targetLean = speed > 0.04 ? (0.04 + gait.run * 0.14) * body.lean : 0;
  gait.lean += (targetLean - gait.lean) * (1 - Math.exp(-5.5 * dt));
  rig.root.rotation.x = gait.lean;
  rig.root.rotation.z = -s * 0.028 * stride + breathe * 0.012 * idle * (body === FEMALE ? 1.15 : 0.7);
  rig.head.rotation.x = -gait.lean * 0.55 + breathe * 0.018 * idle;
  rig.head.rotation.y = c * 0.04 * stride;

  if (rig.hairTail) {
    rig.hairTail.rotation.x = 0.12 + s * 0.18 * stride + breathe * 0.04 * idle;
    rig.hairTail.rotation.z = c * 0.08 * stride;
  }
}
