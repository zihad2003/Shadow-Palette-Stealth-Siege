import * as THREE from 'three';
import { clayMat, BASE_CLAY } from './clayMaterials.js';
import { WALL_EDGE } from './OuterWalls.js';

// Round watch posts on the four wall corners.
export function createCornerPosts() {
  const group = new THREE.Group();
  const mat = clayMat(BASE_CLAY.wall);
  const capMat = clayMat(BASE_CLAY.accent);

  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 1.7, 14), mat);
      tower.position.set(sx * WALL_EDGE, 0.85, sz * WALL_EDGE);
      tower.castShadow = true;
      group.add(tower);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.62, 14), capMat);
      cap.position.set(sx * WALL_EDGE, 2.0, sz * WALL_EDGE);
      cap.castShadow = true;
      group.add(cap);
    });
  });

  return group;
}
