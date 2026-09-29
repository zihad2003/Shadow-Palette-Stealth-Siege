import * as THREE from 'three';
import { GAME_COLORS } from '../../colors.js';
import {
  KIT,
  add,
  addRubble,
  box,
  clothColor,
  houseSpan,
} from '../houseKit.js';

function addJailBars(group, bodyW, bodyD, smashed) {
  const barMat = new THREE.MeshStandardMaterial({
    color: smashed ? '#555555' : '#8899A6',
    metalness: 0.85,
    roughness: 0.25,
  });

  const barCount = 5;
  // Front and back bars
  for (let i = 0; i <= barCount; i++) {
    const t = (i / barCount) - 0.5;
    const x = t * bodyW * 0.85;

    // Skip center front for the cell gate
    if (i === 2 || i === 3) continue;

    const barGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8);
    const barF = new THREE.Mesh(barGeo, barMat);
    barF.castShadow = true;
    barF.position.set(x, 0.52, bodyD * 0.44);
    if (smashed && i === 1) barF.rotation.z = 0.25;
    group.add(barF);

    const barB = new THREE.Mesh(barGeo, barMat);
    barB.castShadow = true;
    barB.position.set(x, 0.52, -bodyD * 0.44);
    if (smashed && i === 4) barB.rotation.x = -0.3;
    group.add(barB);
  }

  // Side bars
  for (let i = 1; i < barCount; i++) {
    const t = (i / barCount) - 0.5;
    const z = t * bodyD * 0.85;

    const barGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8);
    const barL = new THREE.Mesh(barGeo, barMat);
    barL.castShadow = true;
    barL.position.set(-bodyW * 0.44, 0.52, z);
    group.add(barL);

    const barR = new THREE.Mesh(barGeo, barMat);
    barR.castShadow = true;
    barR.position.set(bodyW * 0.44, 0.52, z);
    if (smashed && i === 2) barR.rotation.z = -0.35;
    group.add(barR);
  }
}

function buildJail({ hexColor, level = 1, footprintW = 3, footprintH = 3, smashed = false }) {
  const group = new THREE.Group();
  group.userData.buildingType = 'JAIL';
  const { bw, bd } = houseSpan(footprintW, footprintH);
  const cloth = clothColor(hexColor, GAME_COLORS.PURPLE);

  const bodyW = bw * 0.82;
  const bodyD = bd * 0.82;

  // Base concrete plinth
  const base = box(bodyW + 0.14, 0.16, bodyD + 0.14, KIT.stoneDk, 0.02);
  base.position.y = 0.08;
  add(group, base);

  // Heavy 4 corner pillars
  const pillarMat = new THREE.MeshStandardMaterial({
    color: '#2A2E35',
    roughness: 0.5,
    metalness: 0.6,
  });
  const cx = bodyW * 0.44;
  const cz = bodyD * 0.44;
  const corners = [
    [cx, cz],
    [-cx, cz],
    [cx, -cz],
    [-cx, -cz],
  ];
  corners.forEach(([px, pz]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.82, 0.12), pillarMat);
    p.castShadow = true;
    p.position.set(px, 0.53, pz);
    group.add(p);
  });

  // Vertical steel cage bars
  addJailBars(group, bodyW, bodyD, smashed);

  // Cell roof canopy
  const roof = box(bodyW + 0.1, 0.12, bodyD + 0.1, KIT.roofIron || '#1E232A', 0.02);
  roof.position.y = 0.94;
  if (smashed) {
    roof.rotation.z = 0.12;
    roof.position.y = 0.86;
  }
  add(group, roof);

  // Electronic lock console / Siren beacon on top
  const beaconMat = new THREE.MeshStandardMaterial({
    color: smashed ? '#333333' : '#E53E3E',
    emissive: smashed ? '#000000' : '#E53E3E',
    emissiveIntensity: smashed ? 0 : 0.8,
    roughness: 0.3,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.14, 12), beaconMat);
  beacon.position.set(0, smashed ? 0.94 : 1.05, 0);
  group.add(beacon);

  // Bench inside the cell
  const bench = box(0.6, 0.08, 0.22, '#4A3B32', 0.02);
  bench.position.set(0, 0.2, -bodyD * 0.25);
  add(group, bench);

  if (smashed) {
    addRubble(group, 0.1, 0.12, 0.15, 6);
  }

  return group;
}

export function buildIntact(params) {
  return buildJail({ ...params, smashed: false });
}

export function buildDestroyed(params) {
  return buildJail({ ...params, smashed: true });
}
