import * as THREE from 'three';
import { GAME_COLORS } from '../../colors.js';
import { houseRoofHex } from '../houseCatalog.js';
import {
  KIT,
  add,
  addBanner,
  addCottageFrame,
  addLantern,
  addLevelExtras,
  addRubble,
  box,
  clothColor,
  houseSpan,
  markCloth,
} from '../houseKit.js';

function addBed(group, x, y, z, smashed, yaw = 0) {
  const g = new THREE.Group();
  const frame = box(0.5, 0.08, 0.28, KIT.wood, 0.02);
  frame.position.y = smashed ? -0.02 : 0;
  if (smashed) frame.rotation.z = 0.16;
  add(g, frame);
  const mattress = box(0.44, 0.06, 0.24, smashed ? KIT.stoneDk : KIT.bedding, 0.02);
  mattress.position.y = 0.07;
  markCloth(mattress);
  add(g, mattress);
  const pillow = box(0.14, 0.06, 0.16, KIT.pillow, 0.015);
  pillow.position.set(0.14, 0.12, 0);
  if (smashed) pillow.rotation.set(0.4, 0.2, 0.3);
  add(g, pillow);
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  group.add(g);
}

function buildSleep({ hexColor, level = 1, footprintW = 3, footprintH = 3, smashed = false }) {
  const group = new THREE.Group();
  group.userData.buildingType = 'SLEEP_HOUSE';
  const { bw, bd } = houseSpan(footprintW, footprintH);
  const cloth = clothColor(hexColor, GAME_COLORS.BLUE);
  const { bodyW, bodyD } = addCottageFrame(group, {
    bw,
    bd,
    smashed,
    wall: KIT.cream,
    roofHex: houseRoofHex('SLEEP_HOUSE', cloth),
  });

  addBed(group, bodyW * 0.42, 0.22, 0.12, smashed);
  addBed(group, bodyW * 0.42, 0.22, -0.18, smashed, smashed ? 0.2 : 0.08);
  const roll = box(0.2, smashed ? 0.08 : 0.14, 0.14, cloth, 0.03);
  roll.position.set(-bodyW * 0.48, 0.2, bodyD * 0.12);
  markCloth(roll);
  add(group, roll);

  addLantern(group, -bodyW * 0.12, 0.7, bodyD * 0.42, { hanging: true, level, smashed });
  addBanner(group, bodyW * 0.46, smashed ? 0.9 : 1.18, 0.04, { hex: cloth, torn: smashed, emblem: 'pillow' });
  if (smashed) addRubble(group, 0.08, 0.14, 0.12, 5);
  addLevelExtras(group, level, bw, bd, hexColor);
  return group;
}

export function buildIntact(opts) {
  return buildSleep({ ...opts, smashed: false });
}

export function buildDestroyed(opts) {
  const g = buildSleep({ ...opts, smashed: true, hexColor: opts.hexColor });
  g.userData.ruined = true;
  return g;
}
