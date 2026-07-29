// Base Builder 20x20 Canvas Renderer

const GRID_SIZE = 20;

export function renderBaseBuilder(ctx, state) {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;
  const tileSize = width / GRID_SIZE;

  ctx.clearRect(0, 0, width, height);

  // 1. Draw Grid Tiles
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tileKey = `${c},${r}`;
      const customColor = state.paintedTiles ? state.paintedTiles[tileKey] : null;

      if (customColor) {
        ctx.fillStyle = customColor;
      } else {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#111622' : '#0d111a';
      }
      ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
    }
  }

  // 2. Draw Grid Lines
  ctx.strokeStyle = '#1e283b';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * tileSize, 0);
    ctx.lineTo(i * tileSize, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * tileSize);
    ctx.lineTo(width, i * tileSize);
    ctx.stroke();
  }

  // 3. Draw Entry Gate (Top Center - 2x1 footprint at x:9, y:0)
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(9 * tileSize + 2, 0, 2 * tileSize - 4, tileSize / 2);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 10px Outfit';
  ctx.textAlign = 'center';
  ctx.fillText('GATE', 10 * tileSize, 11);

  // 4. Draw Placed Buildings
  if (state.buildings) {
    state.buildings.forEach((b) => {
      const x = b.xPos * tileSize + 2;
      const y = b.yPos * tileSize + 2;
      const w = b.footprintWidth * tileSize - 4;
      const h = b.footprintHeight * tileSize - 4;

      // Building Fill
      ctx.fillStyle = b.hexColor || '#2A9D8F';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 6);
      ctx.fill();

      // Border & Label
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Outfit';
      ctx.textAlign = 'center';
      const label = formatBuildingName(b.buildingType);
      ctx.fillText(label, x + w / 2, y + h / 2 - 2);

      ctx.font = '10px Inter';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(`Lvl ${b.level || 1}`, x + w / 2, y + h / 2 + 12);
    });
  }

  // 5. Draw Placed Defenses
  if (state.defenses) {
    state.defenses.forEach((d) => {
      if (d.type === 'LIGHTHOUSE') {
        const cx = 10 * tileSize;
        const cy = 2 * tileSize;

        // Draw Lighthouse Spotlight Cone Beam
        const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy + 120, 140);
        gradient.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
        gradient.addColorStop(1, 'rgba(251, 191, 36, 0.0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, 140, Math.PI * 0.3, Math.PI * 0.7);
        ctx.closePath();
        ctx.fill();

        // Tower Icon
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = '12px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('💡', cx, cy + 4);

      } else if (d.type === 'PATROL_ROBOT') {
        const rx = 5 * tileSize + tileSize / 2;
        const ry = 15 * tileSize + tileSize / 2;

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(rx, ry, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = '12px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('🤖', rx, ry + 4);
      }
    });
  }

  // 6. Draw Mouse Hover Preview (Building / Placement Outline)
  if (state.hoverTile && state.selectedTool === 'BUILDING') {
    const { xPos, yPos } = state.hoverTile;
    const { w, h } = getBuildingSize(state.selectedBuildingType);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;

    const px = xPos * tileSize;
    const py = yPos * tileSize;
    const pw = w * tileSize;
    const ph = h * tileSize;

    ctx.fillRect(px, py, pw, ph);
    ctx.strokeRect(px, py, pw, ph);
  }
}

function formatBuildingName(type) {
  if (!type) return 'BUILDING';
  switch (type.toUpperCase()) {
    case 'CRAFT_HOUSE': return 'CRAFT';
    case 'INK_HOUSE': return 'INK';
    case 'SLEEP_HOUSE': return 'SLEEP';
    case 'COIN_GENERATOR': return 'COIN GEN';
    default: return type;
  }
}

export function getBuildingSize(type) {
  if (!type) return { w: 3, h: 3 };
  switch (type.toUpperCase()) {
    case 'CRAFT_HOUSE': return { w: 4, h: 4 };
    case 'COIN_GENERATOR': return { w: 4, h: 3 };
    case 'INK_HOUSE':
    case 'SLEEP_HOUSE':
    default: return { w: 3, h: 3 };
  }
}
