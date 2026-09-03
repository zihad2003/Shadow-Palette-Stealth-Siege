import * as THREE from 'three';
import { clayMat, BASE_CLAY } from './clayMaterials.js';
import { COLORS } from '../colors.js';

export const FOOTPRINTS = {
  CRAFT_HOUSE: { w: 4, h: 4 },
  INK_HOUSE: { w: 3, h: 3 },
  SLEEP_HOUSE: { w: 3, h: 3 },
  COIN_GENERATOR: { w: 4, h: 3 },
  MAKEUP_HOUSE: { w: 3, h: 3 },
};

export function getFootprint(type) {
  return FOOTPRINTS[type] || { w: 2, h: 2 };
}

function roofFor(group, w, d, wallH, mat) {
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, 0.9, 4), mat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = wallH + 0.45;
  roof.castShadow = true;
  group.add(roof);
}

// Each house: paintable body in hexColor, fixed clay accents for identity.
export function buildHouse(type, hexColor = COLORS.WHITE, level = 1) {
  const group = new THREE.Group();
  const { w, h } = getFootprint(type);
  const bw = w * 0.82;
  const bd = h * 0.82;
  const wallH = 0.95 + level * 0.12;
  const body = clayMat(hexColor);
  const ink = clayMat(BASE_CLAY.ink);
  const wood = clayMat(BASE_CLAY.wood);
  const accent = clayMat(BASE_CLAY.accent);

  const walls = new THREE.Mesh(new THREE.BoxGeometry(bw, wallH, bd), body);
  walls.position.y = wallH / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, 0.08), wood);
  door.position.set(0, 0.3, bd / 2 + 0.03);
  group.add(door);

  if (type === 'MAKEUP_HOUSE') {
    roofFor(group, bw, bd, wallH, clayMat(COLORS.WHITE));
    // Palette blobs on the roof ridge — the recamo shop
    [COLORS.YELLOW, COLORS.GREEN, COLORS.RED, COLORS.BLUE].forEach((hex, i) => {
      const blob = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), clayMat(hex));
      blob.position.set(-0.45 + i * 0.3, wallH + 0.95, 0);
      blob.castShadow = true;
      group.add(blob);
    });
    const brush = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), wood);
    brush.position.set(bw / 2 + 0.15, wallH * 0.8, 0);
    brush.rotation.z = 0.5;
    group.add(brush);
  } else if (type === 'SLEEP_HOUSE') {
    roofFor(group, bw, bd, wallH, ink);
    const moon = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 8, 18, Math.PI * 1.3), accent);
    moon.position.set(0, wallH + 1.05, 0);
    moon.rotation.z = 0.6;
    group.add(moon);
  } else if (type === 'INK_HOUSE') {
    const vat = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.7, 14), ink);
    vat.position.set(0, wallH + 0.35, 0);
    vat.castShadow = true;
    group.add(vat);
    const drip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), ink);
    drip.position.set(0.4, wallH + 0.1, 0.4);
    group.add(drip);
  } else if (type === 'CRAFT_HOUSE') {
    roofFor(group, bw, bd, wallH, wood);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), clayMat(BASE_CLAY.stone));
    chimney.position.set(bw * 0.28, wallH + 0.8, -bd * 0.2);
    chimney.castShadow = true;
    group.add(chimney);
    const gear = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.09, 8, 12), accent);
    gear.position.set(0, wallH + 0.2, bd / 2 + 0.05);
    group.add(gear);
  } else if (type === 'COIN_GENERATOR') {
    roofFor(group, bw, bd, wallH, accent);
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.09, 18), clayMat(COLORS.YELLOW));
    coin.rotation.x = Math.PI / 2;
    coin.position.set(0, wallH + 1.1, 0);
    coin.castShadow = true;
    group.add(coin);
  } else {
    roofFor(group, bw, bd, wallH, ink);
  }

  // Level pips beside the door
  for (let i = 0; i < level; i++) {
    const pip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), accent);
    pip.position.set(-bw / 2 + 0.2 + i * 0.2, 0.12, bd / 2 + 0.06);
    group.add(pip);
  }

  return group;
}

export function createSelectRing() {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.07, 10, 36),
    new THREE.MeshBasicMaterial({ color: BASE_CLAY.accent, transparent: true, opacity: 0.9 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  ring.visible = false;
  return ring;
}

export function createUpgradeBadge() {
  const badge = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.34, 4),
    new THREE.MeshBasicMaterial({ color: BASE_CLAY.accent })
  );
  badge.visible = false;
  return badge;
}
