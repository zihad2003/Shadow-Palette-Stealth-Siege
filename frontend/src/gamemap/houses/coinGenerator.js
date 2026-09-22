import * as THREE from 'three';
import { GAME_COLORS } from '../../colors.js';
import { houseRoofHex } from '../houseCatalog.js';
import {
  KIT,
  add,
  addBanner,
  addCoin,
  addCottageFrame,
  addLantern,
  addLevelExtras,
  addRubble,
  box,
  clothColor,
  houseSpan,
} from '../houseKit.js';

function buildCoin({ hexColor, level = 1, footprintW = 3, footprintH = 3, smashed = false }) {
  const group = new THREE.Group();
  group.userData.buildingType = 'COIN_GENERATOR';
  const { bw, bd } = houseSpan(footprintW, footprintH);
  const cloth = clothColor(hexColor, GAME_COLORS.YELLOW);
  const { bodyW, bodyD } = addCottageFrame(group, {
    bw,
    bd,
    smashed,
    wall: KIT.stoneLt,
    roofHex: houseRoofHex('COIN_GENERATOR', cloth),
  });

  const chest = box(0.42, smashed ? 0.1 : 0.18, 0.28, KIT.wood, 0.03);
  chest.position.set(bodyW * 0.48, smashed ? 0.14 : 0.2, 0.1);
  if (smashed) chest.rotation.z = -0.18;
  add(group, chest);
  const lid = box(0.42, 0.05, 0.28, KIT.woodDark, 0.02);
  lid.position.set(bodyW * 0.48, smashed ? 0.16 : 0.3, 0.1);
  lid.rotation.x = smashed ? 0.5 : -0.35;
  add(group, lid);
  const n = smashed ? 4 : 8 + (level >= 2 ? 2 : 0);
  for (let i = 0; i < n; i++) {
    addCoin(group, bodyW * 0.4 + (i % 3) * 0.08, smashed ? 0.18 : 0.34 + Math.floor(i / 3) * 0.04, 0.02 + Math.floor(i / 3) * 0.08, {
      scale: 0.95,
      spin: 0.7 + i * 0.08,
    });
  }

  addLantern(group, -bodyW * 0.08, 0.68, bodyD * 0.42, { hanging: true, level, smashed });
  addBanner(group, bodyW * 0.48, smashed ? 0.86 : 1.14, -0.06, { hex: cloth, torn: smashed, emblem: 'crown' });
  if (smashed) addRubble(group, 0.06, 0.14, -0.1, 5);
  addLevelExtras(group, level, bw, bd, hexColor);
  return group;
}

export function buildIntact(opts) {
  return buildCoin({ ...opts, smashed: false });
}

export function buildDestroyed(opts) {
  const g = buildCoin({ ...opts, smashed: true });
  g.userData.ruined = true;
  return g;
}
