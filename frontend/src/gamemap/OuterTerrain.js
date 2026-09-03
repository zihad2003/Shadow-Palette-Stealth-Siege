import * as THREE from 'three';
import { MAP_COLORS } from './mapConfig.js';
import { SLAB_HALF_W, SLAB_HALF_D } from './MapGround.js';

// ─── Purple clay environment in the reference style ──────────────────────
// Carved, wavy strata layers stepping down from the fortress, dressed with
// small clay trees, bushes and rocks. Nothing inside the walls.

function rand(i, salt) {
  const s = Math.sin(i * 83.9 + salt * 29.3) * 43758.5453;
  return s - Math.floor(s);
}

// Wavy rounded-rectangle outline (superellipse + organic wobble)
function strataShape(halfW, halfD, phase) {
  const shape = new THREE.Shape();
  const N = 110;
  for (let k = 0; k <= N; k++) {
    const t = (k / N) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const n = 4.2; // superellipse exponent → soft rounded rectangle
    const base = 1 / Math.pow(Math.pow(Math.abs(c) / halfW, n) + Math.pow(Math.abs(s) / halfD, n), 1 / n);
    const wobble =
      1 + 0.045 * Math.sin(3 * t + phase) + 0.03 * Math.sin(7 * t + phase * 2.3) + 0.018 * Math.sin(12 * t + phase * 4.1);
    const r = base * wobble;
    const x = r * c;
    const y = r * s;
    if (k === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function strataLayer(halfW, halfD, phase, thickness, color) {
  const geo = new THREE.ExtrudeGeometry(strataShape(halfW, halfD, phase), {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.22,
    bevelSegments: 3,
    curveSegments: 6,
  });
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0.02 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

// ---- Clay flora ----
const TREE_COLORS = ['#4E9C5C', '#6FA84F', '#C4B348', '#C97BB6', '#8B6BC7', '#4E9C8D'];

function blobTree(i) {
  const tree = new THREE.Group();
  const color = TREE_COLORS[Math.floor(rand(i, 1) * TREE_COLORS.length)];
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.1, 0.24, 8),
    new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 0.8 })
  );
  trunk.position.y = 0.12;
  tree.add(trunk);
  const puffs = 2 + Math.floor(rand(i, 2) * 2);
  for (let p = 0; p < puffs; p++) {
    const r = 0.34 - p * 0.09;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), mat);
    puff.position.y = 0.3 + p * 0.26;
    puff.scale.y = 0.82;
    puff.castShadow = true;
    tree.add(puff);
  }
  return tree;
}

function pineTree(i) {
  const tree = new THREE.Group();
  const color = TREE_COLORS[Math.floor(rand(i, 3) * TREE_COLORS.length)];
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  for (let p = 0; p < 3; p++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34 - p * 0.09, 0.4, 10), mat);
    cone.position.y = 0.28 + p * 0.26;
    cone.castShadow = true;
    tree.add(cone);
  }
  return tree;
}

function rock(i) {
  const mesh = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.16 + rand(i, 4) * 0.16),
    new THREE.MeshStandardMaterial({ color: rand(i, 5) > 0.5 ? '#7d74a8' : '#9d94c4', roughness: 0.85 })
  );
  mesh.position.y = 0.1;
  mesh.rotation.set(rand(i, 6) * 3, rand(i, 7) * 3, 0);
  mesh.castShadow = true;
  return mesh;
}

function bush(i) {
  const color = TREE_COLORS[Math.floor(rand(i, 8) * TREE_COLORS.length)];
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.16 + rand(i, 9) * 0.1, 12, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.75 })
  );
  mesh.scale.y = 0.65;
  mesh.position.y = 0.08;
  mesh.castShadow = true;
  return mesh;
}

export function createOuterTerrain() {
  const group = new THREE.Group();
  group.name = 'OuterTerrain';

  // Deep base far past the frustum
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    new THREE.MeshStandardMaterial({ color: MAP_COLORS.terrainBase, roughness: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.05;
  ground.receiveShadow = true;
  group.add(ground);

  // Carved strata stepping down and outward (extrude grows +y after rotation)
  const L1 = strataLayer(SLAB_HALF_W + 2.4, SLAB_HALF_D + 2.4, 0.7, 0.3, MAP_COLORS.terrainL1);
  L1.position.y = -0.62;
  group.add(L1);
  const L2 = strataLayer(SLAB_HALF_W + 4.6, SLAB_HALF_D + 4.6, 2.1, 0.28, MAP_COLORS.terrainL2);
  L2.position.y = -0.85;
  group.add(L2);
  const L3 = strataLayer(SLAB_HALF_W + 7.2, SLAB_HALF_D + 7.2, 4.4, 0.26, MAP_COLORS.terrainL3);
  L3.position.y = -1.05;
  group.add(L3);

  // Clay flora scattered on the strata ring — never inside the walls,
  // never on the board slab, and clear of the gate path corridor
  for (let i = 0; i < 42; i++) {
    const angle = (i / 42) * Math.PI * 2 + rand(i, 10) * 0.32;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const edgeX = SLAB_HALF_W + 0.8;
    const edgeZ = SLAB_HALF_D + 0.8;
    const n = 4.2;
    const ringBase = 1 / Math.pow(Math.pow(Math.abs(c) / edgeX, n) + Math.pow(Math.abs(s) / edgeZ, n), 1 / n);
    const dist = ringBase + rand(i, 11) * 2.4;
    const x = c * dist;
    const z = s * dist;
    if (Math.abs(x) < SLAB_HALF_W + 0.35 && Math.abs(z) < SLAB_HALF_D + 0.35) continue; // off the board
    if (Math.abs(x) < 2.6 && z > SLAB_HALF_D - 0.5) continue; // keep gate path clear

    const roll = rand(i, 12);
    const item = roll < 0.38 ? blobTree(i) : roll < 0.62 ? pineTree(i) : roll < 0.82 ? bush(i) : rock(i);
    item.position.set(x, -0.18, z);
    item.rotation.y = rand(i, 13) * Math.PI * 2;
    const sc = 0.8 + rand(i, 14) * 0.5;
    item.scale.multiplyScalar(sc);
    group.add(item);
  }

  return group;
}

/** Purple backdrop and gentle fog so the strata melt out at the edges. */
export function applyMapAtmosphere(scene) {
  scene.background = new THREE.Color(MAP_COLORS.sky);
  scene.fog = new THREE.Fog(MAP_COLORS.sky, 46, 130);
}
