// Onboarding Screen Canvas & Form Renderer

import { COLORS } from './colors.js';

export function renderOnboarding(ctx, state) {
  const canvas = ctx.canvas;
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || (canvas.width / dpr);
  const height = canvas.clientHeight || (canvas.height / dpr);

  // Background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#0a0d14');
  bgGradient.addColorStop(0.5, '#111827');
  bgGradient.addColorStop(1, '#05070a');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Title Banner
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Outfit';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(251, 191, 36, 0.4)';
  ctx.shadowBlur = 10;
  ctx.fillText('SHADOW PALETTE: SETUP YOUR OPERATIVE', width / 2, 50);

  ctx.fillStyle = '#8c9ba5';
  ctx.font = '12px Inter';
  ctx.fillText('Select your cosmetic operative character and permanent camouflage strategy color', width / 2, 72);
  ctx.restore();

  // Character Cards (3 Options)
  const charOptions = [
    { id: 1, name: 'SHADOW NINJA', desc: 'Silent & agile operative', icon: '🥷' },
    { id: 2, name: 'FOREST SCOUT', desc: 'Tactical camouflage expert', icon: '🏹' },
    { id: 3, name: 'PHANTOM GHOST', desc: 'Stealth & infiltration spec', icon: '👻' },
  ];

  const cardW = 160;
  const cardH = 180;
  const startX = (width - (cardW * 3 + 40)) / 2;
  const cardY = 110;

  charOptions.forEach((opt, idx) => {
    const cx = startX + idx * (cardW + 20);
    const isSelected = state.onboarding?.characterModel === opt.id;

    ctx.save();
    // Card Background
    ctx.fillStyle = isSelected ? '#1e293b' : '#111827';
    ctx.strokeStyle = isSelected ? '#38bdf8' : '#273145';
    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.shadowColor = isSelected ? 'rgba(56, 189, 248, 0.3)' : 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = isSelected ? 12 : 6;

    ctx.beginPath();
    ctx.roundRect(cx, cardY, cardW, cardH, 12);
    ctx.fill();
    ctx.stroke();

    // Icon / Avatar Preview
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(opt.icon, cx + cardW / 2, cardY + 70);

    // Title & Description
    ctx.fillStyle = isSelected ? '#38bdf8' : '#ffffff';
    ctx.font = 'bold 12px Outfit';
    ctx.fillText(opt.name, cx + cardW / 2, cardY + 120);

    ctx.fillStyle = '#8c9ba5';
    ctx.font = '10px Inter';
    ctx.fillText(opt.desc, cx + cardW / 2, cardY + 140);

    // Selected Checkmark
    if (isSelected) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px Outfit';
      ctx.fillText('✓ SELECTED', cx + cardW / 2, cardY + 165);
    }
    ctx.restore();
  });

  // Camo Strategy Section
  const camoY = 320;
  ctx.save();
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 14px Outfit';
  ctx.textAlign = 'center';
  ctx.fillText('PERMANENT CAMO STRATEGY COLOR', width / 2, camoY);

  ctx.fillStyle = '#8c9ba5';
  ctx.font = '11px Inter';
  ctx.fillText('This determines your strategy pattern luminance band matching in stealth raids', width / 2, camoY + 20);
  ctx.restore();

  // Color Swatches
  const colorList = [
    { key: 'WHITE', hex: COLORS.WHITE, label: 'Luminance Band 5 (Lightest)' },
    { key: 'YELLOW', hex: COLORS.YELLOW, label: 'Luminance Band 4' },
    { key: 'GREEN', hex: COLORS.GREEN, label: 'Luminance Band 3 (Medium)' },
    { key: 'RED', hex: COLORS.RED, label: 'Luminance Band 2' },
    { key: 'BLUE', hex: COLORS.BLUE, label: 'Luminance Band 1 (Darkest)' },
  ];

  const swatchSize = 40;
  const swatchStartX = (width - (colorList.length * (swatchSize + 16) - 16)) / 2;
  const swatchY = camoY + 45;

  colorList.forEach((c, idx) => {
    const sx = swatchStartX + idx * (swatchSize + 16);
    const isSelected = state.camoColor === c.key;

    ctx.save();
    ctx.fillStyle = c.hex;
    ctx.beginPath();
    ctx.arc(sx + swatchSize / 2, swatchY + swatchSize / 2, swatchSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isSelected ? '#ffffff' : '#273145';
    ctx.lineWidth = isSelected ? 4 : 2;
    ctx.stroke();

    if (isSelected) {
      ctx.shadowColor = c.hex;
      ctx.shadowBlur = 10;
      ctx.stroke();
    }
    ctx.restore();
  });

  // Start Game Button
  const btnW = 200;
  const btnH = 44;
  const btnX = (width - btnW) / 2;
  const btnY = 460;

  ctx.save();
  ctx.fillStyle = '#10b981';
  ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 8);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 14px Outfit';
  ctx.textAlign = 'center';
  ctx.fillText('ENTER WORLD MAP ➔', width / 2, btnY + 26);
  ctx.restore();
}
