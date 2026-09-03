import * as THREE from 'three';
import { BASE_CLAY } from './clayMaterials.js';

// Hover preview: translucent box for a building footprint, flat disc for paint.
export function createPlacementGhost() {
  const group = new THREE.Group();

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.8, 1),
    new THREE.MeshBasicMaterial({ color: BASE_CLAY.white, transparent: true, opacity: 0.28, depthWrite: false })
  );
  box.visible = false;
  group.add(box);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 20),
    new THREE.MeshBasicMaterial({ color: BASE_CLAY.white, transparent: true, opacity: 0.4, depthWrite: false })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.visible = false;
  group.add(disc);

  return {
    group,
    showBuilding(wx, wz, w, h, ok) {
      disc.visible = false;
      box.visible = true;
      box.scale.set(w * 0.82, 1, h * 0.82);
      box.position.set(wx, 0.4, wz);
      box.material.color.set(ok ? BASE_CLAY.white : '#E63946');
    },
    showPaint(wx, wz, hex) {
      box.visible = false;
      disc.visible = true;
      disc.position.set(wx, 0.03, wz);
      disc.material.color.set(hex);
    },
    hide() {
      box.visible = false;
      disc.visible = false;
    },
  };
}
