// 2.5D Isometric World Map Canvas Renderer

import { gridToScreen, drawIsoDiamond, drawIsoBlock } from './isoUtils.js';
import { drawSpriteOrFallback } from './assetLoader.js';

export function renderWorldMap(ctx, plots, activeUserId, hoveredPlotId) {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  // 1. Draw Atmospheric Ground/Sky Background Gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#0a0e1a');
  bgGradient.addColorStop(0.5, '#111827');
  bgGradient.addColorStop(1, '#060911');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Grid Configuration for 5x5 Isometric World
  const tileW = 100;
  const tileH = 50;
  const originX = width / 2;
  const originY = 120;

  // 2. Render 2.5D Connecting Roads
  ctx.save();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#334155';
  ctx.lineCap = 'round';

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const p1 = gridToScreen(c, r, originX, originY, tileW, tileH);

      // Horizontal Road Connection
      if (c < 4) {
        const p2 = gridToScreen(c + 1, r, originX, originY, tileW, tileH);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y + tileH / 2);
        ctx.lineTo(p2.x, p2.y + tileH / 2);
        ctx.stroke();
      }

      // Vertical Road Connection
      if (r < 4) {
        const p2 = gridToScreen(c, r + 1, originX, originY, tileW, tileH);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y + tileH / 2);
        ctx.lineTo(p2.x, p2.y + tileH / 2);
        ctx.stroke();
      }
    }
  }
  ctx.restore();

  // 3. Render 5x5 Plots in Back-to-Front Order (sorted by r + c)
  const plotList = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const plot = plots ? plots.find((p) => p.xCoord === c && p.yCoord === r) : null;
      plotList.push({ r, c, plot });
    }
  }
  plotList.sort((a, b) => (a.r + a.c) - (b.r + b.c));

  plotList.forEach(({ r, c, plot }) => {
    const { x: sx, y: sy } = gridToScreen(c, r, originX, originY, tileW, tileH);
    const isHovered = plot && plot.id === hoveredPlotId;
    const isOwned = plot && plot.ownerId === activeUserId;
    const isOccupied = plot && plot.isOccupied;

    let baseColor = '#10b981'; // Unclaimed Green
    let label = 'UNCLAIMED';

    if (isOwned) {
      baseColor = '#3b82f6'; // Own Plot Blue
      label = `PLOT #${plot.id} (YOUR BASE)`;
    } else if (isOccupied) {
      baseColor = '#ef4444'; // Occupied Red
      label = `USER #${plot.ownerId}`;
    }

    if (isHovered) {
      baseColor = isOwned ? '#60a5fa' : (isOccupied ? '#f87171' : '#34d399');
    }

    // Soft Drop Shadow under Plot Platform
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 8;

    // Draw 2.5D Isometric Raised Platform Block
    const blockHeight = isHovered ? 18 : 12;

    drawSpriteOrFallback(
      ctx,
      `/assets/tiles/plot_${isOwned ? 'owned' : (isOccupied ? 'occupied' : 'unclaimed')}.png`,
      sx, sy, tileW, tileH * 2,
      () => {
        drawIsoBlock(
          ctx,
          sx, sy,
          tileW, tileH,
          blockHeight,
          baseColor,
          adjustColorBrightness(baseColor, -30),
          adjustColorBrightness(baseColor, -15),
          isHovered ? '#ffffff' : 'rgba(0,0,0,0.3)'
        );
      }
    );
    ctx.restore();

    // Plot Title Label
    if (plot) {
      ctx.save();
      const textY = sy - blockHeight - 6;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Outfit';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(label, sx, textY);
      ctx.restore();
    }
  });
}

function adjustColorBrightness(hex, percent) {
  if (!hex || hex[0] !== '#') return hex || '#888888';
  let num = parseInt(hex.replace('#', ''), 16);
  let amt = Math.round(2.55 * percent);
  let R = (num >> 16) + amt;
  let G = (num >> 8 & 0x00FF) + amt;
  let B = (num & 0x0000FF) + amt;

  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 0 ? 0 : B) : 255)
  ).toString(16).slice(1);
}
