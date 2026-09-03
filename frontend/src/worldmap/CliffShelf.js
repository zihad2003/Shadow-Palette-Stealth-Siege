import * as THREE from 'three';
import { clayMat, CLAY } from './clayMaterials.js';

export function createCliffShelf() {
  const group = new THREE.Group();
  group.name = 'CliffShelf';

  const angles = [0.35, 1.9, 3.5, 5.1];
  angles.forEach((a, i) => {
    const rock = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.9 + (i % 2) * 0.35, 1.4),
      clayMat(CLAY.cliff)
    );
    rock.position.set(Math.cos(a) * 8.1, 0.15, Math.sin(a) * 8.1);
    rock.rotation.y = -a;
    rock.castShadow = true;
    group.add(rock);
  });

  return group;
}
