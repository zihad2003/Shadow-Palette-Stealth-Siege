import * as THREE from 'three';
import { clayMat, BASE_CLAY } from './clayMaterials.js';
import { COLORS } from '../colors.js';

// The lighthouse sits dead center of every base — it is not a dock item.
export function createLighthouseCore() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.6, 20), clayMat(BASE_CLAY.stone));
  base.position.y = 0.3;
  base.castShadow = true;
  group.add(base);

  // Striped clay tower
  const stripes = [COLORS.WHITE, COLORS.RED, COLORS.WHITE, COLORS.RED];
  stripes.forEach((hex, i) => {
    const r = 0.92 - i * 0.09;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.05, r, 0.95, 20), clayMat(hex));
    seg.position.y = 1.05 + i * 0.95;
    seg.castShadow = true;
    group.add(seg);
  });

  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.66, 0.28, 16), clayMat(BASE_CLAY.ink));
  gallery.position.y = 4.9;
  gallery.castShadow = true;
  group.add(gallery);

  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.62, 14),
    new THREE.MeshStandardMaterial({
      color: BASE_CLAY.beam,
      emissive: new THREE.Color(BASE_CLAY.beam),
      emissiveIntensity: 0.9,
      roughness: 0.3,
    })
  );
  lamp.position.y = 5.32;
  group.add(lamp);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.66, 14), clayMat(BASE_CLAY.accent));
  roof.position.y = 5.95;
  roof.castShadow = true;
  group.add(roof);

  const light = new THREE.PointLight(0xfff3d6, 0.85, 16, 1.6);
  light.position.y = 5.32;
  group.add(light);

  group.userData.lampY = 5.32;
  return group;
}
