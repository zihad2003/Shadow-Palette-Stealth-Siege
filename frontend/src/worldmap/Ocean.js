import * as THREE from 'three';
import { clayMat, CLAY } from './clayMaterials.js';

export function createOcean() {
  const group = new THREE.Group();
  group.name = 'Ocean';

  const deep = new THREE.Mesh(
    new THREE.CircleGeometry(28, 48),
    clayMat(CLAY.oceanDeep)
  );
  deep.rotation.x = -Math.PI / 2;
  deep.position.y = -0.55;
  group.add(deep);

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(18, 48),
    clayMat(CLAY.ocean, { transparent: true, opacity: 0.92 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.28;
  water.name = 'OceanSurface';
  group.add(water);

  return group;
}
