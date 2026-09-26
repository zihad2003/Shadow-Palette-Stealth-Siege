import * as THREE from 'three';
import { TILE_HEIGHT, tileWorldPos } from './mapConfig.js';

/**
 * Short-lived colored paint puffs at tile centers.
 * Call spawn(coords, hex); tick(dt) each frame; dispose() on teardown.
 */
export function createPaintSplash(scene) {
  const root = new THREE.Group();
  root.name = 'PaintSplash';
  scene.add(root);

  const geo = new THREE.SphereGeometry(0.08, 6, 6);
  const particles = [];
  const MAX = 48;

  function spawn(coords, hex = '#FFFFFF') {
    if (!Array.isArray(coords) || !coords.length) return;
    const color = new THREE.Color(hex);
    const batch = coords.slice(0, 12);
    batch.forEach(({ x, y }) => {
      if (particles.length >= MAX) {
        const old = particles.shift();
        root.remove(old.mesh);
        old.mesh.material.dispose();
      }
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const p = tileWorldPos(x, y);
      mesh.position.set(
        p.x + (Math.random() - 0.5) * 0.35,
        TILE_HEIGHT + 0.12 + Math.random() * 0.2,
        p.z + (Math.random() - 0.5) * 0.35
      );
      mesh.scale.setScalar(0.6 + Math.random() * 0.8);
      root.add(mesh);
      particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 1.4,
        vy: 1.2 + Math.random() * 1.8,
        vz: (Math.random() - 0.5) * 1.4,
        life: 0.45 + Math.random() * 0.25,
        age: 0,
      });
    });
  }

  function tick(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 4.5 * dt;
      const t = Math.min(1, p.age / p.life);
      p.mesh.material.opacity = 0.85 * (1 - t);
      p.mesh.scale.setScalar(0.6 + t * 0.9);
      if (p.age >= p.life) {
        root.remove(p.mesh);
        p.mesh.material.dispose();
        particles.splice(i, 1);
      }
    }
  }

  function dispose() {
    particles.forEach((p) => {
      root.remove(p.mesh);
      p.mesh.material.dispose();
    });
    particles.length = 0;
    scene.remove(root);
    geo.dispose();
  }

  return { spawn, tick, dispose };
}
