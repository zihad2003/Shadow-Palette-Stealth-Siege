import React, { useRef, useEffect } from 'react';
import { useGameState } from '../../state/GameStateContext.jsx';
import ClayPanel from '../ui/ClayPanel.jsx';
import { COLORS } from '../../colors.js';

export default function RTSMinimapPanel() {
  const { plots, userId } = useGameState();
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#0A1417';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(244, 162, 97, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 20, 0, Math.PI * 2);
    ctx.arc(w / 2, h / 2, 45, 0, Math.PI * 2);
    ctx.arc(w / 2, h / 2, 70, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w / 2, 5);
    ctx.lineTo(w / 2, h - 5);
    ctx.moveTo(5, h / 2);
    ctx.lineTo(w - 5, h / 2);
    ctx.stroke();

    plots.forEach((p) => {
      const bx = (p.centerX / 1024) * w;
      const by = (p.centerY / 819) * h;

      if (p.ownerId === userId) {
        ctx.fillStyle = COLORS.BLUE;
      } else if (p.status === 'CLAIMED_ENEMY') {
        ctx.fillStyle = COLORS.RED;
      } else {
        ctx.fillStyle = COLORS.GREEN;
      }

      ctx.beginPath();
      ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [plots, userId]);

  return (
    <ClayPanel
      depth="deep"
      delay={0.1}
      className="absolute bottom-5 right-5 z-40 p-2 rounded-[22px] flex flex-col items-center gap-1 pointer-events-auto"
    >
      <span className="text-[10px] font-heading font-extrabold text-clay-accent tracking-wider">
        GLOBAL RADAR
      </span>
      <canvas
        ref={canvasRef}
        width={150}
        height={110}
        className="rounded-xl clay-inset"
      />
    </ClayPanel>
  );
}
