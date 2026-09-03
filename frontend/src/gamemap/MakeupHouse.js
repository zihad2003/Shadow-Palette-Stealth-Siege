import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GAME_COLORS, GAME_COLOR_KEYS } from '../colors.js';
import { GRID_WIDTH, GRID_DEPTH, TILE_HEIGHT, MAP_COLORS } from './mapConfig.js';

function clay(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0.04,
    ...extras,
  });
}

/**
 * Clay Makeup House — sits on the slab just inside the south-west wall,
 * off the paintable grid so every tile stays a paint target.
 */
export function createMakeupHouse() {
  const house = new THREE.Group();
  house.name = 'MakeupHouse';
  house.userData.isMakeupHouse = true;

  house.position.set(-GRID_WIDTH / 2 + 0.85, TILE_HEIGHT, GRID_DEPTH / 2 - 0.7);

  const body = new THREE.Mesh(new RoundedBoxGeometry(1.35, 0.85, 1.15, 2, 0.1), clay('#C9B79A'));
  body.position.y = 0.42;
  body.castShadow = true;
  body.userData.isMakeupHouse = true;
  house.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.55, 4), clay('#8D5CC7'));
  roof.position.y = 1.08;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  roof.userData.isMakeupHouse = true;
  house.add(roof);

  const door = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.48, 0.08, 1, 0.04), clay('#5C4636'));
  door.position.set(0, 0.28, 0.58);
  door.userData.isMakeupHouse = true;
  house.add(door);

  const awning = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.08, 0.28, 1, 0.04), clay('#E5B93D'));
  awning.position.set(0, 0.62, 0.62);
  house.add(awning);

  GAME_COLOR_KEYS.forEach((key, i) => {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), clay(GAME_COLORS[key]));
    blob.position.set(-0.36 + i * 0.18, 0.9, 0.42);
    blob.userData.isMakeupHouse = true;
    house.add(blob);
  });

  const sign = new THREE.Mesh(
    new RoundedBoxGeometry(0.7, 0.22, 0.06, 1, 0.03),
    clay(MAP_COLORS.wallStone)
  );
  sign.position.set(0, 0.78, 0.6);
  house.add(sign);

  house.traverse((child) => {
    if (child.isMesh) child.userData.isMakeupHouse = true;
  });

  return house;
}
