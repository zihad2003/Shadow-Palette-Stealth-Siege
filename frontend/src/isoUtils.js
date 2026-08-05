// Isometric Projection & Drawing Utilities (2:1 Diamond Projection)

export function setupHiDPICanvas(canvas, ctx, cssWidth = 800, cssHeight = 600) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  return dpr;
}

/**
 * Converts 2D grid coordinates (gx, gy) to 2.5D Isometric Screen Coordinates (sx, sy)
 */
export function gridToScreen(gx, gy, originX, originY, tileW, tileH) {
  const sx = originX + (gx - gy) * (tileW / 2);
  const sy = originY + (gx + gy) * (tileH / 2);
  return { x: sx, y: sy };
}

/**
 * Converts 2.5D Isometric Screen Coordinates (sx, sy) back to 2D Grid Coordinates (gx, gy)
 */
export function screenToGrid(sx, sy, originX, originY, tileW, tileH) {
  const dx = sx - originX;
  const dy = sy - originY;

  const halfW = tileW / 2;
  const halfH = tileH / 2;

  const gx = (dx / halfW + dy / halfH) / 2;
  const gy = (dy / halfH - dx / halfW) / 2;

  return {
    x: Math.floor(gx),
    y: Math.floor(gy),
    floatX: gx,
    floatY: gy,
  };
}

/**
 * Draws a 2.5D Isometric 2:1 Diamond Tile Face
 */
export function drawIsoDiamond(ctx, sx, sy, tileW, tileH, fillColor, strokeColor, lineWidth = 1) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(sx, sy);                     // Top vertex
  ctx.lineTo(sx + halfW, sy + halfH);     // Right vertex
  ctx.lineTo(sx, sy + tileH);             // Bottom vertex
  ctx.lineTo(sx - halfW, sy + halfH);     // Left vertex
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws a 2.5D Extruded Isometric Prism/Block (Top, Left, Right faces)
 */
export function drawIsoBlock(
  ctx,
  sx, sy,
  tileW, tileH,
  blockHeight,
  topColor,
  leftColor,
  rightColor,
  strokeColor = 'rgba(0,0,0,0.3)'
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const topY = sy - blockHeight;

  ctx.save();

  // 1. Left Face
  ctx.beginPath();
  ctx.moveTo(sx - halfW, sy + halfH);
  ctx.lineTo(sx, sy + tileH);
  ctx.lineTo(sx, sy + tileH - blockHeight);
  ctx.lineTo(sx - halfW, sy + halfH - blockHeight);
  ctx.closePath();
  ctx.fillStyle = leftColor || adjustColorBrightness(topColor, -30);
  ctx.fill();
  if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.stroke(); }

  // 2. Right Face
  ctx.beginPath();
  ctx.moveTo(sx, sy + tileH);
  ctx.lineTo(sx + halfW, sy + halfH);
  ctx.lineTo(sx + halfW, sy + halfH - blockHeight);
  ctx.lineTo(sx, sy + tileH - blockHeight);
  ctx.closePath();
  ctx.fillStyle = rightColor || adjustColorBrightness(topColor, -15);
  ctx.fill();
  if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.stroke(); }

  // 3. Top Face (Elevated Diamond)
  drawIsoDiamond(ctx, sx, topY, tileW, tileH, topColor, strokeColor, 1);

  ctx.restore();
}

/**
 * Helper to darken/lighten hex colors for 3D side faces
 */
export function adjustColorBrightness(hex, percent) {
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
