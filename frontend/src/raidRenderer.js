// 2.5D Isometric Grayscale Raid Mode Canvas Renderer

import { gridToScreen, drawIsoDiamond, drawIsoBlock, adjustColorBrightness } from './isoUtils.js';
import { drawSpriteOrFallback } from './assetLoader.js';

const GRID_SIZE = 20;

// LERP Position State for Smooth Movement Gliding (~150ms)
let currentRenderPos = { x: 10, y: 19 };

export function renderGrayscaleRaid(ctx, raidState) {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  // Isometric Grid Config
  const tileW = 28;
  const tileH = 14;
  const originX = width / 2;
  const originY = 50;

  // Smooth LERP Position Interpolation (~150ms)
  if (raidState.playerPos) {
    const targetX = raidState.playerPos.x;
    const targetY = raidState.playerPos.y;
    currentRenderPos.x += (targetX - currentRenderPos.x) * 0.25;
    currentRenderPos.y += (targetY - currentRenderPos.y) * 0.25;
  }

  // 1. Draw Desaturated Grayscale Atmospheric Background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#0a0d14');
  bgGradient.addColorStop(1, '#111824');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // 2. Render Grayscale 2.5D Isometric Ground Tiles
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const { x: sx, y: sy } = gridToScreen(c, r, originX, originY, tileW, tileH);
      const tileFill = (r + c) % 2 === 0 ? '#181c24' : '#12151b';
      const strokeColor = '#273145';

      drawSpriteOrFallback(
        ctx,
        `/assets/tiles/grass_gray.png`,
        sx, sy, tileW, tileH,
        () => {
          drawIsoDiamond(ctx, sx, sy, tileW, tileH, tileFill, strokeColor, 1);
        }
      );
    }
  }

  // 3. Render 2.5D Gate Wall Block (x: 9, y: 0)
  const hits = Math.min(4, raidState.gateWallHits || 0);
  const isGateBroken = hits >= 4;
  const { x: gsx, y: gsy } = gridToScreen(9, 0, originX, originY, tileW, tileH);

  if (!isGateBroken) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;

    const wallColor = raidState.isGateLocked ? '#dc2626' : '#475569';
    drawIsoBlock(ctx, gsx, gsy, tileW * 2, tileH * 2, 20, wallColor, '#334155', '#1e293b', '#64748b');
    ctx.restore();

    // Wall Break Progress Bar
    const barWidth = (tileW * 2 - 8) * (hits / 4.0);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(gsx - tileW + 4, gsy - 26, barWidth, 4);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(`GATE (${hits}/4 Hits)`, gsx, gsy - 32);

    if (raidState.isActionCharging) {
      ctx.fillStyle = '#67e8f9';
      ctx.fillText('CHARGING... 🔨', gsx, gsy - 42);
    }
  } else {
    drawIsoDiamond(ctx, gsx, gsy, tileW * 2, tileH * 2, 'rgba(22, 163, 74, 0.4)', '#16a34a', 2);
    ctx.fillStyle = '#16a34a';
    ctx.font = 'bold 10px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('BROKEN EXIT', gsx, gsy - 12);
  }

  // 4. Render Defender Buildings in Desaturated Grayscale 2.5D
  if (raidState.buildings) {
    const sortedBuildings = [...raidState.buildings].sort((a, b) => (a.xPos + a.yPos) - (b.xPos + b.yPos));

    sortedBuildings.forEach((b) => {
      const bw = b.footprintWidth || 3;
      const bh = b.footprintHeight || 3;
      const { x: bsx, y: bsy } = gridToScreen(b.xPos, b.yPos, originX, originY, tileW, tileH);

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 8;

      drawSpriteOrFallback(
        ctx,
        `/assets/buildings/${(b.buildingType || '').toLowerCase()}_gray.png`,
        bsx, bsy, bw * tileW, bh * tileH * 2,
        () => {
          drawIsoBlock(
            ctx,
            bsx, bsy,
            (bw * tileW) / 2, (bh * tileH) / 2,
            20,
            '#334155',
            '#1e293b',
            '#0f172a',
            '#64748b'
          );
        }
      );
      ctx.restore();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 10px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(b.buildingType || 'BUILDING', bsx, bsy - 24);
    });
  }

  // 5. Render 2.5D Lighthouse Spotlight Sweep (+1 tile cone range on alarm)
  if (raidState.lighthouse) {
    const lx = raidState.lighthouse.xPos || 10;
    const ly = raidState.lighthouse.yPos || 2;
    const { x: lsx, y: lsy } = gridToScreen(lx, ly, originX, originY, tileW, tileH);
    const beamAngle = raidState.beamAngleDeg || 90;

    const rad = (beamAngle * Math.PI) / 180;
    // Base 7 tiles, on alarm 8 tiles range (+1 tile cone range per GDD 9)
    const range = raidState.isAlarmTriggered ? 150 : 120;

    ctx.save();
    const gradient = ctx.createRadialGradient(lsx, lsy - 20, 10, lsx, lsy + range, range + 20);
    gradient.addColorStop(0, raidState.isAlarmTriggered ? 'rgba(239, 68, 68, 0.6)' : 'rgba(251, 191, 36, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(lsx, lsy - 20);
    ctx.arc(lsx, lsy - 20, range, rad - Math.PI * 0.15, rad + Math.PI * 0.15);
    ctx.closePath();
    ctx.fill();

    // 2.5D Tower Prism
    drawIsoBlock(ctx, lsx, lsy, tileW, tileH, 24, raidState.isAlarmTriggered ? '#ef4444' : '#f59e0b', '#b45309', '#78350f', '#fef08a');
    ctx.restore();
  }

  // 6. Render Player Character Marker with LERP Movement (~150ms)
  const { x: psx, y: psy } = gridToScreen(currentRenderPos.x, currentRenderPos.y, originX, originY, tileW, tileH);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  drawSpriteOrFallback(
    ctx,
    `/assets/characters/player.png`,
    psx, psy, tileW, tileH * 2,
    () => {
      ctx.fillStyle = raidState.camoHex || '#38bdf8';
      ctx.beginPath();
      ctx.arc(psx, psy, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  );
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px Outfit';
  ctx.textAlign = 'center';
  ctx.fillText('YOU (1.25x Speed)', psx, psy - 16);
}
