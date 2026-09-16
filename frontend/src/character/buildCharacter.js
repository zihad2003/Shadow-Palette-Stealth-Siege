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

/** Head pivots at the neck so gait sway / nods look natural. */
const HEAD_PIVOT_Y = 1.45;
/** Convert a world-space Y (figure at origin) to head-group local Y. */
const hy = (worldY) => worldY - HEAD_PIVOT_Y;

const HAIR_HEX = '#2A1F1E';
const MOUTH_HEX = '#5A3A3A';
const CHEEK_HEX = '#F2A08A';

/** Find the forearm sub-group of an arm built by createArm. */
function forearmOf(arm) {
  return arm?.children.find((c) => c.isGroup) || null;
}

function buildCore(camo, skin, ink, accent) {
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

  // Crossed chest straps
  [-1, 1].forEach((side) => {
    const strap = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.66, 0.04), ink));
    strap.position.set(side * 0.02, 1.0, 0.315);
    strap.rotation.z = side * 0.6;
    root.add(strap);
  });
  const strapPin = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), accent));
  strapPin.rotation.x = Math.PI / 2;
  strapPin.position.set(0, 1.0, 0.34);
  root.add(strapPin);

  // Neck
  const neck = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 12), skin));
  neck.position.y = 1.38;
  root.add(neck);

  // Head group — everything on the head rides this pivot
  const headGroup = new THREE.Group();
  headGroup.name = 'Head';
  headGroup.position.y = HEAD_PIVOT_Y;
  root.add(headGroup);

  const head = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 20), skin));
  head.position.y = hy(1.62);
  headGroup.add(head);

  // Hair cap (peeks out under hats / hoods)
  const hair = addShadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.312, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), clayMat(HAIR_HEX))
  );
  hair.position.set(0, hy(1.63), -0.02);
  hair.rotation.x = -0.12;
  headGroup.add(hair);

  // Ears
  const earGeo = new THREE.SphereGeometry(0.07, 10, 10);
  const leftEar = addShadow(new THREE.Mesh(earGeo, skin));
  leftEar.position.set(-0.28, hy(1.62), 0);
  leftEar.scale.set(0.55, 1, 0.7);
  const rightEar = leftEar.clone();
  rightEar.position.x = 0.28;
  headGroup.add(leftEar, rightEar);

  // Eyes with iris + catchlight, expressive brows
  const eyeWhite = clayMat('#F8F4EC');
  const catchlight = clayMat('#FFFFFF', { emissive: new THREE.Color('#FFFFFF'), emissiveIntensity: 0.6 });
  [-0.1, 0.1].forEach((x) => {
    const socket = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), eyeWhite));
    socket.position.set(x, hy(1.64), 0.24);
    headGroup.add(socket);
    const iris = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), ink));
    iris.position.set(x, hy(1.645), 0.285);
    headGroup.add(iris);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), catchlight);
    spark.position.set(x + 0.012, hy(1.66), 0.308);
    headGroup.add(spark);

    const brow = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.04), clayMat(HAIR_HEX)));
    brow.position.set(x, hy(1.725), 0.255);
    brow.rotation.z = -x * 1.4;
    headGroup.add(brow);
  });

  // Nose, mouth, cheeks
  const nose = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), skin));
  nose.position.set(0, hy(1.59), 0.3);
  headGroup.add(nose);

  const mouth = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14, Math.PI), clayMat(MOUTH_HEX)));
  mouth.position.set(0, hy(1.525), 0.272);
  mouth.rotation.set(0.15, 0, Math.PI);
  headGroup.add(mouth);

  const cheekMat = clayMat(CHEEK_HEX, { transparent: true, opacity: 0.55, roughness: 0.8 });
  [-0.17, 0.17].forEach((x) => {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), cheekMat);
    cheek.position.set(x, hy(1.565), 0.215);
    cheek.scale.set(1, 0.7, 0.45);
    headGroup.add(cheek);
  });

  // Continuous arms (shoulder → elbow → wrist → hand) — no floating segments
  const leftArm = createArm(camo, ink, -1);
  leftArm.position.set(-0.4, 1.22, 0);
  const rightArm = createArm(camo, ink, 1);
  rightArm.position.set(0.4, 1.22, 0);
  root.add(leftArm, rightArm);

  // Legs — pivoted at the hip so they can swing while walking
  const leftLeg = createLeg(camo, ink, -1);
  const rightLeg = createLeg(camo, ink, 1);
  root.add(leftLeg, rightLeg);

  // Belt + buckle
  const belt = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 10, 24), ink));
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.7;
  root.add(belt);
  const buckle = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.05), accent));
  buckle.position.set(0, 0.7, 0.31);
  root.add(buckle);

  return {
    root,
    head: headGroup,
    torso,
    rig: { root, head: headGroup, torso, leftArm, rightArm, leftLeg, rightLeg },
  };
}

/** Hip-pivoted leg: local origin at hip (y≈0.48 world), foot sole at y≈-0.52. */
function createLeg(camo, ink, side = 1) {
  const leg = new THREE.Group();
  leg.name = side > 0 ? 'RightLeg' : 'LeftLeg';
  leg.position.set(side * 0.16, 0.48, 0.02);

  const hipBall = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), camo.clone()));
  markCamo(hipBall);
  leg.add(hipBall);

  const thigh = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 4, 10), camo.clone()));
  markCamo(thigh);
  thigh.position.set(0, -0.18, 0);
  leg.add(thigh);

  const knee = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), camo.clone()));
  markCamo(knee);
  knee.position.set(0, -0.31, 0.01);
  leg.add(knee);

  const shin = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.22, 4, 10), camo.clone()));
  markCamo(shin);
  shin.position.set(0, -0.4, 0.02);
  leg.add(shin);

  // Thigh strap
  const strap = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.018, 8, 18), ink));
  strap.rotation.x = Math.PI / 2;
  strap.position.set(0, -0.12, 0);
  leg.add(strap);

  // Boot: cuff, body, toe cap, sole
  const cuff = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.1, 0.06, 14), ink));
  cuff.position.set(0, -0.41, 0.03);
  leg.add(cuff);

  const boot = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.28), ink));
  boot.position.set(0, -0.46, 0.04);
  leg.add(boot);

  const toe = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), ink));
  toe.position.set(0, -0.47, 0.17);
  toe.scale.set(0.95, 0.7, 0.8);
  leg.add(toe);

  const sole = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.035, 0.31), clayMat('#3B3A38')));
  sole.position.set(0, -0.515, 0.05);
  leg.add(sole);

  return leg;
}

function dressShadowNinja(group, camo, ink, accent) {
  const rig = group.userData.rig;
  const head = rig.head;
  const steel = clayMat('#C9CDD2', { metalness: 0.65, roughness: 0.28 });

  // Deep hood — rides the head pivot
  // Open at the front so the eyes/mask stay visible
  const hood = addShadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16, Math.PI * 0.2, Math.PI * 1.6, 0, Math.PI * 0.6), ink)
  );
  hood.position.set(0, hy(1.66), -0.05);
  // Sphere gap sits at -X by default; quarter turn brings the opening to the face (+Z)
  hood.rotation.set(0.05, Math.PI / 2, 0);
  head.add(hood);

  // Hood cap over the crown
  const hoodTop = addShadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.32), ink)
  );
  hoodTop.position.set(0, hy(1.66), -0.05);
  head.add(hoodTop);

  // Hood rim framing the face
  const hoodRim = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.035, 8, 26, Math.PI * 1.1), ink));
  hoodRim.position.set(0, hy(1.66), 0.02);
  hoodRim.rotation.set(Math.PI / 2 - 0.35, 0, Math.PI * 0.95);
  head.add(hoodRim);

  // Hood peak
  const peak = addShadow(new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.26, 8), ink));
  peak.position.set(0, hy(1.95), -0.14);
  peak.rotation.x = -0.5;
  head.add(peak);

  // Face wrap / mask with camo stripe
  const mask = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.34), ink));
  mask.position.set(0, hy(1.48), 0.12);
  head.add(mask);
  const maskStripe = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.035, 0.35), camo.clone()));
  markCamo(maskStripe);
  maskStripe.position.set(0, hy(1.49), 0.12);
  head.add(maskStripe);

  // Headband knot tails at the back
  [-0.06, 0.06].forEach((x, i) => {
    const tail = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.02), camo.clone()));
    markCamo(tail);
    tail.position.set(x, hy(1.5), -0.33);
    tail.rotation.set(0.55, 0, i === 0 ? 0.25 : -0.25);
    head.add(tail);
  });

  // Scarf tails
  const scarf = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.08), camo.clone()));
  markCamo(scarf);
  scarf.position.set(0.22, 1.15, -0.2);
  scarf.rotation.set(0.35, 0.2, 0.4);
  group.add(scarf);
  const scarf2 = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.06), camo.clone()));
  markCamo(scarf2);
  scarf2.position.set(0.08, 1.12, -0.26);
  scarf2.rotation.set(0.45, -0.1, 0.15);
  group.add(scarf2);

  // Shoulder wraps
  [-0.42, 0.42].forEach((x, i) => {
    const wrap = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 8, 16), ink));
    wrap.position.set(x, 1.22, 0);
    wrap.rotation.z = i === 0 ? 0.5 : -0.5;
    group.add(wrap);
  });

  // Forearm wraps
  [rig.leftArm, rig.rightArm].forEach((arm) => {
    const fore = forearmOf(arm);
    if (!fore) return;
    [-0.14, -0.22, -0.3].forEach((y) => {
      const band = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.016, 6, 14), ink));
      band.rotation.x = Math.PI / 2;
      band.position.set(0, y, 0);
      fore.add(band);
    });
  });

  // Katana slung across the back
  const katana = new THREE.Group();
  katana.position.set(-0.12, 1.05, -0.34);
  katana.rotation.set(0.08, 0, 0.62);
  const blade = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.0, 0.014), steel));
  blade.position.y = 0.5;
  katana.add(blade);
  const guard = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 14), accent));
  katana.add(guard);
  const grip = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.028, 0.3, 10), ink));
  grip.position.y = -0.16;
  katana.add(grip);
  [-0.08, -0.16, -0.24].forEach((y) => {
    const wrap = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.008, 6, 12), camo.clone()));
    markCamo(wrap);
    wrap.rotation.x = Math.PI / 2;
    wrap.position.y = y;
    katana.add(wrap);
  });
  group.add(katana);

  // Kunai pouch + thigh kunai
  const pouch = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.1), accent));
  pouch.position.set(0.28, 0.68, 0.22);
  group.add(pouch);
  const kunai = addShadow(new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.16, 6), steel));
  kunai.position.set(0.11, -0.2, 0.07);
  kunai.rotation.set(0.1, 0, 0.1);
  rig.rightLeg.add(kunai);
}

function dressForestScout(group, camo, ink, accent) {
  const rig = group.userData.rig;
  const head = rig.head;
  const leather = clayMat('#7A5230', { roughness: 0.7 });
  const rope = clayMat('#C9A86A', { roughness: 0.85 });

  // Scout cap + brim + button
  const cap = addShadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), camo.clone())
  );
  markCamo(cap);
  cap.position.y = hy(1.78);
  head.add(cap);

  const brim = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.04, 20), camo.clone()));
  markCamo(brim);
  brim.position.set(0, hy(1.66), 0.08);
  head.add(brim);

  const capBand = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.02, 8, 24), leather));
  capBand.rotation.x = Math.PI / 2;
  capBand.position.y = hy(1.71);
  head.add(capBand);

  const button = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), ink));
  button.position.y = hy(1.96);
  head.add(button);

  // Feather tucked in the band
  const feather = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.015), accent));
  feather.position.set(0.25, hy(1.9), -0.06);
  feather.rotation.set(-0.3, 0, -0.55);
  head.add(feather);

  // Goggles on forehead
  const strap = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 20), ink));
  strap.position.y = hy(1.7);
  strap.rotation.x = Math.PI / 2;
  head.add(strap);
  [-0.1, 0.1].forEach((x) => {
    const rim = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 14), ink));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, hy(1.72), 0.27);
    head.add(rim);
    const lens = addShadow(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.056, 14),
        clayMat('#72B83F', { metalness: 0.35, roughness: 0.3, emissive: new THREE.Color('#2F5A1A'), emissiveIntensity: 0.3 })
      )
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, hy(1.72), 0.275);
    head.add(lens);
  });

  // Backpack with bedroll, rope coil, canteen
  const pack = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.22), leather));
  pack.position.set(0, 1.05, -0.28);
  group.add(pack);
  const packLid = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.24), accent));
  packLid.position.set(0, 1.28, -0.28);
  group.add(packLid);
  [-0.09, 0.09].forEach((x) => {
    const buckle = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.03), ink));
    buckle.position.set(x, 1.0, -0.4);
    group.add(buckle);
  });

  const bedroll = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.44, 14), camo.clone()));
  markCamo(bedroll);
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.set(0, 1.38, -0.3);
  group.add(bedroll);
  [-0.12, 0.12].forEach((x) => {
    const tie = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.012, 6, 14), rope));
    tie.rotation.y = Math.PI / 2;
    tie.position.set(x, 1.38, -0.3);
    group.add(tie);
  });

  const coil = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 8, 18), rope));
  coil.rotation.y = Math.PI / 2;
  coil.position.set(0.23, 1.02, -0.3);
  group.add(coil);

  const canteen = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.09, 14), ink));
  canteen.rotation.z = Math.PI / 2;
  canteen.position.set(-0.25, 0.98, -0.28);
  group.add(canteen);
  const canteenCap = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 8), accent));
  canteenCap.rotation.z = Math.PI / 2;
  canteenCap.position.set(-0.31, 0.98, -0.28);
  group.add(canteenCap);

  // Utility pouches on belt
  [-0.22, 0.22].forEach((x) => {
    const util = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.1), leather));
    util.position.set(x, 0.68, 0.26);
    group.add(util);
    const flap = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.035, 0.105), accent));
    flap.position.set(x, 0.72, 0.26);
    group.add(flap);
  });

  // Shoulder patches + arm badge
  [rig.leftArm, rig.rightArm].forEach((arm, i) => {
    const patch = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), accent));
    patch.position.set(0, -0.14, 0.09);
    arm.add(patch);
    if (i === 1) {
      const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 10), ink);
      badge.rotation.x = Math.PI / 2;
      badge.position.set(0, -0.14, 0.102);
      arm.add(badge);
    }
  });

  // Knee pads — ride with the legs
  [rig.leftLeg, rig.rightLeg].forEach((leg) => {
    const pad = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), ink));
    pad.position.set(0, -0.3, 0.1);
    pad.scale.set(1.1, 0.7, 0.6);
    leg.add(pad);
  });
}

function dressPhantomGhost(group, camo, ink, accent) {
  const rig = group.userData.rig;
  const head = rig.head;
  const camoHex = camo.color.getHex();
  const mist = clayMat(camoHex, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.7 });
  const glow = clayMat('#9FE7FF', { emissive: new THREE.Color('#9FE7FF'), emissiveIntensity: 0.9 });

  // Layered translucent cloak + inner robe
  const cloak = addShadow(new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.35, 16, 1, true), mist));
  markCamo(cloak);
  cloak.position.set(0, 0.95, -0.08);
  cloak.rotation.x = Math.PI;
  group.add(cloak);

  const robe = addShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.46, 0.75, 16, 1, true),
      clayMat(camoHex, { transparent: true, opacity: 0.4, side: THREE.DoubleSide, roughness: 0.8 })
    )
  );
  markCamo(robe);
  robe.position.set(0, 0.58, 0);
  group.add(robe);

  // Tattered hem
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const tatter = addShadow(new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 5), mist.clone()));
    markCamo(tatter);
    tatter.position.set(Math.sin(a) * 0.52, 0.26, Math.cos(a) * 0.52 - 0.08);
    tatter.rotation.set(Math.PI + (i % 2 ? 0.18 : -0.12), 0, (i % 3) * 0.1);
    group.add(tatter);
  }

  // Rune belt
  const runeBelt = addShadow(
    new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.028, 10, 28),
      clayMat('#F4A261', { emissive: new THREE.Color('#F4A261'), emissiveIntensity: 0.5 })
    )
  );
  runeBelt.rotation.x = Math.PI / 2;
  runeBelt.position.y = 0.74;
  group.add(runeBelt);

  // Inner veil + glowing eyes
  const veil = addShadow(
    new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.28),
      clayMat('#F1FAEE', { transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    )
  );
  veil.position.set(0, hy(1.55), 0.3);
  head.add(veil);
  [-0.1, 0.1].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), glow);
    eye.position.set(x, hy(1.645), 0.292);
    head.add(eye);
  });

  // Wisp horns
  [-1, 1].forEach((side) => {
    const horn = addShadow(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 7), mist.clone()));
    markCamo(horn);
    horn.position.set(side * 0.2, hy(1.92), -0.04);
    horn.rotation.z = side * -0.45;
    head.add(horn);
  });

  // Floating crest / halo
  const halo = addShadow(
    new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.045, 12, 28),
      clayMat('#F4A261', { emissive: new THREE.Color('#F4A261'), emissiveIntensity: 0.35 })
    )
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = hy(2.05);
  head.add(halo);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), glow);
    gem.position.set(Math.sin(a) * 0.26, hy(2.05), Math.cos(a) * 0.26);
    head.add(gem);
  }

  // Spirit orbs
  [-0.55, 0.55].forEach((x, i) => {
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

  // Fading spirit trail behind
  [0, 1, 2].forEach((i) => {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.09 - i * 0.02, 10, 8),
      clayMat(camoHex, { transparent: true, opacity: 0.32 - i * 0.09, roughness: 0.9 })
    );
    markCamo(puff);
    puff.position.set((i % 2 ? -1 : 1) * 0.08, 0.42 + i * 0.12, -0.5 - i * 0.12);
    group.add(puff);
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

  const { root, rig } = buildCore(camo, skin, ink, accent);
  group.add(root);
  group.userData.rig = rig;
  root.userData.rig = rig;

  // Outfits attach to the core so they bob/lean with the body during gait
  const id = Number(modelId) || 1;
  if (id === 2) dressForestScout(root, camo, ink, accent);
  else if (id === 3) dressPhantomGhost(root, camo, ink, accent);
  else dressShadowNinja(root, camo, ink, accent);

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

/** Speed (in walk units: 1 = normal walk) at which the run gait kicks in. */
export const RUN_GAIT_SPEED = 1.35;

/**
 * Animate the figure.
 * @param {THREE.Object3D} figure
 * @param {number} elapsed seconds since scene start
 * @param {{ dt?: number, speed?: number }} [motion] speed in walk units (0 idle, 1 walk, ~1.9 sprint)
 */
export function tickCharacter(figure, elapsed, motion = null) {
  if (!figure) return;
  figure.traverse((child) => {
    if (!child.userData.floatOrb) return;
    const phase = child.userData.floatPhase || 0;
    child.position.y = 1.35 + Math.sin(elapsed * 2.2 + phase) * 0.08;
  });

  const rig = figure.userData.rig;
  if (!rig) return;
  const dt = Math.min(0.05, Math.max(0.001, motion?.dt ?? 0.016));
  const speed = Math.max(0, motion?.speed ?? 0);
  const gait =
    figure.userData.gait || (figure.userData.gait = { phase: 0, amp: 0, lean: 0, run: 0 });

  // Amplitude eases in/out so starts and stops don't snap
  const targetAmp = Math.min(1.3, speed);
  gait.amp += (targetAmp - gait.amp) * (1 - Math.exp(-11 * dt));
  const runTarget = speed > RUN_GAIT_SPEED ? 1 : 0;
  gait.run += (runTarget - gait.run) * (1 - Math.exp(-7 * dt));

  if (speed > 0.04) {
    gait.phase += dt * (6.8 + speed * 4.2);
  } else if (gait.amp > 0.02) {
    // Glide legs back toward the neutral pose when stopping
    const rest = Math.round(gait.phase / Math.PI) * Math.PI;
    gait.phase += (rest - gait.phase) * (1 - Math.exp(-10 * dt));
  }

  const s = Math.sin(gait.phase);
  const idle = 1 - Math.min(1, gait.amp);
  const breathe = Math.sin(elapsed * 1.7);
  const bob = Math.abs(s) * (0.05 + gait.run * 0.04) * gait.amp;

  // Legs swing opposite each other; run adds more stride + knee lift
  const legSwing = (0.62 + gait.run * 0.3) * gait.amp;
  rig.leftLeg.rotation.x = s * legSwing;
  rig.rightLeg.rotation.x = -s * legSwing;

  // Arms counter-swing, tuck in while running
  if (motion?.picking) {
    rig.leftArm.rotation.x = -0.7;
    rig.rightArm.rotation.x = -1.25;
    rig.leftArm.rotation.z = -0.15;
    rig.rightArm.rotation.z = 0.35;
    rig.root.position.y = -0.12 + bob;
  } else if (motion?.carrying) {
    rig.leftArm.rotation.x = -1.05 + s * 0.06 * gait.amp;
    rig.rightArm.rotation.x = -1.18 - s * 0.04 * gait.amp;
    rig.leftArm.rotation.z = -0.28;
    rig.rightArm.rotation.z = 0.32;
    rig.root.position.y = bob + breathe * 0.012 * idle;
  } else {
    const armSwing = (0.55 + gait.run * 0.35) * gait.amp;
    rig.leftArm.rotation.x = 0.08 - s * armSwing;
    rig.rightArm.rotation.x = 0.08 + s * armSwing;
    const tuck = 0.55 - gait.amp * 0.16 - gait.run * 0.12;
    rig.leftArm.rotation.z = -tuck + breathe * 0.03 * idle;
    rig.rightArm.rotation.z = tuck - breathe * 0.03 * idle;
    rig.root.position.y = bob + breathe * 0.012 * idle;
  }

  // Forward lean when running, hint of sway while walking
  const targetLean = speed > 0.04 ? 0.05 + gait.run * 0.16 : 0;
  gait.lean += (targetLean - gait.lean) * (1 - Math.exp(-6 * dt));
  rig.root.rotation.x = gait.lean;
  rig.root.rotation.z = -s * 0.035 * gait.amp;

  // Head steadies against the bob
  rig.head.rotation.x = -gait.lean * 0.6 + breathe * 0.02 * idle;
}
