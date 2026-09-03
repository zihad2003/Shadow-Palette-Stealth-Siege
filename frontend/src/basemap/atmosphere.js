import * as THREE from 'three';
import { clayMat, BASE_CLAY } from './clayMaterials.js';

// FogHaze lives in SkyVignette (scene.fog); here: dust motes + clay clouds.
export function createAmbientDust() {
  const count = 90;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = 0.5 + Math.random() * 6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xf1faee, size: 0.06, transparent: true, opacity: 0.35 })
  );
  return {
    object: points,
    update(elapsed) {
      points.rotation.y = elapsed * 0.012;
      points.position.y = Math.sin(elapsed * 0.4) * 0.15;
    },
  };
}

export function createCloudLayer() {
  const group = new THREE.Group();
  const mat = clayMat(BASE_CLAY.white, { transparent: true, opacity: 0.85, roughness: 0.9 });
  for (let i = 0; i < 5; i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.9 + Math.random() * 0.7, 12, 10), mat);
      puff.position.set(j * 1.1 - 1.1, Math.random() * 0.3, Math.random() * 0.6);
      puff.scale.y = 0.55;
      cloud.add(puff);
    }
    const angle = (i / 5) * Math.PI * 2;
    cloud.position.set(Math.cos(angle) * 20, 11 + Math.random() * 3, Math.sin(angle) * 20);
    group.add(cloud);
  }
  return {
    object: group,
    update(elapsed) {
      group.rotation.y = elapsed * 0.008;
    },
  };
}
