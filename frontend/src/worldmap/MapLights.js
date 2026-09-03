import * as THREE from 'three';

export function createMapLights() {
  const group = new THREE.Group();
  group.name = 'MapLights';

  const hemi = new THREE.HemisphereLight(0xf1faee, 0x0d1b1e, 0.95);
  group.add(hemi);

  const key = new THREE.DirectionalLight(0xffe0c2, 1.15);
  key.position.set(10, 18, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 50;
  key.shadow.camera.left = -16;
  key.shadow.camera.right = 16;
  key.shadow.camera.top = 16;
  key.shadow.camera.bottom = -16;
  group.add(key);

  const fill = new THREE.DirectionalLight(0x2a9d8f, 0.28);
  fill.position.set(-12, 6, -6);
  group.add(fill);

  const rim = new THREE.DirectionalLight(0xf4a261, 0.18);
  rim.position.set(0, 4, 14);
  group.add(rim);

  return group;
}
