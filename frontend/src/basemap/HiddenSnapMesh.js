import * as THREE from 'three';
import { GRID } from './gridUtils.js';

// Invisible plane over the paintable area — raycast target only.
export function createHiddenSnapMesh() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID, GRID),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  mesh.userData.isSnapPlane = true;
  return mesh;
}
