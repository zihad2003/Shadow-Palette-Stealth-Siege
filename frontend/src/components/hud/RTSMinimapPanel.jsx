import React, { useRef, useEffect } from 'react';
import { useGameState } from '../../state/GameStateContext.jsx';

export default function RTSMinimapPanel() {
  const { plots, userId } = useGameState();
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Dark Radar Background
    ctx.fillStyle = '#060b13';
    ctx.fillRect(0, 0, w, h);

    // Radar Concentric Grid Rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 20, 0, Math.PI * 2);
    ctx.arc(w / 2, h / 2, 45, 0, Math.PI * 2);
    ctx.arc(w / 2, h / 2, 70, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(w / 2, 5); ctx.lineTo(w / 2, h - 5);
    ctx.moveTo(5, h / 2); ctx.lineTo(w - 5, h / 2);
    ctx.stroke();

    // Render Plot blips
    plots.forEach((p) => {
      // Map 1024x819 space to 160x130 canvas space
      const bx = (p.centerX / 1024) * w;
      const by = (p.centerY / 819) * h;

      if (p.ownerId === userId) {
        ctx.fillStyle = '#60a5fa'; // Blue Self Base
      } else if (p.status === 'CLAIMED_ENEMY') {
        ctx.fillStyle = '#f87171'; // Red Enemy Base
      } else {
        ctx.fillStyle = '#34d399'; // Green Unclaimed
      }

      ctx.beginPath();
      ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [plots, userId]);

  return (
    <div className="absolute bottom-5 right-5 z-40 glass-panel-deep p-2 rounded-2xl flex flex-col items-center gap-1 shadow-glassDeep pointer-events-auto border border-amber-400/20">
      <span className="text-[10px] font-heading font-extrabold text-amber-400 tracking-wider">
        GLOBAL RADAR
      </span>
      <canvas
        ref={canvasRef}
        width={150}
        height={110}
        className="rounded-xl border border-white/5 bg-slate-950"
      />
    </div>
  );
}
