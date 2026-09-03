import * as THREE from 'three';
import { clayMat, CLAY } from './clayMaterials.js';
import { mapToWorld } from './mapCoords.js';

export function createPlotSelectRing() {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.05, 8, 24),
    clayMat(CLAY.gold)
  );
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  ring.name = 'PlotSelectRing';
  return ring;
}

export function placePlotSelectRing(ring, plot) {
  if (!plot) {
    ring.visible = false;
    return;
  }
  const { x, z } = mapToWorld(plot.centerX, plot.centerY);
  ring.position.set(x, 0.78, z);
  ring.visible = true;
}
