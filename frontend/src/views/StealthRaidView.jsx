import React, { useRef, useEffect, useState } from 'react';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import SideRaidPanel from '../components/hud/SideRaidPanel.jsx';
import { useGameState } from '../state/GameStateContext.jsx';
import { soundEngine } from '../soundEngine.js';
import { setupHiDPICanvas } from '../isoUtils.js';
import { renderGrayscaleRaid } from '../raidRenderer.js';
import { checkLighthouseDetection, getLuminanceBand } from '../stealthEngine.js';

export default function StealthRaidView() {
  const canvasRef = useRef(null);
  const { raidTargetId, camoColor, showToast } = useGameState();

  const [wallHits, setWallHits] = useState(0);
  const [isAlarmTriggered, setIsAlarmTriggered] = useState(false);
  const raidStateRef = useRef({
    defenderId: raidTargetId,
    buildings: [],
    walls: [],
    lighthouse: { xPos: 10, yPos: 2, coneAngle: 60, coneRange: 7 },
    patrolRobot: { x: 5, y: 15, state: 'PATROL', baseSpeed: 1.0 },
    chipsAvailable: 200,
    playerPos: { x: 10, y: 19 },
    gateWallHits: 0,
    isAlarmTriggered: false,
    isGateLocked: false,
    tickCount: 0,
    beamAngleDeg: 90,
  });

  // Handle Dynamic Window Resize and Continuous 60FPS Grayscale Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const handleResize = () => {
      setupHiDPICanvas(canvas, ctx);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    let animationId;
    const loop = () => {
      renderGrayscaleRaid(ctx, raidStateRef.current, 1.0);
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Keyboard Movement Listener (1.25x Player Speed)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const rs = raidStateRef.current;
      let { x, y } = rs.playerPos;
      let moved = false;
      const step = 1.25;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { y = Math.max(0, y - step); moved = true; }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { y = Math.min(19, y + step); moved = true; }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { x = Math.max(0, x - step); moved = true; }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { x = Math.min(19, x + step); moved = true; }
      if (e.key === ' ' && !e.repeat) { handleHitWall(); }

      if (moved) {
        rs.playerPos = { x, y };
        rs.tickCount += 1;

        const sweepMult = rs.isAlarmTriggered ? 1.25 : 1.0;
        rs.beamAngleDeg = (rs.tickCount * 1.5 * sweepMult) % 360;

        const lh = {
          x: rs.lighthouse.xPos || 10,
          y: rs.lighthouse.yPos || 2,
          beamAngleDeg: rs.beamAngleDeg,
          coneAngleDeg: 60,
          coneRangeTiles: rs.isAlarmTriggered ? 8.0 : 7.0,
        };

        const playerObj = {
          x,
          y,
          camoBand: getLuminanceBand(camoColor),
        };

        const result = checkLighthouseDetection(lh, playerObj, 3);
        if (result.isDetected && !rs.isAlarmTriggered) {
          soundEngine.playAlarmSound();
          rs.isAlarmTriggered = true;
          rs.isGateLocked = true;
          setIsAlarmTriggered(true);
          showToast(`🚨 ALARM DETECTED! Reason: ${result.reason} (+25% Sweep Speed)`, 'error');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [camoColor]);

  // Wall Hit Action
  const handleHitWall = () => {
    const rs = raidStateRef.current;
    if (rs.gateWallHits >= 4) return;

    soundEngine.playHitSound();
    rs.gateWallHits = Math.min(4, rs.gateWallHits + 1);
    setWallHits(rs.gateWallHits);

    if (rs.gateWallHits >= 4) {
      soundEngine.playSuccessSound();
      showToast('💥 Gate WALL BROKEN (4/4 Hits)! Extraction window unlocked!', 'success');
    } else {
      showToast(`🔨 Wall Hit Landed! Progress: ${rs.gateWallHits}/4 Hits`, 'info');
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 flex flex-col">
      {/* Floating Top Header HUD */}
      <header className="absolute top-4 left-5 right-5 z-50 flex items-center justify-between pointer-events-none">
        <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-2.5 pointer-events-auto shadow-glass">
          <span className="text-xl p-1 rounded-xl bg-rose-500/20 border border-rose-400/30">⚔️</span>
          <div>
            <h1 className="font-heading font-extrabold text-sm md:text-base leading-tight bg-gradient-to-r from-white via-rose-300 to-amber-300 bg-clip-text text-transparent">
              STEALTH RAID
            </h1>
            <p className="text-[10px] font-heading font-bold text-rose-400 uppercase tracking-widest">
              Target Operative #{raidTargetId}
            </p>
          </div>
        </div>
        <NavigationTabs />
        <TopResourceBar />
      </header>

      {/* Subtitle Badge */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <span className="glass-panel px-4 py-1.5 rounded-full text-xs font-bold text-rose-400 border border-rose-400/30 tracking-wide shadow-[0_0_15px_rgba(244,63,94,0.3)]">
          Grayscale Infiltration View — Move with (W/A/S/D) &amp; Break Wall
        </span>
      </div>

      {/* Fullscreen Grayscale Raid Simulation Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Side Raid Controls */}
      <SideRaidPanel
        onHitWall={handleHitWall}
        wallHits={wallHits}
        isEscaped={wallHits >= 4}
      />
    </div>
  );
}
