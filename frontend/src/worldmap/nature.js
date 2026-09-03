import * as THREE from 'three';
import { clayMat, CLAY } from './clayMaterials.js';

export function createPineTree() {
  const g = new THREE.Group();
  g.name = 'PineTree';
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.35, 6), clayMat(CLAY.wood));
  trunk.position.y = 0.18;
  const leaves = [
    { y: 0.42, r: 0.28, c: '#1b4332' },
    { y: 0.58, r: 0.2, c: '#2d6a4f' },
    { y: 0.72, r: 0.13, c: '#40916c' },
  ];
  g.add(trunk);
  leaves.forEach((l) => {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(l.r, 0.28, 7), clayMat(l.c));
    mesh.position.y = l.y;
    mesh.castShadow = true;
    g.add(mesh);
  });
  return g;
}

export function createCherryTree() {
  const g = new THREE.Group();
  g.name = 'CherryTree';
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.32, 6), clayMat(CLAY.wood));
  trunk.position.y = 0.16;
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), clayMat(CLAY.blossom));
  canopy.position.y = 0.48;
  canopy.castShadow = true;
  g.add(trunk, canopy);
  return g;
}

export function createRockCluster() {
  const g = new THREE.Group();
  g.name = 'RockCluster';
  [0.18, 0.12, 0.09].forEach((r, i) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), clayMat(CLAY.stone));
    rock.position.set((i - 1) * 0.16, r * 0.6, (i % 2) * 0.1);
    rock.castShadow = true;
    g.add(rock);
  });
  return g;
}

export function createSeaStack() {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.4, 0.7, 7),
    clayMat(CLAY.cliff)
  );
  mesh.position.y = -0.05;
  mesh.castShadow = true;
  mesh.name = 'SeaStack';
  return mesh;
}

export function createCloudLayer() {
  const group = new THREE.Group();
  group.name = 'CloudLayer';
  for (let i = 0; i < 6; i += 1) {
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(0.7 + (i % 3) * 0.2, 10, 10),
      clayMat(CLAY.cloud, { transparent: true, opacity: 0.22 })
    );
    const a = (i / 6) * Math.PI * 2;
    cloud.position.set(Math.cos(a) * 9.5, 4.2 + (i % 2) * 0.4, Math.sin(a) * 9.5);
    cloud.scale.set(1.6, 0.45, 1);
    group.add(cloud);
  }
  return group;
}

export function createAmbientDust() {
  const count = 48;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 18;
    positions[i * 3 + 1] = 0.8 + Math.random() * 3.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 18;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xf4a261, size: 0.05, transparent: true, opacity: 0.35 })
  );
  points.name = 'AmbientDust';
  return points;
}
