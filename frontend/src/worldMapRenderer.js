// 2.5D Isometric World Map Renderer — High-Density Diorama Graphics Engine (17x17 Grid = 64 Plots)

import { gridToScreen, drawIsoDiamond, drawIsoBlock } from './isoUtils.js';

// 17x17 grid (8x8 Plot matrix separated by cobblestone avenues)
const GRID_SIZE = 17;

// Ambient Dust & Glow Particles
const dustParticles = Array.from({ length: 60 }, () => ({
  x: Math.random() * 2500,
  y: Math.random() * 1400,
  size: 1.5 + Math.random() * 3,
  speedX: -0.3 + Math.random() * 0.6,
  speedY: -0.4 - Math.random() * 0.4,
  alpha: 0.2 + Math.random() * 0.6,
}));

// Floating Overhead Clouds System
const cloudParticles = Array.from({ length: 6 }, (_, i) => ({
  x: i * 400 - 200,
  y: 60 + Math.random() * 200,
  rx: 120 + Math.random() * 80,
  ry: 45 + Math.random() * 25,
  speed: 0.15 + Math.random() * 0.25,
  alpha: 0.15 + Math.random() * 0.15,
}));

function isRoadCell(col, row) {
  return col % 2 === 0 || row % 2 === 0;
}

function plotCoordsFromGrid(col, row) {
  if (col % 2 === 1 && row % 2 === 1) {
    return { px: (col - 1) / 2, py: (row - 1) / 2 };
  }
  return null;
}

// ─── Rich 2.5D Environment Prop Renderers ─────────────────────────────

function drawPineTreeProp(ctx, sx, sy, scale = 1.0) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 8 * scale;
  ctx.shadowOffsetY = 6 * scale;

  ctx.fillStyle = '#543d2b';
  ctx.fillRect(sx - 3 * scale, sy - 8 * scale, 6 * scale, 10 * scale);

  const layers = [
    { y: sy - 14 * scale, r: 14 * scale, color: '#1b4332' },
    { y: sy - 24 * scale, r: 10 * scale, color: '#2d6a4f' },
    { y: sy - 32 * scale, r: 7 * scale,  color: '#40916c' },
  ];

  layers.forEach((l) => {
    ctx.fillStyle = l.color;
    ctx.beginPath();
    ctx.arc(sx, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = Math.max(1, scale);
    ctx.stroke();
  });
  ctx.restore();
}

function drawCherryBlossomTree(ctx, sx, sy, scale = 1.0) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 8 * scale;
  ctx.shadowOffsetY = 6 * scale;

  // Trunk
  ctx.fillStyle = '#4a3222';
  ctx.fillRect(sx - 3 * scale, sy - 8 * scale, 6 * scale, 10 * scale);

  // Pink Blossom Canopy
  const layers = [
    { y: sy - 14 * scale, r: 15 * scale, color: '#be185d' },
    { y: sy - 24 * scale, r: 12 * scale, color: '#f43f5e' },
    { y: sy - 32 * scale, r: 8 * scale,  color: '#fb7185' },
  ];

  layers.forEach((l) => {
    ctx.fillStyle = l.color;
    ctx.beginPath();
    ctx.arc(sx, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = Math.max(1, scale);
    ctx.stroke();
  });
  ctx.restore();
}

function drawBoulderProp(ctx, sx, sy, scale = 1.0) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 6 * scale;

  ctx.fillStyle = '#78716c';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 8 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#a8a29e';
  ctx.beginPath();
  ctx.ellipse(sx - 2 * scale, sy - 2 * scale, 5 * scale, 3 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStreetlampWithGlow(ctx, sx, sy, scale = 1.0) {
  ctx.save();

  // Post
  ctx.fillStyle = '#334155';
  ctx.fillRect(sx - 2 * scale, sy - 16 * scale, 4 * scale, 16 * scale);

  // Glowing Lantern Top
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 12 * scale;
  ctx.beginPath();
  ctx.arc(sx, sy - 18 * scale, 4 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Light Cone Radial Glow on Ground
  const lightCone = ctx.createRadialGradient(sx, sy, 2 * scale, sx, sy, 18 * scale);
  lightCone.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
  lightCone.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = lightCone;
  ctx.beginPath();
  ctx.arc(sx, sy, 18 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ─── 2.5D Isometric Mini Structure (Occupied Plots) ───────────────────
function drawMiniBaseStructure(ctx, sx, sy, tileW, tileH, blockHeight, isOwned, ownerId, plotId, scale) {
  const topY = sy - blockHeight;

  ctx.save();
  // Main Tower Body
  const tw = Math.floor(tileW * 0.45);
  const th = Math.floor(tileH * 0.45);
  const bHeight = Math.floor(24 * scale);

  const mainColor = isOwned ? '#3b82f6' : '#ef4444';
  const roofColor = isOwned ? '#60a5fa' : '#f87171';
  const wallColor = isOwned ? '#1d4ed8' : '#b91c1c';

  // Tower Block
  drawIsoBlock(
    ctx,
    sx, topY - 4 * scale,
    tw, th,
    bHeight,
    mainColor,
    wallColor,
    wallColor,
    'rgba(0,0,0,0.4)'
  );

  // Pyramidal 3D Roof
  const roofApexY = topY - 4 * scale - bHeight - 12 * scale;
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(sx, roofApexY);
  ctx.lineTo(sx + tw / 2, topY - 4 * scale - bHeight);
  ctx.lineTo(sx, topY - 4 * scale - bHeight + th / 2);
  ctx.lineTo(sx - tw / 2, topY - 4 * scale - bHeight);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = Math.max(1, scale);
  ctx.stroke();

  // Territory Flag Pole
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = Math.max(1.5, 1.5 * scale);
  ctx.beginPath();
  ctx.moveTo(sx, roofApexY);
  ctx.lineTo(sx, roofApexY - 14 * scale);
  ctx.stroke();

  // Floating Banner Flag
  ctx.fillStyle = isOwned ? '#fbbf24' : '#ec4899';
  ctx.beginPath();
  ctx.moveTo(sx, roofApexY - 14 * scale);
  ctx.lineTo(sx + 10 * scale, roofApexY - 10 * scale);
  ctx.lineTo(sx, roofApexY - 6 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function getWorldMapOrigin(width, height, zoomScale = 1.0) {
  // 17x17 grid (8x8 plot matrix + road cells).
  // Dynamically calculate tile width so 17 cells span across ~90% of screen width!
  const baseTileW = Math.max(65, Math.min(130, Math.floor(width / 18.5)));
  const tileW = Math.floor(baseTileW * zoomScale);
  const tileH = Math.floor(tileW / 2);
  const originX = width / 2;
  const islandHeight = 17 * tileH;
  const originY = Math.max(80, Math.floor((height - islandHeight) / 2.3));
  return { originX, originY, tileW, tileH };
}

// ─── Main Render Function ────────────────────────────────────────────

export function renderWorldMap(ctx, plots, activeUserId, hoveredPlotId, zoomScale = 1.0) {
  const canvas = ctx.canvas;
  const dpr = window.devicePixelRatio || 1;
  const width  = canvas.clientWidth || (canvas.width / dpr);
  const height = canvas.clientHeight || (canvas.height / dpr);

  const { originX, originY, tileW, tileH } = getWorldMapOrigin(width, height, zoomScale);
  const scale = tileW / 80;

  const time = Date.now() * 0.001;

  // ===================================================================
  // LAYER 0: Animated Ocean Water & Sky Backdrop
  // ===================================================================
  const waterGrad = ctx.createLinearGradient(0, 0, 0, height);
  waterGrad.addColorStop(0, '#091c33');
  waterGrad.addColorStop(0.5, '#0f335c');
  waterGrad.addColorStop(1, '#071526');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, 0, width, height);

  // Animated Waves & Caustics
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.lineWidth = Math.max(1.5, 2 * scale);
  for (let i = 0; i < 12; i++) {
    const wy = (i * 95 + time * 14) % height;
    ctx.beginPath();
    ctx.moveTo(0, wy);
    ctx.quadraticCurveTo(width / 2, wy + Math.sin(time + i) * 20, width, wy);
    ctx.stroke();
  }
  ctx.restore();

  // Glow Dust Particles
  ctx.save();
  dustParticles.forEach((p) => {
    p.x += p.speedX;
    p.y += p.speedY;
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;

    ctx.fillStyle = `rgba(251, 191, 36, ${p.alpha * 0.35})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * scale, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // ===================================================================
  // LAYER 1: 3D Shoreline Sand & Cliff Base Island Foundation
  // ===================================================================
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 24 * scale;

  const cliffOffsetY = Math.floor(10 * scale);
  const cliffHeight = Math.floor(20 * scale);

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (row === 0 || row === GRID_SIZE - 1 || col === 0 || col === GRID_SIZE - 1) {
        const { x: csx, y: csy } = gridToScreen(col, row, originX, originY, tileW, tileH);

        // Shoreline Sand Base
        drawIsoBlock(
          ctx,
          csx, csy + cliffOffsetY,
          tileW + 4, tileH + 2,
          cliffHeight,
          '#d97706', // Sandy Gold
          '#b45309',
          '#92400e',
          'rgba(0,0,0,0.3)'
        );
      }
    }
  }
  ctx.restore();

  // ===================================================================
  // LAYER 2 & 3 & 4: Ground Mesh, Props, and Plots (Depth-Sorted)
  // ===================================================================
  const renderList = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      renderList.push({ col, row, depth: row + col });
    }
  }
  renderList.sort((a, b) => a.depth - b.depth);

  renderList.forEach(({ col, row }) => {
    const { x: sx, y: sy } = gridToScreen(col, row, originX, originY, tileW, tileH);

    if (isRoadCell(col, row)) {
      // ── Crisp Cobblestone Road Cell ─────────────────────────────
      const isIntersection = (col % 2 === 0 && row % 2 === 0);

      const roadFill = isIntersection ? '#cbd5e1' : '#e2e8f0';
      const roadStroke = '#64748b';

      drawIsoDiamond(ctx, sx, sy, tileW, tileH, roadFill, roadStroke, Math.max(1, 1.2 * scale));

      // Streetlamps at key intersections
      if (isIntersection && (col % 4 === 0) && (row % 4 === 0) && col > 0 && row > 0 && col < 16 && row < 16) {
        drawStreetlampWithGlow(ctx, sx, sy, scale);
      }

    } else {
      // ── Lush Grass Base Plot Cell ────────────────────────────────
      const plotCoords = plotCoordsFromGrid(col, row);
      const plot = plotCoords && plots
        ? plots.find(p => p.xCoord === plotCoords.px && p.yCoord === plotCoords.py)
        : null;

      const isHovered  = plot && plot.id === hoveredPlotId;
      const isOwned    = plot && plot.ownerId === activeUserId;
      const isOccupied = plot && plot.isOccupied;

      const blockHeight = isHovered ? Math.floor(22 * scale) : Math.floor(14 * scale);
      let topColor = '#10b981'; // Unclaimed Emerald
      let leftColor = '#059669';
      let rightColor = '#047857';

      if (isOwned) {
        topColor = '#3b82f6';
        leftColor = '#2563eb';
        rightColor = '#1d4ed8';
      } else if (isOccupied) {
        topColor = '#ef4444';
        leftColor = '#dc2626';
        rightColor = '#b91c1c';
      }

      if (isHovered) {
        topColor = isOwned ? '#60a5fa' : (isOccupied ? '#f87171' : '#34d399');
      }

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur  = 10 * scale;
      ctx.shadowOffsetY = 4 * scale;

      drawIsoBlock(
        ctx,
        sx, sy,
        tileW, tileH,
        blockHeight,
        topColor,
        leftColor,
        rightColor,
        isHovered ? '#ffffff' : 'rgba(0,0,0,0.3)'
      );
      ctx.restore();

      // Dotted Golden Border Outline
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = isHovered ? Math.max(2.5, 2.5 * scale) : Math.max(1.5, 1.5 * scale);
      ctx.setLineDash([Math.floor(4 * scale), Math.floor(4 * scale)]);
      drawIsoDiamond(ctx, sx, sy - blockHeight, tileW - 6 * scale, tileH - 3 * scale, null, '#fbbf24', isHovered ? 2.5 * scale : 1.5 * scale);
      ctx.restore();

      // 2.5D Mini Base Structure on Occupied/Owned Plots
      if (plot && isOccupied) {
        drawMiniBaseStructure(
          ctx,
          sx, sy,
          tileW, tileH,
          blockHeight,
          isOwned,
          plot.ownerId,
          plot.id,
          scale
        );
      }

      // Environmental Trees & Rocks on Plot Corners
      if (row % 4 === 1 && col % 4 === 1) drawPineTreeProp(ctx, sx - 16 * scale, sy - 8 * scale, scale);
      if (row % 4 === 3 && col % 4 === 3) drawCherryBlossomTree(ctx, sx + 16 * scale, sy - 8 * scale, scale);
      if (row % 6 === 1 && col % 6 === 5) drawBoulderProp(ctx, sx - 16 * scale, sy + 6 * scale, scale);

      // Plot Title Label Badge
      if (plot) {
        let label = `PLOT #${plot.id}`;
        if (isOwned) {
          label = `PLOT #${plot.id} (YOUR BASE)`;
        } else if (isOccupied) {
          label = `USER #${plot.ownerId}`;
        }

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, Math.round(11 * scale))}px Outfit`;
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4 * scale;

        ctx.fillText(label, sx, sy - blockHeight + tileH / 2 + 2);
        ctx.restore();
      }
    }
  });

  // ===================================================================
  // LAYER 5: Floating Volumetric Overhead Clouds
  // ===================================================================
  ctx.save();
  cloudParticles.forEach((c) => {
    c.x += c.speed;
    if (c.x > width + 300) c.x = -300;

    const cloudGrad = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, c.rx);
    cloudGrad.addColorStop(0, `rgba(255, 255, 255, ${c.alpha * 0.8})`);
    cloudGrad.addColorStop(0.6, `rgba(226, 232, 240, ${c.alpha * 0.4})`);
    cloudGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.rx * scale, c.ry * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}
