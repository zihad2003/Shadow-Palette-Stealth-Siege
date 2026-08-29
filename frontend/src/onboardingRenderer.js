// Onboarding Screen Canvas & Form Renderer — GLASSMORPHISM Edition
// Step 8: Canvas-based frosted glass panels, animated particles, glass buttons

import { COLORS } from './colors.js';

// ─── Ambient Floating Particles System ──────────────────────────────
const particles = Array.from({ length: 35 }, () => ({
  x: Math.random() * 2000,
  y: Math.random() * 800,
  size: 1 + Math.random() * 2.5,
  speedX: -0.2 + Math.random() * 0.4,
  speedY: -0.15 - Math.random() * 0.3,
  alpha: 0.15 + Math.random() * 0.35,
  hue: Math.random() > 0.5 ? 200 : 45,  // Cyan or Gold particles
}));

function updateAndDrawParticles(ctx, width, height) {
  particles.forEach(p => {
    p.x += p.speedX;
    p.y += p.speedY;

    // Wrap around
    if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
    if (p.x < -10 || p.x > width + 10) { p.x = Math.random() * width; }

    ctx.save();
    ctx.globalAlpha = p.alpha * (0.7 + 0.3 * Math.sin(Date.now() * 0.001 + p.x));
    ctx.fillStyle = p.hue === 200
      ? `hsla(200, 85%, 68%, ${p.alpha})`
      : `hsla(45, 92%, 55%, ${p.alpha * 0.8})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();

    // Glow halo
    ctx.globalAlpha = p.alpha * 0.3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ─── Glass Panel Renderer Utility ──────────────────────────────────
function drawGlassPanel(ctx, x, y, w, h, radius, options = {}) {
  const {
    bgAlpha = 0.25,
    borderAlpha = 0.12,
    isSelected = false,
    accentColor = null,
    highlightAlpha = 0.08,
  } = options;

  ctx.save();

  // Glass background
  ctx.fillStyle = isSelected
    ? `rgba(22, 38, 68, ${bgAlpha + 0.15})`
    : `rgba(12, 18, 32, ${bgAlpha})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  // Border
  ctx.strokeStyle = isSelected
    ? (accentColor || 'rgba(56, 189, 248, 0.5)')
    : `rgba(255, 255, 255, ${borderAlpha})`;
  ctx.lineWidth = isSelected ? 2 : 1;

  if (isSelected) {
    ctx.shadowColor = accentColor || 'rgba(56, 189, 248, 0.4)';
    ctx.shadowBlur = 16;
  }

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.stroke();

  // Top-edge highlight (frosted glass reflection)
  const highlightGrad = ctx.createLinearGradient(x, y, x + w, y);
  highlightGrad.addColorStop(0, 'transparent');
  highlightGrad.addColorStop(0.3, `rgba(255, 255, 255, ${highlightAlpha})`);
  highlightGrad.addColorStop(0.7, `rgba(255, 255, 255, ${highlightAlpha * 0.6})`);
  highlightGrad.addColorStop(1, 'transparent');

  ctx.strokeStyle = highlightGrad;
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.stroke();

  // Inner ambient glow (very subtle)
  if (isSelected) {
    const innerGlow = ctx.createRadialGradient(
      x + w / 2, y + h / 2, 0,
      x + w / 2, y + h / 2, Math.max(w, h) * 0.6
    );
    innerGlow.addColorStop(0, 'rgba(56, 189, 248, 0.06)');
    innerGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
  }

  ctx.restore();
}

// ─── Glass Button Renderer ──────────────────────────────────────────
function drawGlassButton(ctx, x, y, w, h, text, options = {}) {
  const {
    bgColor = 'rgba(16, 185, 129, 0.6)',
    glowColor = 'rgba(16, 185, 129, 0.35)',
    textColor = '#ffffff',
    radius = 14,
  } = options;

  ctx.save();

  // Button body
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 20;

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  // Glass border
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Top highlight
  const topHighlight = ctx.createLinearGradient(x, y, x + w, y);
  topHighlight.addColorStop(0, 'transparent');
  topHighlight.addColorStop(0.3, 'rgba(255, 255, 255, 0.2)');
  topHighlight.addColorStop(0.7, 'rgba(255, 255, 255, 0.12)');
  topHighlight.addColorStop(1, 'transparent');
  ctx.strokeStyle = topHighlight;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.stroke();

  // Inner gradient overlay (top-lighter, bottom-darker)
  const innerGrad = ctx.createLinearGradient(x, y, x, y + h);
  innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  // Text
  ctx.fillStyle = textColor;
  ctx.font = 'bold 14px Outfit';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 4;
  ctx.fillText(text, x + w / 2, y + h / 2);

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════
// MAIN RENDER FUNCTION
// ═══════════════════════════════════════════════════════════════════

export function renderOnboarding(ctx, state) {
  const canvas = ctx.canvas;
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || (canvas.width / dpr);
  const height = canvas.clientHeight || (canvas.height / dpr);

  // ─── Background — Deep atmospheric gradient ───────────────────
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#050709');
  bgGradient.addColorStop(0.35, '#0a1018');
  bgGradient.addColorStop(0.65, '#0d1520');
  bgGradient.addColorStop(1, '#050709');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Radial ambient glow (center focus)
  const ambientGlow = ctx.createRadialGradient(width / 2, height * 0.45, 50, width / 2, height * 0.45, 500);
  ambientGlow.addColorStop(0, 'rgba(56, 189, 248, 0.06)');
  ambientGlow.addColorStop(0.5, 'rgba(167, 139, 250, 0.03)');
  ambientGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = ambientGlow;
  ctx.fillRect(0, 0, width, height);

  // ─── Floating Particles ───────────────────────────────────────
  updateAndDrawParticles(ctx, width, height);

  // ─── Title Banner (Glass Panel behind text) ───────────────────
  const titlePanelW = 580;
  const titlePanelH = 52;
  const titlePanelX = (width - titlePanelW) / 2;
  const titlePanelY = 22;

  drawGlassPanel(ctx, titlePanelX, titlePanelY, titlePanelW, titlePanelH, 16, {
    bgAlpha: 0.2,
    borderAlpha: 0.1,
    highlightAlpha: 0.1,
  });

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Outfit';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(251, 191, 36, 0.35)';
  ctx.shadowBlur = 14;
  ctx.fillText('SHADOW PALETTE: SETUP YOUR OPERATIVE', width / 2, 50);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#8c9ba5';
  ctx.font = '11px Inter';
  ctx.fillText('Select your cosmetic operative character and permanent camouflage strategy color', width / 2, 68);
  ctx.restore();

  // ─── Character Cards (3 Glass Panel Options) ──────────────────
  const charOptions = [
    { id: 1, name: 'SHADOW NINJA', desc: 'Silent & agile operative', icon: '🥷' },
    { id: 2, name: 'FOREST SCOUT', desc: 'Tactical camouflage expert', icon: '🏹' },
    { id: 3, name: 'PHANTOM GHOST', desc: 'Stealth & infiltration spec', icon: '👻' },
  ];

  const cardW = 170;
  const cardH = 190;
  const startX = (width - (cardW * 3 + 40)) / 2;
  const cardY = 100;

  charOptions.forEach((opt, idx) => {
    const cx = startX + idx * (cardW + 20);
    const isSelected = state.onboarding?.characterModel === opt.id;

    // Glass card panel
    drawGlassPanel(ctx, cx, cardY, cardW, cardH, 16, {
      bgAlpha: 0.22,
      borderAlpha: 0.1,
      isSelected,
      accentColor: 'rgba(56, 189, 248, 0.45)',
      highlightAlpha: isSelected ? 0.15 : 0.06,
    });

    ctx.save();

    // Icon / Avatar — with glass circle backdrop
    const iconCx = cx + cardW / 2;
    const iconCy = cardY + 65;

    ctx.fillStyle = isSelected
      ? 'rgba(56, 189, 248, 0.08)'
      : 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.arc(iconCx, iconCy, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isSelected
      ? 'rgba(56, 189, 248, 0.2)'
      : 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opt.icon, iconCx, iconCy);

    // Title
    ctx.fillStyle = isSelected ? '#38bdf8' : '#e2e8f0';
    ctx.font = 'bold 12px Outfit';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = isSelected ? 'rgba(56, 189, 248, 0.3)' : 'transparent';
    ctx.shadowBlur = isSelected ? 8 : 0;
    ctx.fillText(opt.name, cx + cardW / 2, cardY + 120);

    // Description
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#8c9ba5';
    ctx.font = '10px Inter';
    ctx.fillText(opt.desc, cx + cardW / 2, cardY + 140);

    // Selected Checkmark badge
    if (isSelected) {
      // Mini glass badge
      const badgeW = 90;
      const badgeH = 20;
      const badgeX = cx + (cardW - badgeW) / 2;
      const badgeY = cardY + 155;

      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('✓ SELECTED', cx + cardW / 2, badgeY + 13);
    }
    ctx.restore();
  });

  // ─── Camo Strategy Section ────────────────────────────────────
  const camoY = 320;

  // Glass panel behind camo section
  const camoPanelW = 500;
  const camoPanelH = 120;
  const camoPanelX = (width - camoPanelW) / 2;

  drawGlassPanel(ctx, camoPanelX, camoY - 18, camoPanelW, camoPanelH, 16, {
    bgAlpha: 0.18,
    borderAlpha: 0.08,
    highlightAlpha: 0.06,
  });

  ctx.save();
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 13px Outfit';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(251, 191, 36, 0.3)';
  ctx.shadowBlur = 10;
  ctx.fillText('PERMANENT CAMO STRATEGY COLOR', width / 2, camoY);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#8c9ba5';
  ctx.font = '10px Inter';
  ctx.fillText('This determines your strategy pattern luminance band matching in stealth raids', width / 2, camoY + 18);
  ctx.restore();

  // ─── Color Swatches — Glass Ring Selectors ────────────────────
  const colorList = [
    { key: 'WHITE', hex: COLORS.WHITE, label: 'Band 5 (Lightest)' },
    { key: 'YELLOW', hex: COLORS.YELLOW, label: 'Band 4' },
    { key: 'GREEN', hex: COLORS.GREEN, label: 'Band 3 (Medium)' },
    { key: 'RED', hex: COLORS.RED, label: 'Band 2' },
    { key: 'BLUE', hex: COLORS.BLUE, label: 'Band 1 (Darkest)' },
  ];

  const swatchSize = 40;
  const swatchStartX = (width - (colorList.length * (swatchSize + 16) - 16)) / 2;
  const swatchY = camoY + 40;

  colorList.forEach((c, idx) => {
    const sx = swatchStartX + idx * (swatchSize + 16);
    const isSelected = state.camoColor === c.key;
    const centerX = sx + swatchSize / 2;
    const centerY = swatchY + swatchSize / 2;

    ctx.save();

    // Outer glass ring (selected)
    if (isSelected) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.shadowColor = c.hex;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(centerX, centerY, swatchSize / 2 + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Main color circle
    ctx.fillStyle = c.hex;
    ctx.shadowColor = isSelected ? c.hex : 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = isSelected ? 12 : 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, swatchSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Glass border ring
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = isSelected ? 3 : 1.5;
    ctx.stroke();

    // Glass highlight (top-half lighter)
    const highlight = ctx.createLinearGradient(centerX, centerY - swatchSize / 2, centerX, centerY);
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(centerX, centerY, swatchSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Label below
    if (isSelected) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(c.key, centerX, centerY + swatchSize / 2 + 14);
    }

    ctx.restore();
  });

  // ─── Enter World Map Button — Glass Button ────────────────────
  const btnW = 220;
  const btnH = 48;
  const btnX = (width - btnW) / 2;
  const btnY = 460;

  drawGlassButton(ctx, btnX, btnY, btnW, btnH, 'ENTER WORLD MAP ➔', {
    bgColor: 'rgba(16, 185, 129, 0.5)',
    glowColor: 'rgba(16, 185, 129, 0.35)',
    textColor: '#ffffff',
    radius: 16,
  });
}
