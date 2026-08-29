import React, { useRef, useEffect } from 'react';
import TopResourceBar from '../components/hud/TopResourceBar.jsx';
import NavigationTabs from '../components/hud/NavigationTabs.jsx';
import BottomBuildDock from '../components/hud/BottomBuildDock.jsx';
import { useGameState } from '../state/GameStateContext.jsx';
import { placeBuilding, placeDefense } from '../api.js';
import { soundEngine } from '../soundEngine.js';
import { gridToScreen, screenToGrid, setupHiDPICanvas } from '../isoUtils.js';
import { renderBaseBuilder, getBaseBuilderOrigin, getBuildingSize } from '../baseBuilderRenderer.js';

export default function BaseBuilderView() {
  const canvasRef = useRef(null);
  const {
    activePlotId,
    userId,
    selectedColor,
    selectedTool,
    buildings,
    setBuildings,
    defenses,
    setDefenses,
    paintedTiles,
    setPaintedTiles,
    showToast,
    setInkEnergy,
  } = useGameState();

  // Handle Dynamic Window Resize for Canvas
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
    const render = () => {
      renderBaseBuilder(ctx, {
        zoomScale: 1.0,
        paintedTiles,
        buildings,
        defenses,
        hoverTile: canvas.__hoverTile || null,
      });
      animationId = requestAnimationFrame(render);
    };
    animationId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [buildings, defenses, paintedTiles]);

  // Canvas Click & Hover Placement Handlers
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const { originX, originY, tileW, tileH } = getBaseBuilderOrigin(w, h, 1.0);
    const { x, y } = screenToGrid(mx, my, originX, originY, tileW, tileH);

    if (x >= 0 && x < 20 && y >= 0 && y < 20) {
      canvas.__hoverTile = { xPos: x, yPos: y };
    } else {
      canvas.__hoverTile = null;
    }
  };

  const handleClick = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.__hoverTile) return;
    const { xPos, yPos } = canvas.__hoverTile;

    if (['CRAFT_HOUSE', 'INK_HOUSE', 'SLEEP_HOUSE', 'COIN_GENERATOR'].includes(selectedTool)) {
      try {
        const res = await placeBuilding(userId, activePlotId, selectedTool, 1, xPos, yPos, selectedColor);
        if (res.success) {
          soundEngine.playBuildSound();
          showToast(`Placed ${selectedTool} successfully!`, 'success');
          if (res.inkRemaining !== undefined) setInkEnergy(res.inkRemaining);

          const { w: widthFoot, h: heightFoot } = getBuildingSize(selectedTool);
          setBuildings((prev) => [
            ...prev,
            {
              id: res.buildingId || Date.now(),
              buildingType: selectedTool,
              xPos,
              yPos,
              footprintWidth: widthFoot,
              footprintHeight: heightFoot,
              hexColor: selectedColor,
              level: 1,
            },
          ]);
        }
      } catch (err) {
        if (err.data && err.data.error === 'COLOR_QUOTA_EXCEEDED') {
          showToast(`COLOR_QUOTA_EXCEEDED: Color exceeds 35% surface quota (${err.data.colorUsagePercent}%)!`, 'error');
        } else {
          showToast(`Placement Failed: ${err.message}`, 'error');
        }
      }
    } else if (['LIGHTHOUSE', 'PATROL_ROBOT'].includes(selectedTool)) {
      try {
        const res = await placeDefense(userId, activePlotId, selectedTool, 1);
        if (res.success) {
          soundEngine.playBuildSound();
          showToast(`Placed ${res.defenseType} defense!`, 'success');
          setDefenses((prev) => [...prev, { id: res.defenseId || Date.now(), type: res.defenseType }]);
        }
      } catch (err) {
        if (err.data && err.data.error === 'PATROLROBOT_NOT_UNLOCKED') {
          showToast(`PATROLROBOT_NOT_UNLOCKED: Need ${err.data.successfulRaidsNeeded} more successful raid(s)!`, 'error');
        } else if (err.data && err.data.error === 'LIGHTHOUSE_ALREADY_PLACED') {
          showToast(`LIGHTHOUSE_ALREADY_PLACED: Only 1 Lighthouse allowed per base!`, 'error');
        } else {
          showToast(`Defense Placement Failed: ${err.message}`, 'error');
        }
      }
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 flex flex-col">
      {/* Floating Top Header HUD */}
      <header className="absolute top-4 left-5 right-5 z-50 flex items-center justify-between pointer-events-none">
        <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-2.5 pointer-events-auto shadow-glass">
          <span className="text-xl p-1 rounded-xl bg-amber-400/20 border border-amber-400/30">🏗️</span>
          <div>
            <h1 className="font-heading font-extrabold text-sm md:text-base leading-tight bg-gradient-to-r from-white via-amber-300 to-sky-300 bg-clip-text text-transparent">
              BASE BUILDER
            </h1>
            <p className="text-[10px] font-heading font-bold text-sky-400 uppercase tracking-widest">
              Sector Plot #{activePlotId}
            </p>
          </div>
        </div>
        <NavigationTabs />
        <TopResourceBar />
      </header>

      {/* Subtitle Badge */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <span className="glass-panel px-4 py-1.5 rounded-full text-xs font-bold text-sky-400 border border-sky-400/30 tracking-wide shadow-neonCyan">
          Click Grid Tile to Place Selected Structure or Paint
        </span>
      </div>

      {/* Fullscreen 20x20 Isometric Base Grid Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="w-full h-full block cursor-crosshair"
      />

      {/* Bottom Build Dock */}
      <BottomBuildDock />
    </div>
  );
}
