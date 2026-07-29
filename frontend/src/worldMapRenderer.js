// World Map Canvas Renderer (Plots + Connecting Roads)

const GRID_COLS = 5;
const GRID_ROWS = 5;

export function renderWorldMap(ctx, plots, activeUserId, hoveredPlotId) {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  // Draw Map Background
  ctx.fillStyle = '#090b10';
  ctx.fillRect(0, 0, width, height);

  const padding = 40;
  const cellW = (width - padding * 2) / GRID_COLS;
  const cellH = (height - padding * 2) / GRID_ROWS;

  // 1. Draw Roads Connecting Plots
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 12;

  // Horizontal roads
  for (let r = 0; r < GRID_ROWS; r++) {
    const y = padding + r * cellH + cellH / 2;
    ctx.beginPath();
    ctx.moveTo(padding + cellW / 2, y);
    ctx.lineTo(width - padding - cellW / 2, y);
    ctx.stroke();
  }

  // Vertical roads
  for (let c = 0; c < GRID_COLS; c++) {
    const x = padding + c * cellW + cellW / 2;
    ctx.beginPath();
    ctx.moveTo(x, padding + cellH / 2);
    ctx.lineTo(x, height - padding - cellH / 2);
    ctx.stroke();
  }

  // Road Dash Lines
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  for (let r = 0; r < GRID_ROWS; r++) {
    const y = padding + r * cellH + cellH / 2;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 2. Draw Plots
  const plotRects = [];

  plots.forEach((plot) => {
    const x = padding + plot.xCoord * cellW + cellW * 0.1;
    const y = padding + plot.yCoord * cellH + cellH * 0.1;
    const w = cellW * 0.8;
    const h = cellH * 0.8;

    plotRects.push({ plot, x, y, w, h });

    const isHovered = hoveredPlotId === plot.id;
    const isOwnedByMe = plot.ownerId === activeUserId;
    const isOccupied = plot.isOccupied || plot.ownerId != null;

    // Fill Plot Rectangle
    if (isOwnedByMe) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.strokeStyle = '#38bdf8';
    } else if (isOccupied) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.strokeStyle = '#ef4444';
    } else {
      ctx.fillStyle = isHovered ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.1)';
      ctx.strokeStyle = isHovered ? '#34d399' : '#10b981';
    }

    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    // Text Overlay
    ctx.font = 'bold 12px Outfit';
    ctx.textAlign = 'center';

    if (isOwnedByMe) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`MY BASE`, x + w / 2, y + h / 2 - 4);
      ctx.font = '10px Inter';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Plot #${plot.id}`, x + w / 2, y + h / 2 + 12);
    } else if (isOccupied) {
      ctx.fillStyle = '#f87171';
      ctx.fillText(`BASE #${plot.id}`, x + w / 2, y + h / 2 - 4);
      ctx.font = '10px Inter';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Owner: User #${plot.ownerId}`, x + w / 2, y + h / 2 + 12);
    } else {
      ctx.fillStyle = '#34d399';
      ctx.fillText(`PLOT #${plot.id}`, x + w / 2, y + h / 2 - 6);
      ctx.font = '10px Inter';
      ctx.fillStyle = '#a7f3d0';
      ctx.fillText(`[CLAIM]`, x + w / 2, y + h / 2 + 12);
    }
  });

  return plotRects;
}
