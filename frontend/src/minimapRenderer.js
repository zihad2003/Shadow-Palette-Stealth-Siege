// RTS Minimap Radar Renderer

export function renderMinimap(ctx, plots, activeUserId, cameraState) {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  // 1. Dark RTS Minimap Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  // Outer Gold Border
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, width, height);

  // 2. Render Plot Grid Rectangles on Minimap
  const cols = 8;
  const rows = 8;
  const cellW = (width - 12) / cols;
  const cellH = (height - 12) / rows;
  const offsetX = 6;
  const offsetY = 6;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * cellW;
      const y = offsetY + r * cellH;

      const plot = plots.find(p => p.xCoord === c && p.yCoord === r);

      let fillColor = '#1e293b'; // Unclaimed dark slate
      if (plot) {
        if (plot.ownerId === activeUserId) {
          fillColor = '#3b82f6'; // Player blue
        } else if (plot.isOccupied) {
          fillColor = '#ef4444'; // Enemy red
        }
      }

      ctx.fillStyle = fillColor;
      ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);
    }
  }

  // 3. Render Camera Viewport Frustum Box
  if (cameraState) {
    const rx = offsetX + (cameraState.panX / 2000) * (width - 24);
    const ry = offsetY + (cameraState.panY / 2000) * (height - 24);
    const rw = Math.max(20, width * 0.45);
    const rh = Math.max(16, height * 0.45);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.setLineDash([]);
  }
}
