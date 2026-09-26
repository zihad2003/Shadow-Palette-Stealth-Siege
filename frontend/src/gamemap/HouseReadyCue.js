import * as THREE from 'three';
import { TILE_HEIGHT, tileWorldPos } from './mapConfig.js';
import { getGameFootprint } from './placeUtils.js';

/**
 * Soft floating coin markers above houses with stored coins.
 */
export function createHouseReadyCue(scene) {
  const root = new THREE.Group();
  root.name = 'HouseReadyCue';
  scene.add(root);

  const geo = new THREE.CircleGeometry(0.28, 20);
  const markers = new Map();

  function sync(buildings, coinBanks) {
    const banks = coinBanks || {};
    const keep = new Set();
    (buildings || []).forEach((b) => {
      if (b.ruined || b.buildingType !== 'COIN_GENERATOR') return;
      const n = Math.floor(Number(banks[String(b.id)]) || 0);
      if (n <= 0) return;
      keep.add(String(b.id));
      let entry = markers.get(String(b.id));
      if (!entry) {
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffd56a,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        root.add(mesh);
        entry = { mesh, mat };
        markers.set(String(b.id), entry);
      }
      const w = b.footprintWidth || getGameFootprint(b.buildingType).w;
      const h = b.footprintHeight || getGameFootprint(b.buildingType).h;
      const p = tileWorldPos(b.xPos + (w - 1) / 2, b.yPos + (h - 1) / 2);
      entry.mesh.position.set(p.x, TILE_HEIGHT + 2.1, p.z);
      entry.mesh.visible = true;
    });
    markers.forEach((entry, id) => {
      if (!keep.has(id)) {
        root.remove(entry.mesh);
        entry.mat.dispose();
        markers.delete(id);
      }
    });
  }

  function tick(elapsed) {
    markers.forEach((entry) => {
      const bob = Math.sin(elapsed * 3.2) * 0.12;
      entry.mesh.position.y = TILE_HEIGHT + 2.1 + bob;
      entry.mat.opacity = 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(elapsed * 4));
      const s = 0.85 + 0.15 * Math.sin(elapsed * 3.2);
      entry.mesh.scale.setScalar(s);
    });
  }

  function dispose() {
    markers.forEach((entry) => {
      root.remove(entry.mesh);
      entry.mat.dispose();
    });
    markers.clear();
    scene.remove(root);
    geo.dispose();
  }

  return { sync, tick, dispose };
}
