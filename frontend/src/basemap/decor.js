import * as THREE from 'three';
import { clayMat, BASE_CLAY } from './clayMaterials.js';
import { COLORS } from '../colors.js';
import { WALL_EDGE } from './OuterWalls.js';

function rand(i, salt) {
  const s = Math.sin(i * 71.3 + salt * 29.7) * 43758.5453;
  return s - Math.floor(s);
}

export function createPineTree(scale = 1) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.5, 8), clayMat(BASE_CLAY.wood));
  trunk.position.y = 0.25;
  tree.add(trunk);
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5 - i * 0.13, 0.55, 10), clayMat('#1b4332'));
    cone.position.y = 0.62 + i * 0.38;
    cone.castShadow = true;
    tree.add(cone);
  }
  tree.scale.setScalar(scale);
  return tree;
}

export function createRockCluster(scale = 1) {
  const rocks = new THREE.Group();
  const mat = clayMat(BASE_CLAY.stone);
  for (let i = 0; i < 3; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + rand(i, 5) * 0.16), mat);
    rock.position.set((rand(i, 1) - 0.5) * 0.7, 0.14, (rand(i, 2) - 0.5) * 0.7);
    rock.castShadow = true;
    rocks.add(rock);
  }
  rocks.scale.setScalar(scale);
  return rocks;
}

export function createBannerPole() {
  const pole = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 2.0, 8), clayMat(BASE_CLAY.wood));
  shaft.position.y = 1.0;
  pole.add(shaft);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.04), clayMat(COLORS.RED));
  flag.position.set(0.34, 1.72, 0);
  pole.add(flag);
  return pole;
}

// Dressing scattered outside the walls (inside stays free for the player).
export function createDecorField() {
  const group = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const angle = rand(i, 11) * Math.PI * 2;
    const dist = WALL_EDGE + 2.5 + rand(i, 12) * 9;
    const item =
      i % 3 === 0 ? createRockCluster(0.9 + rand(i, 13)) : createPineTree(0.8 + rand(i, 14) * 0.8);
    item.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
    item.rotation.y = rand(i, 15) * Math.PI * 2;
    group.add(item);
  }
  const banner1 = createBannerPole();
  banner1.position.set(-2.4, 0, WALL_EDGE - 0.9);
  const banner2 = createBannerPole();
  banner2.position.set(2.4, 0, WALL_EDGE - 0.9);
  group.add(banner1, banner2);
  return group;
}
