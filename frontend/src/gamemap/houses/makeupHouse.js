import * as THREE from 'three';
import { GAME_COLORS, GAME_COLOR_KEYS } from '../../colors.js';
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
  clay,
  clothColor,
  cyl,
  houseSpan,
  markCloth,
} from '../houseKit.js';

function buildMakeup({ hexColor, level = 1, footprintW = 3, footprintH = 3, smashed = false }) {
  const group = new THREE.Group();
  group.userData.buildingType = 'MAKEUP_HOUSE';
  const { bw, bd } = houseSpan(footprintW, footprintH);
  const cloth = clothColor(hexColor, GAME_COLORS.PURPLE);
  const { bodyW, bodyD } = addCottageFrame(group, {
    bw,
    bd,
    smashed,
    wall: KIT.plaster,
    roofHex: houseRoofHex('MAKEUP_HOUSE', cloth),
  });

  const mirror = box(0.42, smashed ? 0.28 : 0.55, 0.06, KIT.stoneLt);
  mirror.position.set(0, smashed ? 0.32 : 0.52, bodyD * 0.36);
  if (smashed) mirror.rotation.z = 0.35;
  add(group, mirror);
  const glass = box(0.3, smashed ? 0.16 : 0.38, 0.02, '#C9D4E8');
  glass.position.set(0, smashed ? 0.34 : 0.56, bodyD * 0.4);
  add(group, glass);

  GAME_COLOR_KEYS.forEach((key, i) => {
    const pot = cyl(0.07, 0.08, smashed ? 0.08 : 0.14, GAME_COLORS[key], 10);
    pot.position.set(-bodyW * 0.42 + i * 0.16, smashed ? 0.1 : 0.16, -bodyD * 0.22);
    if (smashed && i % 2 === 0) pot.rotation.z = 0.6;
    markCloth(pot);
    add(group, pot);
  });

  const stool = cyl(0.1, 0.12, 0.08, KIT.wood, 10);
  stool.position.set(bodyW * 0.28, 0.08, 0.05);
  if (smashed) stool.rotation.x = 0.8;
  add(group, stool);

  addLantern(group, -bodyW * 0.08, 0.72, bodyD * 0.42, { hanging: true, level, smashed });
  addBanner(group, bodyW * 0.46, smashed ? 0.82 : 1.12, -0.02, { hex: cloth, torn: smashed, emblem: 'drop' });
  if (smashed) addRubble(group, 0.02, 0.12, 0.06, 4);
  addLevelExtras(group, level, bw, bd, hexColor);
  return group;
}

export function buildIntact(opts) {
  return buildMakeup({ ...opts, smashed: false });
}

export function buildDestroyed(opts) {
  const group = buildMakeup({ ...opts, smashed: true });
  group.userData.ruined = true;
  return group;
}
