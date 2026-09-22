import * as THREE from 'three';
import { GAME_COLORS } from '../../colors.js';
import { houseRoofHex } from '../houseCatalog.js';
import {
  KIT,
  add,
  addBanner,
  addBarrel,
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
  markMotion,
} from '../houseKit.js';

function addDrop(group, x, y, z, hex, scale = 1) {
  const mat = clay(hex, { emissive: hex, emissiveIntensity: 0.18 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05 * scale, 10, 8), mat);
  bulb.position.set(x, y, z);
  markCloth(bulb);
  add(group, bulb);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.034 * scale, 0.07 * scale, 8), mat);
  tip.position.set(x, y - 0.06 * scale, z);
  add(group, tip);
}

function buildInk({ hexColor, level = 1, footprintW = 3, footprintH = 3, smashed = false }) {
  const group = new THREE.Group();
  group.userData.buildingType = 'INK_HOUSE';
  const { bw, bd } = houseSpan(footprintW, footprintH);
  const cloth = clothColor(hexColor, GAME_COLORS.PURPLE);
  const { bodyW, bodyD } = addCottageFrame(group, {
    bw,
    bd,
    smashed,
    wall: KIT.plaster,
    roofHex: houseRoofHex('INK_HOUSE', cloth),
  });

  const well = cyl(smashed ? 0.12 : 0.16, smashed ? 0.12 : 0.2, smashed ? 0.16 : 0.22, KIT.purple, 14);
  well.position.set(0, smashed ? 1.12 : 1.42, 0);
  if (smashed) well.rotation.z = 0.28;
  add(group, well);
  addDrop(group, 0, smashed ? 1.28 : 1.62, 0, KIT.purple, 1.1);

  ['YELLOW', 'PURPLE', 'RED'].forEach((key, i) => {
    const hex = GAME_COLORS[key];
    const tank = cyl(0.08, 0.09, smashed ? 0.12 : 0.26, hex, 10);
    tank.position.set(bodyW * 0.52, smashed ? 0.16 : 0.24, -0.16 + i * 0.16);
    if (smashed && i === 2) tank.rotation.x = 1.1;
    add(group, tank);
    const drip = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      clay(hex, { emissive: hex, emissiveIntensity: 0.35 })
    );
    drip.position.set(bodyW * 0.52, smashed ? 0.12 : 0.42, -0.16 + i * 0.16);
    markMotion(drip, 'bob', 1 + i * 0.1);
    drip.userData.baseY = drip.position.y;
    group.add(drip);
  });

  addBarrel(group, -bodyW * 0.5, smashed ? 0.14 : 0.2, 0.1, { smashed });
  addLantern(group, -bodyW * 0.1, 0.68, bodyD * 0.42, { hanging: true, level, smashed });
  addBanner(group, bodyW * 0.48, smashed ? 0.86 : 1.14, -0.04, { hex: cloth, torn: smashed, emblem: 'drop' });
  if (smashed) addRubble(group, 0.04, 0.14, 0.08, 4);
  addLevelExtras(group, level, bw, bd, hexColor);
  return group;
}

export function buildIntact(opts) {
  return buildInk({ ...opts, smashed: false });
}

export function buildDestroyed(opts) {
  const g = buildInk({ ...opts, smashed: true });
  g.userData.ruined = true;
  return g;
}
