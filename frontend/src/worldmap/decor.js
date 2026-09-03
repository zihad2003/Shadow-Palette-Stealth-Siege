import * as THREE from 'three';
import { clayMat, CLAY } from './clayMaterials.js';

export function createGateArch() {
  const g = new THREE.Group();
  g.name = 'GateArch';
  const colL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), clayMat(CLAY.stone));
  colL.position.set(-0.35, 0.7, 2.5);
  const colR = colL.clone();
  colR.position.x = 0.35;
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.18), clayMat(CLAY.gold));
  lintel.position.set(0, 1.08, 2.5);
  g.add(colL, colR, lintel);
  return g;
}

export function createBridgeSpan() {
  const g = new THREE.Group();
  g.name = 'BridgeSpan';
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.42), clayMat(CLAY.wood));
  deck.position.set(6.9, 0.18, 3.4);
  deck.rotation.y = 0.6;
  g.add(deck);
  return g;
}

export function createBannerPole() {
  const g = new THREE.Group();
  g.name = 'BannerPole';
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), clayMat(CLAY.wood));
  pole.position.y = 0.9;
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.18), clayMat(CLAY.gold, { side: THREE.DoubleSide }));
  flag.position.set(0.16, 1.22, 0);
  g.add(pole, flag);
  return g;
}

export function createCenterFountain() {
  const g = new THREE.Group();
  g.name = 'CenterFountain';
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.16, 16), clayMat(CLAY.stone));
  basin.position.y = 0.66;
  const spout = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), clayMat(CLAY.ocean, { transparent: true, opacity: 0.7 }));
  spout.position.y = 0.82;
  g.add(basin, spout);
  return g;
}

export function createFogHaze() {
  const haze = new THREE.Mesh(
    new THREE.CircleGeometry(16, 32),
    clayMat('#0d1b1e', { transparent: true, opacity: 0.18 })
  );
  haze.rotation.x = -Math.PI / 2;
  haze.position.y = -0.02;
  haze.name = 'FogHaze';
  return haze;
}
