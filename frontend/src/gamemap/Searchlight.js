import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TILE_HEIGHT, TILE_PITCH, tileWorldPos, SEARCHLIGHT_TILE } from './mapConfig.js';
import { DEFAULT_SEARCHLIGHT_LEVEL, SEARCHLIGHT_LEVELS } from '../raid/stealthConstants.js';

function clay(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.05,
    ...extras,
  });
}

/**
 * Compact clay searchlight at the board center.
 * Upgrade levels change cone range + sweep speed, never the tower mesh size.
 */
export function createSearchlight({ level = DEFAULT_SEARCHLIGHT_LEVEL } = {}) {
  const spec = SEARCHLIGHT_LEVELS[level] || SEARCHLIGHT_LEVELS[1];
  const root = new THREE.Group();
  root.name = 'Searchlight';
  root.userData.isSearchlight = true;

  const pos = tileWorldPos(SEARCHLIGHT_TILE.column, SEARCHLIGHT_TILE.row);
  root.position.set(pos.x, TILE_HEIGHT, pos.z);

  const base = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.26, 0.7, 2, 0.08), clay('#8A8680'));
  base.position.y = 0.13;
  base.castShadow = true;
  root.add(base);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.12, 10), clay('#767370'));
  collar.position.y = 0.3;
  root.add(collar);

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.62, 10), clay('#9C9994'));
  column.position.y = 0.64;
  column.castShadow = true;
  root.add(column);

  const headPivot = new THREE.Group();
  headPivot.position.y = 1.02;
  root.add(headPivot);

  const housing = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.26, 0.44, 2, 0.05), clay('#5E5A54', { metalness: 0.14 }));
  housing.position.z = 0.06;
  housing.castShadow = true;
  headPivot.add(housing);

  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.13, 18),
    new THREE.MeshStandardMaterial({
      color: '#FFE7A8',
      emissive: new THREE.Color('#FFC85A'),
      emissiveIntensity: 1.8,
      roughness: 0.28,
    })
  );
  lens.position.z = 0.29;
  lens.userData.keepColor = true;
  headPivot.add(lens);

  const range = spec.rangeTiles * TILE_PITCH;
  const halfRad = THREE.MathUtils.degToRad(spec.coneAngleDeg / 2);
  const coneRadius = Math.tan(halfRad) * range;
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xffe08a,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(coneRadius, range, 28, 1, true), coneMat);
  cone.rotation.x = -Math.PI / 2;
  cone.position.z = range / 2 + 0.22;
  cone.userData.keepColor = true;
  cone.userData.isBeam = true;
  headPivot.add(cone);

  const spot = new THREE.SpotLight(0xffe08a, 2.4, range + 2.5, halfRad, 0.38, 1.05);
  spot.position.set(0, 0, 0.12);
  spot.target.position.set(0, -0.55, range);
  spot.castShadow = false;
  spot.userData.keepColor = true;
  headPivot.add(spot);
  headPivot.add(spot.target);

  headPivot.rotation.x = THREE.MathUtils.degToRad(16);

  let yaw = 180;

  return {
    object: root,
    level,
    spec,
    get beamAngleDeg() {
      return yaw;
    },
    get coneAngleDeg() {
      return spec.coneAngleDeg;
    },
    get rangeTiles() {
      return spec.rangeTiles;
    },
    update(dt, { alarm = false } = {}) {
      const extraRange = alarm ? spec.alarmRangeBonus : 0;
      const speed = spec.sweepDegPerSec * (alarm ? 1.25 : 1);
      yaw = (yaw + speed * dt) % 360;
      root.rotation.y = THREE.MathUtils.degToRad(yaw);
      coneMat.opacity = alarm ? 0.28 : 0.15;
      coneMat.color.set(alarm ? 0xff6b5a : 0xffe08a);
      lens.material.emissive.set(alarm ? '#E74C3C' : '#FFC85A');
      lens.material.emissiveIntensity = alarm ? 2.4 : 1.8;
      spot.color.set(alarm ? 0xff6b5a : 0xffe08a);
      spot.intensity = alarm ? 3.4 : 2.4;
      spot.distance = (spec.rangeTiles + extraRange) * TILE_PITCH + 2.5;
    },
  };
}
