import * as THREE from 'three';

function markerLabel(plot) {
  if (plot.status === 'CLAIMED_SELF') return `#${plot.id} BASE`;
  if (plot.status === 'CLAIMED_ENEMY') return `U#${plot.ownerId || plot.id}`;
  return `#${plot.id}`;
}

function markerColor(plot) {
  if (plot.status === 'CLAIMED_SELF') return '#264653';
  if (plot.status === 'CLAIMED_ENEMY') return '#e63946';
  return '#2a9d8f';
}

export function createPlotMarker(plot) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 160, 48);
  ctx.fillStyle = markerColor(plot);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(8, 8, 144, 32, 16);
  } else {
    ctx.rect(8, 8, 144, 32);
  }
  ctx.fill();
  ctx.fillStyle = '#f1faee';
  ctx.font = 'bold 18px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(markerLabel(plot), 80, 25);

  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  );
  sprite.scale.set(1.55, 0.46, 1);
  sprite.name = `PlotMarker-${plot.id}`;
  sprite.userData = { type: 'plot', plotId: plot.id };
  return sprite;
}
