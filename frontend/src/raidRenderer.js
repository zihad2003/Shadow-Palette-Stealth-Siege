// Grayscale Canvas Raid Mode Renderer

const GRID_SIZE = 20;

export function renderGrayscaleRaid(ctx, raidState) {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;
  const tileSize = width / GRID_SIZE;

  ctx.clearRect(0, 0, width, height);

  // 1. Draw Desaturated Grayscale Base Ground
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#181c24' : '#12151b';
      ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
    }
  }

  // 2. Draw Grid Lines
  ctx.strokeStyle = '#273145';
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

  // 3. Draw Gate Wall Block (Top Center - x: 9, y: 0)
  const isGateBroken = raidState.gateWallHits >= 4;
  const hits = Math.min(4, raidState.gateWallHits || 0);

  if (!isGateBroken) {
    ctx.fillStyle = raidState.isGateLocked ? '#dc2626' : '#475569';
    ctx.fillRect(9 * tileSize + 2, 2, 2 * tileSize - 4, tileSize - 4);

    // Wall Break Progress Bar
    const barWidth = (2 * tileSize - 8) * (hits / 4.0);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(9 * tileSize + 4, tileSize - 6, barWidth, 4);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(`GATE (${hits}/4 Hits)`, 10 * tileSize, 14);

    if (raidState.isActionCharging) {
      ctx.fillStyle = '#67e8f9';
      ctx.fillText('CHARGING... 🔨', 10 * tileSize, 26);
    }
  } else {
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(9 * tileSize + 2, 2, 2 * tileSize - 4, tileSize - 4);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('BROKEN EXIT', 10 * tileSize, 16);
  }

  // 4. Draw Defender Buildings (in Grayscale)
  if (raidState.buildings) {
    raidState.buildings.forEach((b) => {
      const x = b.xPos * tileSize + 2;
      const y = b.yPos * tileSize + 2;
      const w = (b.footprintWidth || 3) * tileSize - 4;
      const h = (b.footprintHeight || 3) * tileSize - 4;

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 6);
      ctx.fill();

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(b.buildingType || 'BUILDING', x + w / 2, y + h / 2 + 4);
    });
  }

  // 5. Draw Lighthouse Spotlight Sweep (+1 tile cone range on alarm)
  if (raidState.lighthouse) {
    const lx = (raidState.lighthouse.xPos || 10) * tileSize;
    const ly = (raidState.lighthouse.yPos || 2) * tileSize;
    const beamAngle = raidState.beamAngleDeg || 90;

    const rad = (beamAngle * Math.PI) / 180;
    // Base 7 tiles (140px), on alarm 8 tiles (160px) (+1 tile range per GDD 9)
    const range = raidState.isAlarmTriggered ? 160 : 140;

    const gradient = ctx.createRadialGradient(lx, ly, 10, lx, ly + range, range + 20);
    gradient.addColorStop(0, raidState.isAlarmTriggered ? 'rgba(239, 68, 68, 0.6)' : 'rgba(251, 191, 36, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.arc(lx, ly, range, rad - Math.PI * 0.15, rad + Math.PI * 0.15);
    ctx.closePath();
    ctx.fill();

    // Tower
    ctx.fillStyle = raidState.isAlarmTriggered ? '#ef4444' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(lx, ly, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. Draw Player Character Marker (1.25x speed, colored camo)
  if (raidState.playerPos) {
    const px = raidState.playerPos.x * tileSize + tileSize / 2;
    const py = raidState.playerPos.y * tileSize + tileSize / 2;

    ctx.fillStyle = raidState.camoHex || '#38bdf8';
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('YOU (1.25x Speed)', px, py - 14);
  }
}
