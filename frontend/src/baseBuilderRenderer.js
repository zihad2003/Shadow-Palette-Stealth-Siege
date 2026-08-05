// 2.5D Isometric Base Builder Canvas Renderer — Sprite-Based

import { gridToScreen, drawIsoDiamond, drawIsoBlock, adjustColorBrightness } from './isoUtils.js';
import { drawSpriteOrFallback } from './assetLoader.js';

const GRID_SIZE = 20;

// ─── Building Type → Sprite Path Mapping ─────────────────────────────
function getBuildingSpritePath(buildingType, level) {
  const lvl = Math.min(3, Math.max(1, level || 1));
  const typeMap = {
    'CRAFT_HOUSE': 'craft_house',
    'INK_HOUSE': 'ink_house',
    'SLEEP_HOUSE': 'sleep_house',
    'COIN_GENERATOR': 'coin_generator',
  };
  const key = typeMap[buildingType] || 'craft_house';
  return `/assets/buildings/${key}_lv${lvl}.png`;
}

// ─── Building Footprint Sizes ─────────────────────────────────────────
export function getBuildingSize(buildingType) {
  switch (buildingType) {
    case 'CRAFT_HOUSE': return { w: 4, h: 4 };
    case 'INK_HOUSE': return { w: 3, h: 3 };
    case 'SLEEP_HOUSE': return { w: 3, h: 3 };
    case 'COIN_GENERATOR': return { w: 4, h: 3 };
    default: return { w: 2, h: 2 };
  }
}

// ─── Building Type → Fallback Color ──────────────────────────────────
function getBuildingFallbackColor(buildingType) {
  switch (buildingType) {
    case 'CRAFT_HOUSE':    return '#d97706'; // Amber
    case 'INK_HOUSE':      return '#4f46e5'; // Indigo
    case 'SLEEP_HOUSE':    return '#0891b2'; // Cyan
    case 'COIN_GENERATOR': return '#ca8a04'; // Gold
    default:               return '#6b7280'; // Gray
  }
}

// ─── Color → Floor Tile Mapping ──────────────────────────────────────
const COLOR_TO_FLOOR = {
  '#F1FAEE': '/assets/tiles/floor_white.png',
  '#F4C245': '/assets/tiles/floor_yellow.png',
  '#2A9D8F': '/assets/tiles/floor_green.png',
  '#E63946': '/assets/tiles/floor_red.png',
  '#264653': '/assets/tiles/floor_blue.png',
};

// ─── Main Render Function ────────────────────────────────────────────

export function renderBaseBuilder(ctx, state) {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  // Isometric Grid Config
  const tileW = 28;
  const tileH = 14;
  const originX = width / 2;
  const originY = 50;

  // 1. Clear & Draw Rich Terrain Atmospheric Background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#0d1d18');
  bgGradient.addColorStop(0.5, '#132822');
  bgGradient.addColorStop(1, '#091410');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Soft Ambient Diorama Glow under Base Grid
  const baseCenter = gridToScreen(10, 10, originX, originY, tileW, tileH);
  const islandGlow = ctx.createRadialGradient(baseCenter.x, baseCenter.y + 40, 50, baseCenter.x, baseCenter.y + 40, 300);
  islandGlow.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
  islandGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = islandGlow;
  ctx.fillRect(0, 0, width, height);

  // 2. Render 20x20 Ground Grid Tiles in Isometric Projection
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tileKey = `${c},${r}`;
      const customColor = state.paintedTiles ? state.paintedTiles[tileKey] : null;
      const { x: sx, y: sy } = gridToScreen(c, r, originX, originY, tileW, tileH);

      const isHovered = state.hoverTile && state.hoverTile.xPos === c && state.hoverTile.yPos === r;

      // Draw custom floor tile color if painted, or default lush grass tile
      const floorSprite = customColor ? COLOR_TO_FLOOR[customColor] : null;

      if (floorSprite) {
        drawSpriteOrFallback(
          ctx,
          floorSprite,
          sx, sy, tileW + 2, tileH * 2 + 2,
          () => {
            drawIsoDiamond(ctx, sx, sy, tileW, tileH, customColor, '#334155', 1);
          }
        );
      } else {
        // Render base grass plot sprite across all tiles for rich CoC-style diorama terrain
        drawSpriteOrFallback(
          ctx,
          '/assets/tiles/grass_plot.png',
          sx, sy, tileW + 2, tileH * 2 + 2,
          () => {
            let tileFill = (r + c) % 2 === 0 ? '#1b4332' : '#143628';
            drawIsoDiamond(ctx, sx, sy, tileW, tileH, tileFill, '#2d6a4f', 1);
          }
        );
      }

      // Hover overlay on any tile
      if (isHovered) {
        drawIsoDiamond(ctx, sx, sy, tileW, tileH, 'rgba(56, 189, 248, 0.3)', '#38bdf8', 2);
      }
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
      const level = b.level || 1;

      const { x: sx, y: sy } = gridToScreen(b.xPos, b.yPos, originX, originY, tileW, tileH);

      ctx.save();
      // Drop Shadow for Buildings
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 6;

      const blockHeight = 24;
      const isoW = bw * tileW;
      const isoH = bh * tileH;
      const spriteW = isoW + 8;
      const spriteH = isoH * 2 + 16;

      // Use building type + level sprite
      const spritePath = getBuildingSpritePath(b.buildingType, level);
      const fallbackColor = getBuildingFallbackColor(b.buildingType);

      drawSpriteOrFallback(
        ctx,
        spritePath,
        sx, sy, spriteW, spriteH,
        () => {
          drawIsoBlock(
            ctx,
            sx, sy,
            isoW / 2, isoH / 2,
            blockHeight,
            fallbackColor,
            adjustColorBrightness(fallbackColor, -30),
            adjustColorBrightness(fallbackColor, -15),
            'rgba(255,255,255,0.4)'
          );
        }
      );
      ctx.restore();

      // Building Label with Level Badge
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Outfit';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;

      const labelY = sy - blockHeight - 4;
      const typeLabel = (b.buildingType || 'BUILDING').replace('_', ' ');
      ctx.fillText(`${typeLabel}`, sx, labelY);

      // Level badge
      const badgeColors = ['#10b981', '#3b82f6', '#f59e0b'];
      const badgeColor = badgeColors[Math.min(level - 1, 2)];
      const badgeY = labelY + 12;
      const badgeText = `LV ${level}`;
      const badgeWidth = ctx.measureText(badgeText).width + 10;

      ctx.fillStyle = badgeColor;
      ctx.beginPath();
      ctx.roundRect(sx - badgeWidth / 2, badgeY - 8, badgeWidth, 14, 4);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px Outfit';
      ctx.fillText(badgeText, sx, badgeY + 2);

      ctx.restore();

    } else if (item.type === 'DEFENSE') {
      const d = item.data;
      const { x: sx, y: sy } = gridToScreen(10, 10, originX, originY, tileW, tileH);

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;

      const defenseType = d.type || d.defenseType || 'LIGHTHOUSE';
      const spritePath = defenseType === 'LIGHTHOUSE'
        ? '/assets/defense/lighthouse.png'
        : '/assets/defense/patrol_robot.png';

      const fallbackColor = defenseType === 'LIGHTHOUSE' ? '#f59e0b' : '#6b7280';

      drawSpriteOrFallback(
        ctx,
        spritePath,
        sx, sy, tileW * 2 + 8, tileH * 4 + 16,
        () => {
          drawIsoBlock(
            ctx,
            sx, sy,
            tileW, tileH,
            defenseType === 'LIGHTHOUSE' ? 28 : 16,
            fallbackColor,
            adjustColorBrightness(fallbackColor, -30),
            adjustColorBrightness(fallbackColor, -15),
            'rgba(255,255,255,0.4)'
          );
        }
      );
      ctx.restore();

      // Defense Label
      ctx.save();
      ctx.fillStyle = defenseType === 'LIGHTHOUSE' ? '#fbbf24' : '#94a3b8';
      ctx.font = 'bold 10px Outfit';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(defenseType === 'LIGHTHOUSE' ? '💡 LIGHTHOUSE' : '🤖 PATROL ROBOT', sx, sy - 32);
      ctx.restore();
    }
  });

  // 4. Render Placement Preview Outline with Ghost Sprite
  if (state.hoverTile && state.selectedTool) {
    const { xPos, yPos } = state.hoverTile;
    const { w, h } = getBuildingSize(state.selectedTool);
    const { x: sx, y: sy } = gridToScreen(xPos, yPos, originX, originY, tileW, tileH);

    ctx.save();
    ctx.globalAlpha = 0.4;

    // Try to draw ghost sprite preview
    const previewSprite = getBuildingSpritePath(state.selectedTool, 1);
    const isoW = w * tileW;
    const isoH = h * tileH;

    drawSpriteOrFallback(
      ctx,
      previewSprite,
      sx, sy, isoW + 8, isoH * 2 + 16,
      () => {
        drawIsoDiamond(ctx, sx, sy, isoW, isoH, 'rgba(56, 189, 248, 0.3)', '#38bdf8', 2);
      }
    );

    ctx.globalAlpha = 1.0;
    // Always draw the outline on top
    drawIsoDiamond(ctx, sx, sy, isoW, isoH, null, '#38bdf8', 2);
    ctx.restore();
  }
}
