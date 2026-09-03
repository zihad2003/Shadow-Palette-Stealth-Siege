import * as THREE from 'three';
import { clayMat, CLAY } from './clayMaterials.js';

export function createHarborDock() {
  const group = new THREE.Group();
  group.name = 'HarborDock';

  const pier = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.12, 0.55),
    clayMat(CLAY.wood)
  );
  pier.position.set(0, -0.08, 8.6);
  pier.castShadow = true;
  group.add(pier);

  const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), clayMat(CLAY.wood));
  postL.position.set(-0.7, 0.05, 8.85);
  const postR = postL.clone();
  postR.position.x = 0.7;
  group.add(postL, postR);

  return group;
}
