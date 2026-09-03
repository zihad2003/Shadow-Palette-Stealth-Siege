import * as THREE from 'three';

export function createBaseLights() {
  const group = new THREE.Group();

  const hemi = new THREE.HemisphereLight(0xf1faee, 0x22303a, 0.85);
  group.add(hemi);

  const key = new THREE.DirectionalLight(0xffe4c0, 1.25);
  key.position.set(14, 22, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -18;
  key.shadow.camera.right = 18;
  key.shadow.camera.top = 18;
  key.shadow.camera.bottom = -18;
  key.shadow.camera.near = 4;
  key.shadow.camera.far = 60;
  key.shadow.bias = -0.0004;
  group.add(key);

  const fill = new THREE.DirectionalLight(0x2a9d8f, 0.3);
  fill.position.set(-16, 8, -12);
  group.add(fill);

  return group;
}
