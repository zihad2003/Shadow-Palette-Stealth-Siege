import * as THREE from 'three';
import { clayMat, CLAY } from './clayMaterials.js';

function houseBlock(w, h, d, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), clayMat(color));
  mesh.castShadow = true;
  mesh.position.y = h / 2;
  return mesh;
}

function roof(w, color) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(w * 0.72, 0.28, 4), clayMat(color));
  mesh.rotation.y = Math.PI / 4;
  mesh.castShadow = true;
  return mesh;
}

export function createCraftHouseProp() {
  const g = new THREE.Group();
  g.name = 'CraftHouseProp';
  const body = houseBlock(0.55, 0.38, 0.55, CLAY.foam);
  const top = roof(0.55, CLAY.gold);
  top.position.y = 0.52;
  g.add(body, top);
  return g;
}

export function createInkHouseProp() {
  const g = new THREE.Group();
  g.name = 'InkHouseProp';
  const body = houseBlock(0.42, 0.42, 0.42, CLAY.grass);
  const top = roof(0.42, CLAY.cliff);
  top.position.y = 0.56;
  g.add(body, top);
  return g;
}

export function createSleepHouseProp() {
  const g = new THREE.Group();
  g.name = 'SleepHouseProp';
  const body = houseBlock(0.48, 0.3, 0.4, CLAY.sand);
  const top = roof(0.5, CLAY.self);
  top.position.y = 0.44;
  g.add(body, top);
  return g;
}

export function createCoinMintProp() {
  const g = new THREE.Group();
  g.name = 'CoinMintProp';
  const body = houseBlock(0.5, 0.34, 0.38, CLAY.gold);
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.28, 12), clayMat('#f4c245'));
  stack.position.set(0.22, 0.32, 0);
  g.add(body, stack);
  return g;
}

export function createLighthouseProp() {
  const g = new THREE.Group();
  g.name = 'LighthouseProp';
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.85, 10), clayMat(CLAY.foam));
  shaft.position.y = 0.42;
  shaft.castShadow = true;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), clayMat(CLAY.gold, { emissive: CLAY.gold, emissiveIntensity: 0.4 }));
  lamp.position.y = 0.9;
  g.add(shaft, lamp);
  return g;
}

export function createWatchtowerProp() {
  const g = new THREE.Group();
  g.name = 'WatchtowerProp';
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.7, 8), clayMat(CLAY.stone));
  shaft.position.y = 0.35;
  shaft.castShadow = true;
  const top = houseBlock(0.32, 0.16, 0.32, CLAY.wood);
  top.position.y = 0.78;
  g.add(shaft, top);
  return g;
}

export function createBuildingForPlot(plot) {
  if (plot.status === 'UNCLAIMED' || !plot.buildingType) return null;
  const makers = {
    CRAFT_HOUSE: createCraftHouseProp,
    INK_HOUSE: createInkHouseProp,
    SLEEP_HOUSE: createSleepHouseProp,
    COIN_GENERATOR: createCoinMintProp,
    LIGHTHOUSE: createLighthouseProp,
  };
  const make = makers[plot.buildingType] || createCraftHouseProp;
  const obj = make();
  obj.userData = { type: 'plot', plotId: plot.id };
  return obj;
}
