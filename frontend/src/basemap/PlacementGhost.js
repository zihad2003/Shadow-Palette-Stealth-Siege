import * as THREE from 'three';
import { BASE_CLAY } from './clayMaterials.js';

// Animated hover preview: pulsing ring + ghost box for building, glowing disc for paint.
export function createPlacementGhost() {
  const group = new THREE.Group();

  // ── Building ghost box ──
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.8, 1),
    new THREE.MeshBasicMaterial({
      color: BASE_CLAY.white,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    })
  );
  box.visible = false;
  group.add(box);

  // ── Wire outline on the ghost box for clarity ──
  const wireBox = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.8, 1)),
    new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.7 })
  );
  wireBox.visible = false;
  group.add(wireBox);

  // ── Paint disc ──
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 24),
    new THREE.MeshBasicMaterial({
      color: BASE_CLAY.white,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.visible = false;
  group.add(disc);

  // ── Hover ring indicator — always visible when hovering a cell ──
  const ringGeo = new THREE.RingGeometry(0.42, 0.52, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  group.add(ring);

  // ── Corner brackets for cell highlight ──
  const bracketGroup = new THREE.Group();
  const bracketMat = new THREE.LineBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.8,
  });
  const bracketLen = 0.2;
  const corners = [
    [-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]
  ];
  const dirs = [
    [[1, 0], [0, 1]], [[-1, 0], [0, 1]], [[-1, 0], [0, -1]], [[1, 0], [0, -1]]
  ];
  corners.forEach(([cx, cz], i) => {
    const pts = [
      new THREE.Vector3(cx + dirs[i][0][0] * bracketLen, 0.04, cz + dirs[i][0][1] * bracketLen),
      new THREE.Vector3(cx, 0.04, cz),
      new THREE.Vector3(cx + dirs[i][1][0] * bracketLen, 0.04, cz + dirs[i][1][1] * bracketLen),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    bracketGroup.add(new THREE.Line(geo, bracketMat));
  });
  bracketGroup.visible = false;
  group.add(bracketGroup);

  // ── Down-pointing arrow indicator above the cell ──
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0);
  arrowShape.lineTo(-0.08, 0.18);
  arrowShape.lineTo(-0.03, 0.18);
  arrowShape.lineTo(-0.03, 0.35);
  arrowShape.lineTo(0.03, 0.35);
  arrowShape.lineTo(0.03, 0.18);
  arrowShape.lineTo(0.08, 0.18);
  arrowShape.closePath();

  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  const arrowMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const arrow = new THREE.Mesh(arrowGeo, arrowMat);
  arrow.rotation.x = -Math.PI / 4; // tilt toward camera
  arrow.visible = false;
  group.add(arrow);

  // Animation state
  let animTime = 0;

  return {
    group,

    // Call every frame from the render loop
    update(elapsed) {
      animTime = elapsed;
      if (ring.visible) {
        ring.material.opacity = 0.4 + Math.sin(elapsed * 4) * 0.2;
        ring.scale.setScalar(1.0 + Math.sin(elapsed * 3) * 0.06);
        ring.rotation.z = elapsed * 0.5;
      }
      if (bracketGroup.visible) {
        bracketMat.opacity = 0.5 + Math.sin(elapsed * 3.5 + 1) * 0.3;
      }
      if (arrow.visible) {
        const bob = Math.sin(elapsed * 4) * 0.08;
        arrow.position.y = arrow.userData.baseY + bob;
        arrowMat.opacity = 0.6 + Math.sin(elapsed * 3) * 0.25;
      }
      if (box.visible) {
        box.material.opacity = 0.22 + Math.sin(elapsed * 3) * 0.1;
      }
    },

    showBuilding(wx, wz, w, h, ok) {
      disc.visible = false;
      // Ghost box
      box.visible = true;
      box.scale.set(w * 0.85, 1, h * 0.85);
      box.position.set(wx, 0.4, wz);
      box.material.color.set(ok ? BASE_CLAY.white : '#E63946');
      // Wire outline
      wireBox.visible = true;
      wireBox.scale.set(w * 0.85, 1, h * 0.85);
      wireBox.position.set(wx, 0.4, wz);
      wireBox.material.color.set(ok ? '#38bdf8' : '#E63946');
      // Ring
      ring.visible = true;
      ring.position.set(wx, 0.04, wz);
      const rScale = Math.max(w, h) * 0.6;
      ring.scale.setScalar(rScale);
      ringMat.color.set(ok ? '#38bdf8' : '#E63946');
      // Corner brackets
      bracketGroup.visible = true;
      bracketGroup.position.set(wx, 0, wz);
      bracketGroup.scale.set(w, 1, h);
      bracketMat.color.set(ok ? '#38bdf8' : '#E63946');
      // Arrow
      arrow.visible = true;
      arrow.position.set(wx, 1.6 + (h * 0.1), wz);
      arrow.userData.baseY = 1.6 + (h * 0.1);
      arrowMat.color.set(ok ? '#38bdf8' : '#E63946');
    },

    showPaint(wx, wz, hex) {
      box.visible = false;
      wireBox.visible = false;
      arrow.visible = false;
      disc.visible = true;
      disc.position.set(wx, 0.03, wz);
      disc.material.color.set(hex);
      // Ring around paint spot
      ring.visible = true;
      ring.position.set(wx, 0.04, wz);
      ring.scale.setScalar(0.8);
      ringMat.color.set(hex);
      // Corner brackets
      bracketGroup.visible = true;
      bracketGroup.position.set(wx, 0, wz);
      bracketGroup.scale.set(1, 1, 1);
      bracketMat.color.set(hex);
    },

    showCell(wx, wz) {
      // Simple hover indicator — no building/paint
      box.visible = false;
      wireBox.visible = false;
      disc.visible = false;
      arrow.visible = false;
      ring.visible = true;
      ring.position.set(wx, 0.04, wz);
      ring.scale.setScalar(0.6);
      ringMat.color.set('#38bdf8');
      bracketGroup.visible = true;
      bracketGroup.position.set(wx, 0, wz);
      bracketGroup.scale.set(1, 1, 1);
      bracketMat.color.set('#38bdf8');
    },

    hide() {
      box.visible = false;
      wireBox.visible = false;
      disc.visible = false;
      ring.visible = false;
      bracketGroup.visible = false;
      arrow.visible = false;
    },
  };
}
