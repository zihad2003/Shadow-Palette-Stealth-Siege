import * as THREE from 'three';
import {
  add,
  addRubble,
  box,
  houseSpan,
} from '../houseKit.js';

function addJailBars(group, bodyW, bodyD, smashed, barHeight) {
  const barMat = new THREE.MeshStandardMaterial({
    color: smashed ? '#444444' : '#6A7A89',
    metalness: 0.9,
    roughness: 0.2,
  });

  const barCount = 7;
  // Front and back bars
  for (let i = 0; i <= barCount; i++) {
    const t = (i / barCount) - 0.5;
    const x = t * bodyW * 0.88;

    // Skip center front for the cell gate
    if (i === 3 || i === 4) continue;

    const barGeo = new THREE.CylinderGeometry(0.035, 0.035, barHeight, 8);
    const barF = new THREE.Mesh(barGeo, barMat);
    barF.castShadow = true;
    barF.position.set(x, barHeight * 0.5 + 0.14, bodyD * 0.46);
    if (smashed && i === 1) barF.rotation.z = 0.25;
    group.add(barF);

    const barB = new THREE.Mesh(barGeo, barMat);
    barB.castShadow = true;
    barB.position.set(x, barHeight * 0.5 + 0.14, -bodyD * 0.46);
    if (smashed && i === 5) barB.rotation.x = -0.3;
    group.add(barB);
  }

  // Side bars
  for (let i = 1; i < barCount; i++) {
    const t = (i / barCount) - 0.5;
    const z = t * bodyD * 0.88;

    const barGeo = new THREE.CylinderGeometry(0.035, 0.035, barHeight, 8);
    const barL = new THREE.Mesh(barGeo, barMat);
    barL.castShadow = true;
    barL.position.set(-bodyW * 0.46, barHeight * 0.5 + 0.14, z);
    group.add(barL);

    const barR = new THREE.Mesh(barGeo, barMat);
    barR.castShadow = true;
    barR.position.set(bodyW * 0.46, barHeight * 0.5 + 0.14, z);
    if (smashed && i === 2) barR.rotation.z = -0.35;
    group.add(barR);
  }

  // Heavy horizontal reinforcing crossbeams
  const beamGeoX = new THREE.BoxGeometry(bodyW * 0.92, 0.06, 0.06);
  const beamGeoZ = new THREE.BoxGeometry(0.06, 0.06, bodyD * 0.92);

  const midY = barHeight * 0.55 + 0.14;
  const beamBack = new THREE.Mesh(beamGeoX, barMat);
  beamBack.position.set(0, midY, -bodyD * 0.46);
  group.add(beamBack);

  const beamLeft = new THREE.Mesh(beamGeoZ, barMat);
  beamLeft.position.set(-bodyW * 0.46, midY, 0);
  group.add(beamLeft);

  const beamRight = new THREE.Mesh(beamGeoZ, barMat);
  beamRight.position.set(bodyW * 0.46, midY, 0);
  group.add(beamRight);
}

function buildJail({ hexColor, level = 1, footprintW = 3, footprintH = 3, smashed = false }) {
  const group = new THREE.Group();
  group.userData.buildingType = 'JAIL';
  const { bw, bd } = houseSpan(footprintW, footprintH);

  const bodyW = bw * 0.96;
  const bodyD = bd * 0.96;
  const barHeight = 1.35;

  // 1. Fortified concrete foundation plinth with steps
  const plinth = box(bodyW + 0.28, 0.22, bodyD + 0.28, '#242830', 0.02);
  plinth.position.y = 0.11;
  add(group, plinth);

  const subPlinth = box(bodyW + 0.42, 0.08, bodyD + 0.42, '#181B20', 0.02);
  subPlinth.position.y = 0.04;
  add(group, subPlinth);

  // 2. Heavy fortified corner pillars (Reinforced stone bastions)
  const pillarMat = new THREE.MeshStandardMaterial({
    color: '#2B313A',
    roughness: 0.65,
    metalness: 0.4,
  });
  const cx = bodyW * 0.45;
  const cz = bodyD * 0.45;
  const cornerPositions = [
    [cx, cz],
    [-cx, cz],
    [cx, -cz],
    [-cx, -cz],
  ];
  cornerPositions.forEach(([px, pz]) => {
    const pillarGeo = new THREE.BoxGeometry(0.26, barHeight + 0.22, 0.26);
    const p = new THREE.Mesh(pillarGeo, pillarMat);
    p.castShadow = true;
    p.position.set(px, (barHeight + 0.22) * 0.5 + 0.14, pz);
    group.add(p);

    // Decorative iron bracket cap on each pillar
    const cap = box(0.3, 0.06, 0.3, '#111418', 0.02);
    cap.position.set(px, barHeight + 0.26, pz);
    add(group, cap);
  });

  // 3. Dense vertical & horizontal steel cage bars
  addJailBars(group, bodyW, bodyD, smashed, barHeight);

  // 4. Heavy Iron Cell Gate with padlock on front
  const gateMat = new THREE.MeshStandardMaterial({
    color: '#3A444E',
    metalness: 0.85,
    roughness: 0.3,
  });
  const gateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.55, barHeight * 0.9, 0.06), gateMat);
  gateFrame.position.set(0, barHeight * 0.48 + 0.14, bodyD * 0.46);
  group.add(gateFrame);

  // Padlock & electronic keypad
  const lockMat = new THREE.MeshStandardMaterial({
    color: smashed ? '#555555' : '#D69E2E',
    metalness: 0.95,
    roughness: 0.15,
  });
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), lockMat);
  lock.position.set(0.18, barHeight * 0.48 + 0.14, bodyD * 0.48);
  group.add(lock);

  // 5. Clean fortress slab roof
  const roofY = barHeight + 0.24;
  const roof = box(bodyW + 0.24, 0.18, bodyD + 0.24, '#1E232B', 0.02);
  roof.position.y = roofY;
  if (smashed) {
    roof.rotation.z = 0.08;
    roof.position.y = roofY - 0.08;
  }
  add(group, roof);

  // 6. Security searchlight attached to front pillar
  const spotMat = new THREE.MeshStandardMaterial({
    color: smashed ? '#222222' : '#F6E05E',
    emissive: smashed ? '#000000' : '#ECC94B',
    emissiveIntensity: smashed ? 0 : 0.9,
    roughness: 0.3,
  });
  const spotLight = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 12), spotMat);
  spotLight.position.set(-cx, barHeight + 0.22, cz + 0.12);
  spotLight.rotation.x = Math.PI * 0.65;
  group.add(spotLight);

  // 8. Prisoner Holding Bunks inside the cell
  const bunkMat = new THREE.MeshStandardMaterial({ color: '#4A5568', roughness: 0.7 });
  const bunkL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, bodyD * 0.6), bunkMat);
  bunkL.position.set(-bodyW * 0.24, 0.28, 0);
  group.add(bunkL);

  const bunkR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, bodyD * 0.6), bunkMat);
  bunkR.position.set(bodyW * 0.24, 0.28, 0);
  group.add(bunkR);

  if (smashed) {
    addRubble(group, 0.12, 0.16, 0.2, 8);
  }

  return group;
}

export function buildIntact(params) {
  return buildJail({ ...params, smashed: false });
}

export function buildDestroyed(params) {
  return buildJail({ ...params, smashed: true });
}
