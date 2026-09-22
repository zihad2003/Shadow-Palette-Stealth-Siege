import * as THREE from 'three';
import { boardFogRange, LARGE_MAP } from './mapConfig.js';
import { SLAB_HALF_W, SLAB_HALF_D } from './MapGround.js';

const FOREST = {
  floor: '#07110C',
  moss: '#0C1A12',
  canopy: '#102016',
  leaf: '#163224',
  leafDk: '#0D1C14',
  trunk: '#1A1410',
  rock: '#1C2220',
  mountain: '#121816',
  mountainHi: '#1A2420',
  sea: '#0A1C28',
  seaDeep: '#061018',
  foam: '#1A3A44',
  sky: '#070B0A',
};

function rand(i, salt) {
  const s = Math.sin(i * 83.9 + salt * 29.3) * 43758.5453;
  return s - Math.floor(s);
}

function darkTree(i) {
  const tree = new THREE.Group();
  const leaf = rand(i, 2) > 0.5 ? FOREST.leaf : FOREST.leafDk;
  const mat = new THREE.MeshStandardMaterial({ color: leaf, roughness: 0.88 });
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.1, 0.55 + rand(i, 3) * 0.4, 6),
    new THREE.MeshStandardMaterial({ color: FOREST.trunk, roughness: 0.92 })
  );
  trunk.position.y = 0.28;
  tree.add(trunk);
  const puffs = 2 + Math.floor(rand(i, 4) * 2);
  for (let p = 0; p < puffs; p++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.28 - p * 0.05, 8, 6), mat);
    puff.position.y = 0.52 + p * 0.22;
    puff.scale.set(1.15, 0.7, 1.15);
    tree.add(puff);
  }
  return tree;
}

function mountainChunk(i, scale) {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(1.4 + rand(i, 5) * 1.1, 3.2 + rand(i, 6) * 2.4, 5),
    new THREE.MeshStandardMaterial({
      color: rand(i, 7) > 0.5 ? FOREST.mountain : FOREST.mountainHi,
      roughness: 0.94,
      flatShading: true,
    })
  );
  mesh.scale.set(scale, scale, scale);
  mesh.rotation.y = rand(i, 8) * Math.PI;
  return mesh;
}

function seaRock(i) {
  const mesh = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.18 + rand(i, 9) * 0.22),
    new THREE.MeshStandardMaterial({ color: FOREST.foam, roughness: 0.7 })
  );
  mesh.position.y = 0.04;
  mesh.rotation.set(rand(i, 10), rand(i, 11), 0);
  return mesh;
}

export function createOuterTerrain() {
  const group = new THREE.Group();
  group.name = 'OuterTerrain';

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.max(280, SLAB_HALF_W * 9), Math.max(280, SLAB_HALF_D * 9)),
    new THREE.MeshStandardMaterial({ color: FOREST.floor, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.92;
  ground.receiveShadow = true;
  group.add(ground);

  const moss = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(SLAB_HALF_W, SLAB_HALF_D) + 9, 24),
    new THREE.MeshStandardMaterial({ color: FOREST.moss, roughness: 0.92 })
  );
  moss.rotation.x = -Math.PI / 2;
  moss.position.y = -0.78;
  moss.receiveShadow = true;
  group.add(moss);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(42, 28),
    new THREE.MeshStandardMaterial({
      color: FOREST.sea,
      roughness: 0.35,
      metalness: 0.18,
    })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(SLAB_HALF_W + 16, -0.88, 0);
  group.add(sea);
  const seaDeep = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 40),
    new THREE.MeshStandardMaterial({ color: FOREST.seaDeep, roughness: 0.45 })
  );
  seaDeep.rotation.x = -Math.PI / 2;
  seaDeep.position.set(SLAB_HALF_W + 28, -0.94, 0);
  group.add(seaDeep);

  const mountainCount = LARGE_MAP ? 11 : 7;
  for (let i = 0; i < mountainCount; i++) {
    const t = (i / mountainCount - 0.5) * 0.9;
    const chunk = mountainChunk(i, 1.1 + rand(i, 12) * 0.5);
    chunk.position.set(-SLAB_HALF_W - 8 - rand(i, 13) * 6, -0.4, t * (SLAB_HALF_D + 10));
    group.add(chunk);
  }
  for (let i = 0; i < 5; i++) {
    const chunk = mountainChunk(i + 40, 0.85 + rand(i, 14) * 0.4);
    chunk.position.set((i - 2) * 4.5, -0.35, -SLAB_HALF_D - 7 - rand(i, 15) * 3);
    group.add(chunk);
  }

  const treeCount = LARGE_MAP ? 72 : 36;
  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2 + rand(i, 16) * 0.2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    if (c > 0.35) continue;
    const dist = Math.max(SLAB_HALF_W, SLAB_HALF_D) + 1.6 + rand(i, 17) * 6;
    const x = c * dist;
    const z = s * dist * (SLAB_HALF_D / SLAB_HALF_W);
    if (Math.abs(x) < SLAB_HALF_W + 0.4 && Math.abs(z) < SLAB_HALF_D + 0.4) continue;
    if (Math.abs(x) < 2.8 && z > SLAB_HALF_D - 0.6) continue;
    const tree = darkTree(i);
    tree.position.set(x, -0.55, z);
    tree.scale.multiplyScalar(0.85 + rand(i, 18) * 0.7);
    tree.traverse((ch) => {
      if (ch.isMesh) ch.castShadow = false;
    });
    group.add(tree);
  }

  const foamCount = LARGE_MAP ? 18 : 10;
  for (let i = 0; i < foamCount; i++) {
    const rock = seaRock(i);
    rock.position.set(SLAB_HALF_W + 3.2 + rand(i, 19) * 8, -0.82, (rand(i, 20) - 0.5) * 18);
    group.add(rock);
  }

  return group;
}

export function applyMapAtmosphere(scene) {
  scene.background = new THREE.Color(FOREST.sky);
  const { near, far } = boardFogRange();
  scene.fog = new THREE.Fog(FOREST.sky, near * 0.85, far * 1.05);
}
