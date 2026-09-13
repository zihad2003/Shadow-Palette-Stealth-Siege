import * as THREE from 'three';
import { TILE_HEIGHT, tileWorldPos, MAP_COLS, MAP_ROWS } from './mapConfig.js';
import { WALL_X, WALL_Z } from './FortressBorder.js';

function outwardNormal(column, row) {
  if (row <= 0) return { x: 0, z: -1 };
  if (row >= MAP_ROWS - 1) return { x: 0, z: 1 };
  if (column <= 0) return { x: -1, z: 0 };
  if (column >= MAP_COLS - 1) return { x: 1, z: 0 };
  return { x: 0, z: 1 };
}

function wallAnchor(column, row) {
  const p = tileWorldPos(column, row);
  const n = outwardNormal(column, row);
  return {
    x: n.x < 0 ? -WALL_X : n.x > 0 ? WALL_X : p.x,
    y: TILE_HEIGHT + 0.55,
    z: n.z < 0 ? -WALL_Z : n.z > 0 ? WALL_Z : p.z,
    nx: n.x,
    nz: n.z,
  };
}

/**
 * Clay brick shatter FX at a perimeter tile.
 * Call play() on each F-hit; tick(dt) every frame.
 */
export function createWallBreakFX(scene) {
  const root = new THREE.Group();
  root.name = 'WallBreakFX';
  scene.add(root);

  const shards = [];
  const cracks = [];
  let cameraShake = 0;
  let punch = 0;

  const shardGeo = new THREE.BoxGeometry(0.22, 0.14, 0.18);
  const crackGeo = new THREE.RingGeometry(0.15, 0.55, 18);
  const dustGeo = new THREE.SphereGeometry(0.08, 6, 6);

  function grayMat(hex, extras = {}) {
    return new THREE.MeshStandardMaterial({
      color: hex,
      roughness: 0.85,
      metalness: 0.02,
      ...extras,
    });
  }

  function spawnBurst(column, row, { final = false, hits = 1 } = {}) {
    const a = wallAnchor(column, row);
    const count = final ? 22 : 10 + hits * 2;
    punch = final ? 1 : 0.55 + hits * 0.08;
    cameraShake = final ? 0.55 : 0.22 + hits * 0.04;

    for (let i = 0; i < count; i++) {
      const mat = grayMat(i % 2 ? '#8a8782' : '#6e6b66');
      const mesh = new THREE.Mesh(shardGeo, mat);
      mesh.position.set(a.x, a.y + Math.random() * 0.35, a.z);
      mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
      mesh.castShadow = true;
      const speed = 2.2 + Math.random() * 3.4;
      const side = (Math.random() - 0.5) * 2.2;
      shards.push({
        mesh,
        vx: a.nx * speed + (a.nz !== 0 ? side : 0),
        vy: 2.8 + Math.random() * 3.5,
        vz: a.nz * speed + (a.nx !== 0 ? side : 0),
        spin: (Math.random() - 0.5) * 12,
        life: 0.9 + Math.random() * 0.55,
        age: 0,
      });
      root.add(mesh);
    }

    for (let i = 0; i < (final ? 10 : 5); i++) {
      const dust = new THREE.Mesh(
        dustGeo,
        new THREE.MeshStandardMaterial({
          color: '#b0aaa2',
          transparent: true,
          opacity: 0.55,
          roughness: 1,
        })
      );
      dust.position.set(a.x, a.y + 0.2, a.z);
      shards.push({
        mesh: dust,
        vx: a.nx * 0.6 + (Math.random() - 0.5),
        vy: 1.2 + Math.random() * 1.5,
        vz: a.nz * 0.6 + (Math.random() - 0.5),
        spin: 0,
        life: 0.55,
        age: 0,
        dust: true,
      });
      root.add(dust);
    }

    const crack = new THREE.Mesh(
      crackGeo,
      new THREE.MeshBasicMaterial({
        color: final ? 0xff6b4a : 0xffffff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    crack.position.set(a.x - a.nx * 0.05, a.y, a.z - a.nz * 0.05);
    if (Math.abs(a.nx) > 0.5) crack.rotation.y = Math.PI / 2;
    else crack.rotation.x = -Math.PI / 2;
    root.add(crack);
    cracks.push({ mesh: crack, age: 0, life: final ? 0.7 : 0.35, final });

    if (final) {
      const hole = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 1.15, 0.35),
        new THREE.MeshStandardMaterial({
          color: '#1a1a1a',
          roughness: 1,
          transparent: true,
          opacity: 0.92,
        })
      );
      hole.position.set(a.x - a.nx * 0.12, TILE_HEIGHT + 0.55, a.z - a.nz * 0.12);
      if (Math.abs(a.nx) > 0.5) hole.rotation.y = Math.PI / 2;
      root.add(hole);
    }
  }

  function tick(dt, camera) {
    cameraShake = Math.max(0, cameraShake - dt * 1.6);
    punch = Math.max(0, punch - dt * 2.2);

    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i];
      s.age += dt;
      s.vy -= 14 * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      s.mesh.rotation.x += s.spin * dt;
      s.mesh.rotation.z += s.spin * 0.7 * dt;
      if (s.dust) {
        const t = s.age / s.life;
        s.mesh.scale.setScalar(1 + t * 2.2);
        if (s.mesh.material) s.mesh.material.opacity = Math.max(0, 0.55 * (1 - t));
      }
      if (s.age >= s.life || s.mesh.position.y < -1) {
        root.remove(s.mesh);
        s.mesh.geometry?.dispose?.();
        if (s.mesh.material) s.mesh.material.dispose();
        shards.splice(i, 1);
      }
    }

    for (let i = cracks.length - 1; i >= 0; i--) {
      const c = cracks[i];
      c.age += dt;
      const t = c.age / c.life;
      c.mesh.scale.setScalar(1 + t * (c.final ? 2.4 : 1.4));
      c.mesh.material.opacity = Math.max(0, 0.85 * (1 - t));
      if (c.age >= c.life) {
        root.remove(c.mesh);
        c.mesh.material.dispose();
        cracks.splice(i, 1);
      }
    }

    if (camera && cameraShake > 0.001) {
      const mag = cameraShake * 0.12;
      camera.position.x += (Math.random() - 0.5) * mag;
      camera.position.y += (Math.random() - 0.5) * mag * 0.6;
      camera.position.z += (Math.random() - 0.5) * mag;
    }

    return { punch, cameraShake };
  }

  return {
    play: spawnBurst,
    tick,
    get punch() {
      return punch;
    },
  };
}

export default createWallBreakFX;
