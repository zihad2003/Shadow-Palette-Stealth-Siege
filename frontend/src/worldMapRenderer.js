// 2.5D Isometric World Map Canvas Renderer — Crisp Diorama Engine
//
// Render Pipeline:
// Layer 0: Animated Ocean Caustics & Sky Gradient
// Layer 1: 3D Cliff Foundation Base Ledge
// Layer 2: Seamless Isometric Road Network & Plot Diamonds
// Layer 3: Environmental Props (Trees, Boulders, Lantern Posts)
// Layer 4: Buildings & Player Base Elements
// Layer 5: Post-Processing Sun Shafts & Floating Dust Particles & Cloud Vignette

import { gridToScreen, drawIsoDiamond, drawIsoBlock, adjustColorBrightness } from './isoUtils.js';

const GRID_SIZE = 7;

// Ambient Dust Particle System
const dustParticles = Array.from({ length: 30 }, () => ({
  x: Math.random() * 800,
  y: Math.random() * 600,
  size: 1 + Math.random() * 2,
  speedX: -0.2 + Math.random() * 0.4,
  speedY: -0.3 - Math.random() * 0.3,
  alpha: 0.3 + Math.random() * 0.5,
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

// ─── Environment Prop Drawing Functions ──────────────────────────────

function drawPineTreeProp(ctx, sx, sy) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 6;

  // Trunk
  ctx.fillStyle = '#543d2b';
  ctx.fillRect(sx - 3, sy - 8, 6, 10);

  // Layers of Clay Pine Foliage
  const layers = [
    { y: sy - 14, r: 16, color: '#1b4332' },
    { y: sy - 26, r: 12, color: '#2d6a4f' },
    { y: sy - 36, r: 8,  color: '#40916c' },
  ];

  layers.forEach((l) => {
    ctx.fillStyle = l.color;
    ctx.beginPath();
    ctx.arc(sx, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  ctx.restore();
}

function drawBoulderProp(ctx, sx, sy) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 6;

  ctx.fillStyle = '#78716c';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#a8a29e';
  ctx.beginPath();
  ctx.ellipse(sx - 3, sy - 2, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStonePostProp(ctx, sx, sy) {
  ctx.save();
  ctx.fillStyle = '#57534e';
  ctx.fillRect(sx - 4, sy - 14, 8, 14);

  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(sx, sy - 16, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── Main Render Function ────────────────────────────────────────────

export function renderWorldMap(ctx, plots, activeUserId, hoveredPlotId) {
  const canvas = ctx.canvas;
  const width  = canvas.width;
  const height = canvas.height;

  const tileW   = 80;
  const tileH   = 40;
  const originX = width / 2;
  const originY = 80;

  const time = Date.now() * 0.001;

  // ===================================================================
  // LAYER 0: Animated Ocean Water & Sky Backdrop
  // ===================================================================
  const waterGrad = ctx.createLinearGradient(0, 0, 0, height);
  waterGrad.addColorStop(0, '#0f2b48');
  waterGrad.addColorStop(0.5, '#17477c');
  waterGrad.addColorStop(1, '#0b1d33');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, 0, width, height);

  // Animated Wave Lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) {
    const wy = (i * 75 + time * 12) % height;
    ctx.beginPath();
    ctx.moveTo(0, wy);
    ctx.quadraticCurveTo(width / 2, wy + Math.sin(time + i) * 12, width, wy);
    ctx.stroke();
  }
  ctx.restore();

  // ===================================================================
  // LAYER 1: Island 3D Cliff Base Foundation
  // ===================================================================
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 20;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (row === 0 || row === GRID_SIZE - 1 || col === 0 || col === GRID_SIZE - 1) {
        const { x: csx, y: csy } = gridToScreen(col, row, originX, originY, tileW, tileH);
        drawIsoBlock(
          ctx,
          csx, csy + 14,
          tileW, tileH,
          22,
          '#785d48',
          '#584333',
          '#403024',
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

      const roadFill = isIntersection ? '#c2b69d' : '#d4c7b0';
      const roadStroke = '#8c7d6b';

      drawIsoDiamond(ctx, sx, sy, tileW, tileH, roadFill, roadStroke, 1.5);

      // Cobblestone texture lines inside road
      ctx.save();
      ctx.strokeStyle = 'rgba(120, 100, 80, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx - tileW / 4, sy + tileH / 4);
      ctx.lineTo(sx + tileW / 4, sy + tileH / 4);
      ctx.stroke();
      ctx.restore();

      // Stone Lantern Posts on Intersections
      if (isIntersection && (col === 2 || col === 4) && (row === 2 || row === 4)) {
        drawStonePostProp(ctx, sx, sy);
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

      const blockHeight = isHovered ? 16 : 10;
      let topColor = '#2a9d8f'; // Unclaimed Teal-Green
      let leftColor = '#20776c';
      let rightColor = '#17564e';

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
      ctx.shadowBlur  = 12;
      ctx.shadowOffsetY = 6;

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

      // Dotted Golden Border Outline (matching reference image)
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      ctx.setLineDash([4, 4]);
      drawIsoDiamond(ctx, sx, sy - blockHeight, tileW - 6, tileH - 3, null, '#fbbf24', isHovered ? 2.5 : 1.5);
      ctx.restore();

      // Environmental Props on Edge Plot Corners
      if (row === 1 && col === 1) drawPineTreeProp(ctx, sx - 28, sy - 14);
      if (row === 1 && col === 5) drawPineTreeProp(ctx, sx + 28, sy - 14);
      if (row === 5 && col === 1) drawBoulderProp(ctx, sx - 28, sy + 10);
      if (row === 5 && col === 5) drawPineTreeProp(ctx, sx + 28, sy + 10);

      // Plot Title Label
      if (plot) {
        let label = 'UNCLAIMED';
        if (isOwned) {
          label = `PLOT #${plot.id} (YOUR BASE)`;
        } else if (isOccupied) {
          label = `USER #${plot.ownerId}`;
        }

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Outfit';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(label, sx, sy - blockHeight - 6);
        ctx.restore();
      }
    }
  });

  // ===================================================================
  // LAYER 5: Post-Processing Sun Shafts & Floating Dust & Cloud Vignette
  // ===================================================================

  // Golden-Hour Sun Rays Gradient
  ctx.save();
  const sunGlow = ctx.createLinearGradient(width, 0, 0, height);
  sunGlow.addColorStop(0, 'rgba(251, 191, 36, 0.18)');
  sunGlow.addColorStop(0.4, 'rgba(251, 191, 36, 0.06)');
  sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, width, height);

  // Floating Sun Dust Particles
  dustParticles.forEach((p) => {
    p.x += p.speedX;
    p.y += p.speedY;

    if (p.y < 0) p.y = height;
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;

    ctx.fillStyle = `rgba(254, 240, 138, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // Fluffy Cloud Border Vignettes
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';

  ctx.beginPath();
  ctx.arc(40, 30, 80, 0, Math.PI * 2);
  ctx.arc(120, 20, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(width - 40, 30, 90, 0, Math.PI * 2);
  ctx.arc(width - 120, 20, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(60, height - 20, 90, 0, Math.PI * 2);
  ctx.arc(140, height - 10, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(width - 60, height - 20, 100, 0, Math.PI * 2);
  ctx.arc(width - 160, height - 10, 80, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
