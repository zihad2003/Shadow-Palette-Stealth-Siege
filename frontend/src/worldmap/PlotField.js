import * as THREE from 'three';
import { createPlotPad } from './PlotPad.js';
import { createPlotMarker } from './PlotMarker.js';
import { createBuildingForPlot } from './buildings.js';
import { mapToWorld } from './mapCoords.js';
import { plotStatusColor } from './clayMaterials.js';

export function createPlotField(plots) {
  const group = new THREE.Group();
  group.name = 'PlotField';

  plots.forEach((plot) => {
    const pad = createPlotPad(plot);
    group.add(pad);

    const { x, z } = mapToWorld(plot.centerX, plot.centerY);
    const marker = createPlotMarker(plot);
    marker.position.set(x, 0.95, z);
    group.add(marker);

    const building = createBuildingForPlot(plot);
    if (building) {
      building.position.set(x, 0.58, z);
      group.add(building);
    }
  });

  return group;
}

export function tintPlotField(plotRoot, plots, hoveredId, selectedId) {
  plotRoot.traverse((obj) => {
    if (obj.userData?.type !== 'plot' || !obj.isMesh || !obj.material) return;
    const plot = plots.find((p) => p.id === obj.userData.plotId);
    if (!plot) return;
    const id = plot.id;
    if (obj.material.color) obj.material.color.set(plotStatusColor(plot.status));
    if (obj.material.emissive) {
      if (id === selectedId) {
        obj.material.emissive.set('#f4a261');
        obj.material.emissiveIntensity = 0.35;
      } else if (id === hoveredId) {
        obj.material.emissive.set('#f1faee');
        obj.material.emissiveIntensity = 0.18;
      } else {
        obj.material.emissive.set('#000000');
        obj.material.emissiveIntensity = 0;
      }
    }
    if (obj.name?.startsWith('PlotPad')) {
      obj.position.y = id === selectedId ? 0.56 : id === hoveredId ? 0.52 : 0.48;
    }
  });
}
