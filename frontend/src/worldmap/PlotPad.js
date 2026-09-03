import * as THREE from 'three';
import { clayMat, plotStatusColor } from './clayMaterials.js';
import { parsePlotPoints } from './mapCoords.js';

export function createPlotPad(plot) {
  const pts = parsePlotPoints(plot.points);
  if (pts.length < 3) return new THREE.Group();

  const shape = new THREE.Shape();
  pts.forEach((p, i) => {
    if (i === 0) shape.moveTo(p.x, -p.z);
    else shape.lineTo(p.x, -p.z);
  });
  shape.closePath();

  const height = plot.ring === 'CORNER' ? 0.28 : plot.ring === 'OUTER' ? 0.16 : 0.2;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);

  const mesh = new THREE.Mesh(geo, clayMat(plotStatusColor(plot.status), { transparent: true, opacity: 0.82 }));
  mesh.position.y = 0.48;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { type: 'plot', plotId: plot.id };
  mesh.name = `PlotPad-${plot.id}`;
  return mesh;
}
