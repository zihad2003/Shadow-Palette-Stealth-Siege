import * as THREE from 'three';
import { GAME_COLORS } from '../../colors.js';
import { houseRoofHex } from '../houseCatalog.js';
import {
  KIT,
  add,
  addAnvil,
  addBanner,
  addBarrel,
  addCottageFrame,
  addCrate,
  addLantern,
  addLevelExtras,
  addRubble,
  box,
  clothColor,
  houseSpan,
} from '../houseKit.js';

function addHammer(group, x, y, z, rot = 0) {
  const handle = box(0.035, 0.22, 0.035, KIT.wood, 0.01);
  handle.position.set(x, y, z);
  handle.rotation.z = rot;
  add(group, handle);
  const head = box(0.16, 0.07, 0.07, KIT.iron, 0.015);
  head.position.set(x + Math.sin(rot) * 0.12, y + Math.cos(rot) * 0.12, z);
  head.rotation.z = rot;
  add(group, head);
}

function buildCraft({ hexColor, level = 1, footprintW = 3, footprintH = 3, smashed = false }) {
  const group = new THREE.Group();
  group.userData.buildingType = 'CRAFT_HOUSE';
  const { bw, bd } = houseSpan(footprintW, footprintH);
  const cloth = clothColor(hexColor, GAME_COLORS.GREEN);
  const { bodyW, bodyD } = addCottageFrame(group, {
    bw,
    bd,
    smashed,
    wall: KIT.woodPale,
    roofHex: houseRoofHex('CRAFT_HOUSE', cloth),
  });

  addAnvil(group, bodyW * 0.48, smashed ? 0.2 : 0.3, 0.18, { smashed });
  addCrate(group, -bodyW * 0.5, smashed ? 0.14 : 0.22, 0.12, { smashed });
  addBarrel(group, -bodyW * 0.48, smashed ? 0.12 : 0.2, -0.14, { smashed });
  addHammer(group, bodyW * 0.42, smashed ? 0.28 : 0.42, 0.32, smashed ? 1.05 : 0.35);
  addHammer(group, bodyW * 0.5, smashed ? 0.24 : 0.4, 0.08, -0.4);

  addLantern(group, -bodyW * 0.08, 0.68, bodyD * 0.42, { hanging: true, level, smashed });
  addBanner(group, bodyW * 0.48, smashed ? 0.86 : 1.14, -0.06, { hex: cloth, torn: smashed, emblem: 'hammer' });
  if (smashed) addRubble(group, 0.1, 0.14, 0.1, 5);
  addLevelExtras(group, level, bw, bd, hexColor);
  return group;
}

export function buildIntact(opts) {
  return buildCraft({ ...opts, smashed: false });
}

export function buildDestroyed(opts) {
  const g = buildCraft({ ...opts, smashed: true });
  g.userData.ruined = true;
  return g;
}
