import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GAME_COLORS } from '../colors.js';
import { TILE_SIZE, TILE_HEIGHT, TILE_PITCH, tileWorldPos, SEARCHLIGHT_TILE } from './mapConfig.js';

function clay(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0.04,
    ...extras,
  });
}

/** Compact clay house scaled to the GameMap tile pitch (raid-board look). */
export function buildGameHouse(type, hexColor = '#C9B79A', level = 1, footprintW = 2, footprintH = 2) {
  const group = new THREE.Group();
  const bw = footprintW * TILE_PITCH * 0.72;
  const bd = footprintH * TILE_PITCH * 0.72;
  const wallH = 0.55 + level * 0.1;
  const body = clay(hexColor);
  const wood = clay('#5C4636');
  const accent = clay('#F4A261');
  const ink = clay('#2A3A4A');

  const walls = new THREE.Mesh(new RoundedBoxGeometry(bw, wallH, bd, 2, 0.08), body);
  walls.position.y = wallH / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  const door = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.38, 0.06, 1, 0.03), wood);
  door.position.set(0, 0.2, bd / 2 + 0.02);
  group.add(door);

  if (type === 'SLEEP_HOUSE') {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.62, 0.45, 4), ink);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = wallH + 0.22;
    roof.castShadow = true;
    group.add(roof);
  } else if (type === 'INK_HOUSE') {
    const vat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.4, 12), ink);
    vat.position.set(0, wallH + 0.2, 0);
    vat.castShadow = true;
    group.add(vat);
  } else if (type === 'CRAFT_HOUSE') {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.62, 0.45, 4), wood);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = wallH + 0.22;
    roof.castShadow = true;
    group.add(roof);
    const gear = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 12), accent);
    gear.position.set(0, wallH * 0.55, bd / 2 + 0.04);
    group.add(gear);
  } else if (type === 'COIN_GENERATOR') {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.62, 0.45, 4), accent);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = wallH + 0.22;
    roof.castShadow = true;
    group.add(roof);
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16), clay(GAME_COLORS.YELLOW));
    coin.rotation.x = Math.PI / 2;
    coin.position.set(0, wallH + 0.55, 0);
    coin.castShadow = true;
    group.add(coin);
  } else {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.62, 0.45, 4), clay('#8D5CC7'));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = wallH + 0.22;
    roof.castShadow = true;
    group.add(roof);
  }

  for (let i = 0; i < level; i++) {
    const pip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), accent);
    pip.position.set(-bw / 2 + 0.12 + i * 0.14, 0.08, bd / 2 + 0.04);
    group.add(pip);
  }

  return group;
}

export function placeHouseOnTile(house, xPos, yPos, footprintW, footprintH) {
  const cx = xPos + (footprintW - 1) / 2;
  const cy = yPos + (footprintH - 1) / 2;
  const p = tileWorldPos(cx, cy);
  house.position.set(p.x, TILE_HEIGHT, p.z);
  return house;
}

/** Patrol bot that orbits the searchlight on the GameMap board. */
export function createGamePatrolRobot() {
  const bot = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.28, 4, 10), clay('#7A7772'));
  body.position.y = 0.4;
  body.castShadow = true;
  bot.add(body);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 10),
    new THREE.MeshStandardMaterial({
      color: GAME_COLORS.RED,
      emissive: new THREE.Color(GAME_COLORS.RED),
      emissiveIntensity: 0.7,
    })
  );
  eye.position.set(0, 0.55, 0.16);
  bot.add(eye);

  const radius = TILE_SIZE * 2.4;
  return {
    object: bot,
    update(elapsed) {
      const a = elapsed * 0.45;
      const p = tileWorldPos(SEARCHLIGHT_TILE.column, SEARCHLIGHT_TILE.row);
      bot.position.set(p.x + Math.cos(a) * radius, TILE_HEIGHT, p.z + Math.sin(a) * radius);
      bot.rotation.y = -a - Math.PI / 2;
    },
  };
}
