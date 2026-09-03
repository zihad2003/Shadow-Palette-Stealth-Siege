import * as THREE from 'three';

export function createMapCamera(aspect) {
  const camera = new THREE.PerspectiveCamera(34, aspect || 1, 0.1, 120);
  camera.position.set(15.5, 17.5, 15.5);
  camera.lookAt(0, 0.35, 0);
  return camera;
}

export function applyMapZoom(camera, zoomScale) {
  const dist = 26 / Math.max(0.7, Math.min(1.5, zoomScale));
  const dir = camera.position.clone().normalize();
  camera.position.copy(dir.multiplyScalar(dist));
  camera.lookAt(0, 0.35, 0);
}
