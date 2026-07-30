// 2.5D Isometric Base Builder Canvas Renderer

import { gridToScreen, drawIsoDiamond, drawIsoBlock, adjustColorBrightness } from './isoUtils.js';
import { drawSpriteOrFallback } from './assetLoader.js';

const GRID_SIZE = 20;

export function getBuildingSize(buildingType) {
  switch (buildingType) {
    case 'CRAFT_HOUSE': return { w: 4, h: 4 };
    case 'INK_HOUSE': return { w: 3, h: 3 };
    case 'SLEEP_HOUSE': return { w: 3, h: 3 };
    case 'COIN_GENERATOR': return { w: 4, h: 3 };
    default: return { w: 2, h: 2 };
  }
}

export function renderBaseBuilder(ctx, state) {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  // Isometric Grid Config
  const tileW = 28;
  const tileH = 14;
  const originX = width / 2;
  const originY = 50;

  // 1. Clear & Draw Background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#0a0d14');
  bgGradient.addColorStop(1, '#111827');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // 2. Render 20x20 Ground Grid Tiles in Isometric Projection
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tileKey = `${c},${r}`;
      const customColor = state.paintedTiles ? state.paintedTiles[tileKey] : null;
      const { x: sx, y: sy } = gridToScreen(c, r, originX, originY, tileW, tileH);

      let tileFill = customColor || ((r + c) % 2 === 0 ? '#1e293b' : '#141d2b');
      let strokeColor = '#334155';

      // Highlight Hovered Tile
      if (state.hoverTile && state.hoverTile.xPos === c && state.hoverTile.yPos === r) {
        tileFill = '#38bdf8';
        strokeColor = '#ffffff';
      }

      drawSpriteOrFallback(
        ctx,
        `/assets/tiles/grass.png`,
        sx, sy, tileW, tileH,
        () => {
          drawIsoDiamond(ctx, sx, sy, tileW, tileH, tileFill, strokeColor, 1);
        }
      );
    }
  }

  // 3. Render Placed Buildings (Sorted Back-to-Front by Depth: x + y)
  const renderList = [];

  if (state.buildings) {
    state.buildings.forEach((b) => {
      const depth = (b.xPos || 0) + (b.yPos || 0);
      renderList.push({ type: 'BUILDING', data: b, depth });
    });
  }

  if (state.defenses) {
    state.defenses.forEach((d) => {
      renderList.push({ type: 'DEFENSE', data: d, depth: 10 });
    });
  }

  renderList.sort((a, b) => a.depth - b.depth);

  renderList.forEach((item) => {
    if (item.type === 'BUILDING') {
      const b = item.data;
      const bw = b.footprintWidth || 3;
      const bh = b.footprintHeight || 3;
      const color = b.hexColor || '#38bdf8';

      // Center point of footprint
      const centerGX = b.xPos + bw / 2;
      const centerGY = b.yPos + bh / 2;
      const { x: sx, y: sy } = gridToScreen(b.xPos, b.yPos, originX, originY, tileW, tileH);

      ctx.save();
      // Drop Shadow for Buildings
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 6;

      const blockHeight = 24;
      const isoW = bw * tileW;
      const isoH = bh * tileH;

      drawSpriteOrFallback(
        ctx,
        `/assets/buildings/${(b.buildingType || '').toLowerCase()}.png`,
        sx, sy, isoW, isoH * 2,
        () => {
          drawIsoBlock(
            ctx,
            sx, sy,
            isoW / 2, isoH / 2,
            blockHeight,
            color,
            adjustColorBrightness(color, -30),
            adjustColorBrightness(color, -15),
            'rgba(255,255,255,0.4)'
          );
        }
      );
      ctx.restore();

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(`${b.buildingType} (L${b.level || 1})`, sx, sy - blockHeight - 4);
    }
  });

  // 4. Render Placement Preview Outline if Tool Active
  if (state.hoverTile && state.selectedTool) {
    const { xPos, yPos } = state.hoverTile;
    const { w, h } = getBuildingSize(state.selectedTool);
    const { x: sx, y: sy } = gridToScreen(xPos, yPos, originX, originY, tileW, tileH);

    ctx.save();
    drawIsoDiamond(ctx, sx, sy, w * tileW, h * tileH, 'rgba(56, 189, 248, 0.3)', '#38bdf8', 2);
    ctx.restore();
  }
}
