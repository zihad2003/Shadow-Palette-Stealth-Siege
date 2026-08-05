// 2.5D Isometric Grayscale Raid Mode Canvas Renderer — Sprite-Based

import { gridToScreen, drawIsoDiamond, drawIsoBlock, adjustColorBrightness } from './isoUtils.js';
import { drawSpriteOrFallback } from './assetLoader.js';

const GRID_SIZE = 20;

// LERP Position State for Smooth Movement Gliding (~150ms)
let currentRenderPos = { x: 10, y: 19 };
let currentRobotRenderPos = { x: 5, y: 15 };

// ─── Wall Damage State → Sprite Mapping ──────────────────────────────
function getWallSprite(hits) {
  if (hits >= 4) return '/assets/walls/wall_broken.png';
  if (hits >= 3) return '/assets/walls/wall_cracked3.png';
  if (hits >= 2) return '/assets/walls/wall_cracked2.png';
  if (hits >= 1) return '/assets/walls/wall_cracked1.png';
  return '/assets/walls/wall_intact.png';
}

// ─── Patrol Robot State → Color ──────────────────────────────────────
function getRobotStateColor(state) {
  switch (state) {
    case 'PATROL':     return '#10b981'; // Green
    case 'SUSPICIOUS': return '#f59e0b'; // Yellow
    case 'ALERT':      return '#ef4444'; // Red
    case 'CHASING':    return '#dc2626'; // Dark Red
    case 'SEARCHING':  return '#f97316'; // Orange
    default:           return '#6b7280'; // Gray
  }
}

// ─── Simple Patrol Robot AI Movement ─────────────────────────────────
let robotWaypoint = { x: 15, y: 5 };
let robotWaypointTimer = 0;

function updateRobotPosition(raidState) {
  if (!raidState.patrolRobot) return;

  const robot = raidState.patrolRobot;
  const robotState = robot.state || 'PATROL';
  const speed = robotState === 'CHASING' ? 0.12 : 0.06;

  if (robotState === 'PATROL') {
    // Random waypoint patrol
    robotWaypointTimer++;
    if (robotWaypointTimer > 120) {
      robotWaypoint = {
        x: 2 + Math.random() * 16,
        y: 2 + Math.random() * 16,
      };
      robotWaypointTimer = 0;
    }

    const dx = robotWaypoint.x - robot.x;
    const dy = robotWaypoint.y - robot.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.5) {
      robot.x += (dx / dist) * speed;
      robot.y += (dy / dist) * speed;
    }

  } else if (robotState === 'CHASING') {
    // Move toward last seen player position
    const tx = robot.lastSeenX || raidState.playerPos.x;
    const ty = robot.lastSeenY || raidState.playerPos.y;
    const dx = tx - robot.x;
    const dy = ty - robot.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.3) {
      robot.x += (dx / dist) * speed;
      robot.y += (dy / dist) * speed;
    }

  } else if (robotState === 'SEARCHING') {
    // Expanding circle search around last-seen
    const angle = (raidState.tickCount * 0.05) % (Math.PI * 2);
    const radius = 2 + Math.sin(raidState.tickCount * 0.02) * 2;
    const cx = robot.lastSeenX || 10;
    const cy = robot.lastSeenY || 10;
    robot.x += (cx + Math.cos(angle) * radius - robot.x) * 0.03;
    robot.y += (cy + Math.sin(angle) * radius - robot.y) * 0.03;
  }
}

// ─── Main Render Function ────────────────────────────────────────────

export function renderGrayscaleRaid(ctx, raidState) {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  // Isometric Grid Config
  const tileW = 28;
  const tileH = 14;
  const originX = width / 2;
  const originY = 50;

  // Initialize patrol robot if not present
  if (!raidState.patrolRobot) {
    raidState.patrolRobot = {
      x: 5, y: 15,
      state: 'PATROL',
      lastSeenX: null, lastSeenY: null,
    };
  }

  // Update patrol robot AI
  updateRobotPosition(raidState);

  // Smooth LERP Position Interpolation (~150ms)
  if (raidState.playerPos) {
    currentRenderPos.x += (raidState.playerPos.x - currentRenderPos.x) * 0.25;
    currentRenderPos.y += (raidState.playerPos.y - currentRenderPos.y) * 0.25;
  }

  const robot = raidState.patrolRobot;
  currentRobotRenderPos.x += (robot.x - currentRobotRenderPos.x) * 0.2;
  currentRobotRenderPos.y += (robot.y - currentRobotRenderPos.y) * 0.2;

  // 1. Draw Desaturated Grayscale Atmospheric Background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#0a0d14');
  bgGradient.addColorStop(1, '#111824');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // === GRAYSCALE FILTER START ===
  // Everything drawn between here and FILTER END is the defender's base in grayscale
  ctx.save();
  ctx.filter = 'grayscale(85%) brightness(0.8)';

  // 2. Render Grayscale 2.5D Isometric Ground Tiles
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const { x: sx, y: sy } = gridToScreen(c, r, originX, originY, tileW, tileH);

      drawSpriteOrFallback(
        ctx,
        '/assets/tiles/grass_plot.png',
        sx, sy, tileW + 2, tileH * 2 + 2,
        () => {
          const tileFill = (r + c) % 2 === 0 ? '#181c24' : '#12151b';
          drawIsoDiamond(ctx, sx, sy, tileW, tileH, tileFill, '#273145', 1);
        }
      );
    }
  }

  // 3. Render Gate Wall Block with Damage States
  const hits = Math.min(4, raidState.gateWallHits || 0);
  const isGateBroken = hits >= 4;
  const { x: gsx, y: gsy } = gridToScreen(9, 0, originX, originY, tileW, tileH);

  if (!isGateBroken) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;

    const wallSprite = getWallSprite(hits);
    const wallColor = raidState.isGateLocked ? '#dc2626' : '#475569';

    drawSpriteOrFallback(
      ctx,
      wallSprite,
      gsx, gsy, tileW * 2 + 4, tileH * 4 + 8,
      () => {
        drawIsoBlock(ctx, gsx, gsy, tileW * 2, tileH * 2, 20, wallColor, '#334155', '#1e293b', '#64748b');
      }
    );
    ctx.restore();

    // Wall Break Progress Bar
    const barWidth = (tileW * 2 - 8) * (hits / 4.0);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(gsx - tileW + 4, gsy - 26, barWidth, 4);
    ctx.strokeStyle = '#78350f';
    ctx.strokeRect(gsx - tileW + 4, gsy - 26, tileW * 2 - 8, 4);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Outfit';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
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
    ctx.fillText('💥 BROKEN EXIT', gsx, gsy - 12);
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

      const typeMap = {
        'CRAFT_HOUSE': 'craft_house',
        'INK_HOUSE': 'ink_house',
        'SLEEP_HOUSE': 'sleep_house',
        'COIN_GENERATOR': 'coin_generator',
      };
      const key = typeMap[b.buildingType] || 'craft_house';
      const lvl = b.level || 1;
      const spritePath = `/assets/buildings/${key}_lv${lvl}.png`;

      drawSpriteOrFallback(
        ctx,
        spritePath,
        bsx, bsy, bw * tileW + 8, bh * tileH * 2 + 16,
        () => {
          drawIsoBlock(
            ctx,
            bsx, bsy,
            (bw * tileW) / 2, (bh * tileH) / 2,
            20,
            '#334155', '#1e293b', '#0f172a', '#64748b'
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

  // 5. Render Lighthouse with Spotlight Sweep
  if (raidState.lighthouse) {
    const lx = raidState.lighthouse.xPos || 10;
    const ly = raidState.lighthouse.yPos || 2;
    const { x: lsx, y: lsy } = gridToScreen(lx, ly, originX, originY, tileW, tileH);
    const beamAngle = raidState.beamAngleDeg || 90;

    const rad = (beamAngle * Math.PI) / 180;
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

    // Lighthouse sprite
    drawSpriteOrFallback(
      ctx,
      '/assets/defense/lighthouse.png',
      lsx, lsy, tileW * 2, tileH * 4 + 8,
      () => {
        drawIsoBlock(ctx, lsx, lsy, tileW, tileH, 24,
          raidState.isAlarmTriggered ? '#ef4444' : '#f59e0b',
          '#b45309', '#78350f', '#fef08a'
        );
      }
    );
    ctx.restore();
  }

  // === GRAYSCALE FILTER END ===
  ctx.restore();

  // Everything below is drawn WITHOUT grayscale (player, robot, HUD)

  // 6. Render Patrol Robot
  const { x: rsx, y: rsy } = gridToScreen(
    currentRobotRenderPos.x, currentRobotRenderPos.y,
    originX, originY, tileW, tileH
  );

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 8;

  const robotStateColor = getRobotStateColor(robot.state);

  drawSpriteOrFallback(
    ctx,
    '/assets/defense/patrol_robot.png',
    rsx, rsy, tileW + 4, tileH * 3,
    () => {
      // Fallback: colored circle with state indicator
      ctx.fillStyle = robotStateColor;
      ctx.beginPath();
      ctx.arc(rsx, rsy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Robot "eye" indicator
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(rsx, rsy - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  );
  ctx.restore();

  // Robot state label
  ctx.save();
  ctx.fillStyle = robotStateColor;
  ctx.font = 'bold 9px Outfit';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 4;
  const stateEmoji = {
    'PATROL': '🔄', 'SUSPICIOUS': '❓', 'ALERT': '⚠️',
    'CHASING': '🏃', 'SEARCHING': '🔍'
  };
  ctx.fillText(`${stateEmoji[robot.state] || '🤖'} ${robot.state}`, rsx, rsy - 18);
  ctx.restore();

  // 7. Render Player Character with LERP Movement
  const { x: psx, y: psy } = gridToScreen(
    currentRenderPos.x, currentRenderPos.y,
    originX, originY, tileW, tileH
  );

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  drawSpriteOrFallback(
    ctx,
    '/assets/characters/player_model1.png',
    psx, psy, tileW + 4, tileH * 3,
    () => {
      // Fallback: player circle with camo glow
      const camoColor = raidState.camoHex || '#38bdf8';
      ctx.fillStyle = camoColor;
      ctx.beginPath();
      ctx.arc(psx, psy, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Camo glow ring
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = camoColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(psx, psy, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  );
  ctx.restore();

  // Player label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px Outfit';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 4;
  ctx.fillText('🥷 YOU (1.25x Speed)', psx, psy - 16);

  // 8. Alarm Status HUD Overlay
  if (raidState.isAlarmTriggered) {
    ctx.save();
    // Pulsing red border on alarm
    const pulse = 0.3 + 0.2 * Math.sin(Date.now() * 0.005);
    ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ ALARM TRIGGERED — Gate Locked! Break Wall to Escape!', width / 2, height - 16);
    ctx.restore();
  }
}
