import * as THREE from 'three';
import { clayMat, BASE_CLAY } from './clayMaterials.js';

// Clay terrain running from the walls out past the camera frustum,
// so the map fills the screen with no empty background visible.
export function createTerrainSkirt() {
  const group = new THREE.Group();

  const plate = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), clayMat(BASE_CLAY.skirt, { roughness: 0.7 }));
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = -0.05;
  plate.receiveShadow = true;
  group.add(plate);

  // Rolling clay hills scattered outside the walls
  const hillMat = clayMat(BASE_CLAY.hill, { roughness: 0.75 });
  const rand = (i, salt) => {
    const s = Math.sin(i * 91.7 + salt * 47.3) * 43758.5453;
    return s - Math.floor(s);
  };
  for (let i = 0; i < 42; i++) {
    const angle = rand(i, 1) * Math.PI * 2;
    const dist = 18 + rand(i, 2) * 46;
    const radius = 2.5 + rand(i, 3) * 7;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12), hillMat);
    hill.position.set(Math.cos(angle) * dist, -radius * 0.72, Math.sin(angle) * dist);
    hill.scale.y = 0.55 + rand(i, 4) * 0.35;
    hill.receiveShadow = true;
    group.add(hill);
  }

  return group;
}
