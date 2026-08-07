import { fetchMap, claimPlot, placeBuilding, placeDefense, fetchRaidTarget, completeRaid, setupPlayer } from './api.js';
import { renderWorldMap, getWorldMapOrigin } from './worldMapRenderer.js';
import { renderBaseBuilder, getBuildingSize, getBaseBuilderOrigin } from './baseBuilderRenderer.js';
import { renderGrayscaleRaid, getRaidMapOrigin } from './raidRenderer.js';
import { renderOnboarding } from './onboardingRenderer.js';
import { checkLighthouseDetection, getLuminanceBand } from './stealthEngine.js';
import { setupHiDPICanvas, screenToGrid } from './isoUtils.js';
import { COLORS } from './colors.js';
import { soundEngine } from './soundEngine.js';
import { renderMinimap } from './minimapRenderer.js';

function createDefaultPlots() {
  const plots = [];
  let id = 1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      let ownerId = null;
      let isOccupied = false;

      if (c === 3 && r === 3) { ownerId = 12; isOccupied = true; }
      else if (c === 1 && r === 1) { ownerId = 34; isOccupied = true; }
      else if (c === 5 && r === 2) { ownerId = 5; isOccupied = true; }
      else if (c === 2 && r === 6) { ownerId = 20; isOccupied = true; }
      else if (c === 6 && r === 5) { ownerId = 42; isOccupied = true; }
      else if (c === 4 && r === 1) { ownerId = 8; isOccupied = true; }
      else if (c === 0 && r === 4) { ownerId = 99; isOccupied = true; }

      plots.push({
        id: id++,
        xCoord: c,
        yCoord: r,
        ownerId,
        isOccupied,
      });
    }
  }
  return plots;
}

// Application State
const state = {
  activeView: 'MAP', // 'ONBOARDING' | 'MAP' | 'BUILDER' | 'RAID'
  userId: 12,
  characterModel: 1,
  coins: 500,
  inkEnergy: 100,
  chips: 200,
  camoColor: 'BLUE',
  activePlotId: 1,
  onboarding: { characterModel: 1 },
  zoomScale: 1.0,

  // World Map State
  plots: createDefaultPlots(),
  hoveredPlotId: null,

  // Base Builder State
  selectedColor: COLORS.WHITE,
  selectedTool: 'CRAFT_HOUSE',
  buildings: [],
  defenses: [],
  paintedTiles: {},
  hoverTile: null,

  // Stealth Raid Simulation State
  raid: {
    defenderId: 34,
    buildings: [],
    walls: [],
    lighthouse: null,
    patrolRobot: null,
    chipsAvailable: 200,
    playerPos: { x: 10, y: 19 },
    gateWallHits: 0,
    isActionCharging: false,
    isGateLocked: false,
    isAlarmTriggered: false,
    tickCount: 0,
    beamAngleDeg: 90,
    sessionLog: [],
    wallBreakEvents: [],
  },
};

let actionChargeTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Handle Dynamic Window Resize for Full-Screen Canvas
  function handleResize() {
    setupHiDPICanvas(canvas, ctx);
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  const tabMap = document.getElementById('tab-map');
  const tabBuilder = document.getElementById('tab-builder');
  const tabRaid = document.getElementById('tab-raid');

  const viewTitle = document.getElementById('view-title');
  const viewBadge = document.getElementById('view-badge');

  const hudUserId = document.getElementById('hud-user-id');
  const hudCoins = document.getElementById('hud-coins');
  const hudInk = document.getElementById('hud-ink');
  const hudChips = document.getElementById('hud-chips');
  const hudCamo = document.getElementById('hud-camo');
  const hudPlot = document.getElementById('hud-plot');

  const inputUserId = document.getElementById('input-user-id');
  const btnSetUser = document.getElementById('btn-set-user');

  const inputDefenderId = document.getElementById('input-defender-id');
  const btnStartRaid = document.getElementById('btn-start-raid');
  const btnHitWall = document.getElementById('btn-hit-wall');
  const btnSubmitRaid = document.getElementById('btn-submit-raid');

  // Options Modal & Controls
  const btnOptions = document.getElementById('btn-options');
  const optionsModal = document.getElementById('options-modal');
  const btnCloseOptions = document.getElementById('btn-close-options');
  const optToggleSound = document.getElementById('opt-toggle-sound');
  const optVolumeSlider = document.getElementById('opt-volume-slider');
  const optBtnFullscreen = document.getElementById('opt-btn-fullscreen');
  const optToggleGrid = document.getElementById('opt-toggle-grid');
  const optBtnOnboarding = document.getElementById('opt-btn-onboarding');

  // Camera Zoom Controls
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  const zoomLevelText = document.getElementById('zoom-level-text');

  function updateZoomUI() {
    if (zoomLevelText) {
      zoomLevelText.textContent = `${Math.round(state.zoomScale * 100)}%`;
    }
  }

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      soundEngine.playClickSound();
      state.zoomScale = Math.min(2.5, state.zoomScale + 0.15);
      updateZoomUI();
    });
  }

  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      soundEngine.playClickSound();
      state.zoomScale = Math.max(0.5, state.zoomScale - 0.15);
      updateZoomUI();
    });
  }

  if (btnZoomReset) {
    btnZoomReset.addEventListener('click', () => {
      soundEngine.playClickSound();
      state.zoomScale = 1.0;
      updateZoomUI();
    });
  }

  // Mouse Wheel Zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      state.zoomScale = Math.min(2.5, state.zoomScale + 0.08);
    } else {
      state.zoomScale = Math.max(0.5, state.zoomScale - 0.08);
    }
    updateZoomUI();
  }, { passive: false });

  // Sci-Fi Tactical Loading Screen Handler
  function triggerLoadingScreen(title, subtitle, durationMs = 500, onComplete) {
    const overlay = document.getElementById('loading-overlay');
    const titleEl = document.getElementById('loading-title');
    const subEl = document.getElementById('loading-subtitle');
    const progressEl = document.getElementById('loading-bar-progress');

    if (!overlay) {
      if (onComplete) onComplete();
      return;
    }

    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = subtitle;
    if (progressEl) progressEl.style.width = '0%';

    overlay.classList.add('active');

    let start = null;
    function animate(timestamp) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      if (progressEl) progressEl.style.width = `${pct}%`;

      if (elapsed < durationMs) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          overlay.classList.remove('active');
          if (onComplete) onComplete();
        }, 120);
      }
    }
    requestAnimationFrame(animate);
  }

  // --- Initial Data Load & Render Loop ---
  loadMapData();
  startRenderLoop(ctx);

  // --- Options Modal Event Listeners ---
  if (btnOptions && optionsModal) {
    btnOptions.addEventListener('click', () => {
      soundEngine.playClickSound();
      optionsModal.classList.add('active');
    });
  }

  if (btnCloseOptions && optionsModal) {
    btnCloseOptions.addEventListener('click', () => {
      soundEngine.playClickSound();
      optionsModal.classList.remove('active');
    });
  }

  if (optionsModal) {
    optionsModal.addEventListener('click', (e) => {
      if (e.target === optionsModal) {
        soundEngine.playClickSound();
        optionsModal.classList.remove('active');
      }
    });
  }

  if (optToggleSound) {
    optToggleSound.addEventListener('click', () => {
      const isMuted = soundEngine.toggleMute();
      optToggleSound.textContent = isMuted ? 'OFF' : 'ON';
      optToggleSound.classList.toggle('active', !isMuted);
      if (!isMuted) soundEngine.playClickSound();
    });
  }

  if (optVolumeSlider) {
    optVolumeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) / 100;
      soundEngine.setVolume(val);
    });
  }

  if (optBtnFullscreen) {
    optBtnFullscreen.addEventListener('click', () => {
      soundEngine.playClickSound();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          showToast(`Fullscreen Error: ${err.message}`, 'error');
        });
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    });
  }

  if (optToggleGrid) {
    optToggleGrid.addEventListener('click', () => {
      soundEngine.playClickSound();
      state.showGrid = state.showGrid === false ? true : false;
      optToggleGrid.textContent = state.showGrid !== false ? 'SHOW' : 'HIDE';
      optToggleGrid.classList.toggle('active', state.showGrid !== false);
    });
  }

  if (optBtnOnboarding) {
    optBtnOnboarding.addEventListener('click', () => {
      soundEngine.playClickSound();
      optionsModal.classList.remove('active');
      triggerLoadingScreen('RE-INITIALIZING OPERATIVE PROFILE...', 'Loading Character Customization', 500, () => {
        state.activeView = 'ONBOARDING';
      });
    });
  }

  // --- Navigation Tabs ---
  tabMap.addEventListener('click', () => {
    soundEngine.playTabSound();
    triggerLoadingScreen('SYNCING WORLD MAP...', 'Loading 2.5D Isometric Diorama Plots', 450, () => {
      state.activeView = 'MAP';
      setActiveTab(tabMap);
      if (viewTitle) viewTitle.textContent = 'Shared World Map (2.5D Isometric)';
      if (viewBadge) viewBadge.textContent = 'Click Unclaimed Plot to Claim';
      btnHitWall.style.display = 'none';
      btnSubmitRaid.style.display = 'none';
      loadMapData();
    });
  });

  tabBuilder.addEventListener('click', () => {
    soundEngine.playTabSound();
    triggerLoadingScreen('INITIALIZING BASE BUILDER...', `Loading Grid Plot #${state.activePlotId}`, 450, () => {
      state.activeView = 'BUILDER';
      setActiveTab(tabBuilder);
      if (viewTitle) viewTitle.textContent = `Base Builder — Plot #${state.activePlotId}`;
      if (viewBadge) viewBadge.textContent = 'Click Grid Tile to Place Structure';
      btnHitWall.style.display = 'none';
      btnSubmitRaid.style.display = 'none';
    });
  });

  tabRaid.addEventListener('click', () => {
    soundEngine.playTabSound();
    triggerLoadingScreen('CALIBRATING STEALTH SENSORS...', `Targeting User #${inputDefenderId.value}`, 500, () => {
      state.activeView = 'RAID';
      setActiveTab(tabRaid);
      if (viewTitle) viewTitle.textContent = `Stealth Raid Simulation — Target User #${inputDefenderId.value}`;
      if (viewBadge) viewBadge.textContent = 'Grayscale Canvas — Move (WASD) & Hold Spacebar on Wall';
      btnHitWall.style.display = 'inline-block';
      btnSubmitRaid.style.display = 'inline-block';
    });
  });

  function setActiveTab(activeTab) {
    [tabMap, tabBuilder, tabRaid].forEach((t) => t.classList.remove('active'));
    activeTab.classList.add('active');
  }

  // --- Start Raid Button Listener ---
  btnStartRaid.addEventListener('click', async () => {
    soundEngine.playClickSound();
    const defenderId = parseInt(inputDefenderId.value, 10) || 34;
    triggerLoadingScreen('ESTABLISHING STEALTH LINK...', `Infiltrating Target User #${defenderId}`, 600, async () => {
      try {
        const data = await fetchRaidTarget(defenderId);
        if (data) {
          state.activeView = 'RAID';
          setActiveTab(tabRaid);
          if (viewTitle) viewTitle.textContent = `Stealth Raid Simulation — Target User #${defenderId}`;

          state.raid.defenderId = defenderId;
          state.raid.buildings = (data.layout && data.layout.buildings) || [];
          state.raid.walls = (data.layout && data.layout.walls) || [];
          state.raid.lighthouse = (data.layout && data.layout.lighthouse) || { xPos: 10, yPos: 2, coneAngle: 60, coneRange: 7 };
          state.raid.chipsAvailable = data.chipsAvailable || 200;

          state.raid.playerPos = { x: 10, y: 19 };
          state.raid.gateWallHits = 0;
          state.raid.isActionCharging = false;
          state.raid.isAlarmTriggered = false;
          state.raid.tickCount = 0;
          state.raid.sessionLog = [{ tick: 0, xPos: 10, yPos: 19 }];
          state.raid.wallBreakEvents = [];

          btnHitWall.style.display = 'inline-block';
          btnSubmitRaid.style.display = 'inline-block';

          showToast(`Raid Started against User #${defenderId}! Hold action to break wall (~2s per hit).`, 'success');
        }
      } catch (err) {
        if (err.data && err.data.error === 'RAID_COOLDOWN_ACTIVE') {
          showToast('RAID_COOLDOWN_ACTIVE: You are on a 5-minute capture cooldown!', 'error');
        } else {
          showToast(`Failed to load raid target: ${err.message}`, 'error');
        }
      }
    });
  });

  // --- Hold Action Wall-Break Logic (~2s per hit, non-decaying) ---
  function startWallHitAction() {
    if (state.activeView !== 'RAID') return;
    if (state.raid.gateWallHits >= 4) return;
    if (state.raid.isActionCharging) return;

    soundEngine.playHitSound();
    state.raid.isActionCharging = true;

    actionChargeTimer = setTimeout(() => {
      state.raid.gateWallHits = Math.min(4, state.raid.gateWallHits + 1);
      state.raid.isActionCharging = false;

      soundEngine.playHitSound();

      state.raid.wallBreakEvents.push({
        wallBlockId: 9,
        hits: state.raid.gateWallHits,
        gateWasLocked: state.raid.isAlarmTriggered,
      });

      if (state.raid.gateWallHits >= 4) {
        showToast('Exit Gate WALL BROKEN (4/4 Hits)! Escape window unlocked!', 'success');
      } else {
        showToast(`Wall Hit Completed! Progress: ${state.raid.gateWallHits}/4 Hits (Progress Saved)`, 'info');
      }
    }, 1800);
  }

  function stopWallHitAction() {
    if (actionChargeTimer) {
      clearTimeout(actionChargeTimer);
      actionChargeTimer = null;
    }
    if (state.raid.isActionCharging) {
      state.raid.isActionCharging = false;
      showToast('Wall Hit Action Interrupted (Progress Retained)', 'info');
    }
  }

  btnHitWall.addEventListener('mousedown', startWallHitAction);
  btnHitWall.addEventListener('mouseup', stopWallHitAction);
  btnHitWall.addEventListener('mouseleave', stopWallHitAction);

  // --- Submit Raid Button Listener ---
  btnSubmitRaid.addEventListener('click', async () => {
    if (state.activeView !== 'RAID') return;
    soundEngine.playClickSound();

    const isEscaped = state.raid.gateWallHits >= 4;
    const clientOutcome = {
      isDetected: state.raid.isAlarmTriggered,
      outcome: isEscaped ? (state.raid.isAlarmTriggered ? 'ESCAPED' : 'SILENT') : 'CAUGHT',
      chipsRequested: isEscaped ? state.raid.chipsAvailable : 0,
    };

    const payload = {
      attackerId: state.userId,
      defenderId: state.raid.defenderId,
      durationSeconds: Math.ceil(state.raid.tickCount / 20),
      wallBreakEvents: state.raid.wallBreakEvents,
      sessionLog: state.raid.sessionLog,
      clientReportedOutcome: clientOutcome,
    };

    try {
      const res = await completeRaid(payload);
      if (res.success && res.validatedOutcome) {
        soundEngine.playSuccessSound();
        showToast(`Raid Validated! Outcome: ${res.validatedOutcome.outcome} | Chips Awarded: +${res.validatedOutcome.chipsAwarded} 💎`, 'success');
        state.chips += res.validatedOutcome.chipsAwarded;
        updateHUD();
      }
    } catch (err) {
      if (err.data && err.data.error === 'OUTCOME_MISMATCH') {
        showToast(`OUTCOME_MISMATCH: Server replay calculated ${err.data.validatedOutcome.outcome}!`, 'error');
      } else {
        showToast(`Raid Submission Failed: ${err.message}`, 'error');
      }
    }
  });

  // --- Keyboard Movement Listener (1.25x Player Speed) ---
  window.addEventListener('keydown', (e) => {
    if (state.activeView !== 'RAID') return;

    let { x, y } = state.raid.playerPos;
    let moved = false;
    const step = 1.25;

    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { y = Math.max(0, y - step); moved = true; }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { y = Math.min(19, y + step); moved = true; }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { x = Math.max(0, x - step); moved = true; }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { x = Math.min(19, x + step); moved = true; }
    if (e.key === ' ' && !e.repeat) { startWallHitAction(); }

    if (moved) {
      state.raid.playerPos = { x, y };
      state.raid.tickCount += 1;
      state.raid.sessionLog.push({ tick: state.raid.tickCount, xPos: x, yPos: y });

      const sweepSpeedMult = state.raid.isAlarmTriggered ? 1.25 : 1.0;
      const coneRangeTiles = state.raid.isAlarmTriggered ? 8.0 : 7.0;

      state.raid.beamAngleDeg = (state.raid.tickCount * 1.5 * sweepSpeedMult) % 360;

      const lh = {
        x: state.raid.lighthouse.xPos || 10,
        y: state.raid.lighthouse.yPos || 2,
        beamAngleDeg: state.raid.beamAngleDeg,
        coneAngleDeg: 60,
        coneRangeTiles,
      };

      const playerObj = {
        x, y,
        camoBand: getLuminanceBand(state.camoColor),
      };

      const result = checkLighthouseDetection(lh, playerObj, 3);
      if (result.isDetected) {
        if (!state.raid.isAlarmTriggered) {
          soundEngine.playAlarmSound();
        }
        state.raid.isAlarmTriggered = true;
        state.raid.isGateLocked = true;
        showToast(`ALARM DETECTED! Reason: ${result.reason} (+25% Sweep Speed, +1 Cone Range)`, 'error');
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === ' ') { stopWallHitAction(); }
  });

  // --- Color Palette Selection Listener ---
  document.querySelectorAll('.color-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      soundEngine.playPaintSound();
      document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
      swatch.classList.add('active');
      state.selectedColor = swatch.dataset.color;
    });
  });

  // --- Tool / Building Placement Listener ---
  document.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      soundEngine.playClickSound();
      document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedTool = btn.dataset.tool;
    });
  });

  // --- User Switcher Listener ---
  btnSetUser.addEventListener('click', () => {
    soundEngine.playClickSound();
    const val = parseInt(inputUserId.value, 10);
    if (val > 0) {
      state.userId = val;
      if (hudUserId) hudUserId.textContent = state.userId;
      showToast(`Switched Active User ID to #${state.userId}`, 'info');
      loadMapData();
    }
  });

  // --- Canvas Mouse Listener (Dynamic Isometric Screen-to-Grid Math) ---
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    state._lastMx = mx;
    state._lastMy = my;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (state.activeView === 'MAP') {
      const { originX, originY, tileW, tileH } = getWorldMapOrigin(w, h, state.zoomScale);
      const { x: gx, y: gy } = screenToGrid(mx, my, originX, originY, tileW, tileH);
      if (gx >= 0 && gx < 17 && gy >= 0 && gy < 17 && gx % 2 === 1 && gy % 2 === 1) {
        const px = (gx - 1) / 2;
        const py = (gy - 1) / 2;
        const found = state.plots.find((p) => p.xCoord === px && p.yCoord === py);
        state.hoveredPlotId = found ? found.id : null;
      } else {
        state.hoveredPlotId = null;
      }
    } else if (state.activeView === 'BUILDER') {
      const { originX, originY, tileW, tileH } = getBaseBuilderOrigin(w, h, state.zoomScale);
      const { x, y } = screenToGrid(mx, my, originX, originY, tileW, tileH);
      if (x >= 0 && x < 20 && y >= 0 && y < 20) {
        state.hoverTile = { xPos: x, yPos: y };
      } else {
        state.hoverTile = null;
      }
    }
  });

  canvas.addEventListener('click', async () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (state.activeView === 'ONBOARDING') {
      const mx = (state._lastMx || w / 2);
      const my = (state._lastMy || h / 2);

      const cardW = 160;
      const cardH = 180;
      const startX = (w - (cardW * 3 + 40)) / 2;
      const cardY = 110;

      [1, 2, 3].forEach((id, idx) => {
        const cx = startX + idx * (cardW + 20);
        if (mx >= cx && mx <= cx + cardW && my >= cardY && my <= cardY + cardH) {
          soundEngine.playClickSound();
          state.characterModel = id;
          state.onboarding.characterModel = id;
          showToast(`Selected Character Model #${id}`, 'info');
        }
      });

      const colorKeys = ['WHITE', 'YELLOW', 'GREEN', 'RED', 'BLUE'];
      const swatchSize = 40;
      const swatchStartX = (w - (colorKeys.length * (swatchSize + 16) - 16)) / 2;
      const swatchY = 365;

      colorKeys.forEach((key, idx) => {
        const sx = swatchStartX + idx * (swatchSize + 16);
        const dist = Math.hypot(mx - (sx + swatchSize / 2), my - (swatchY + swatchSize / 2));
        if (dist <= swatchSize / 2) {
          soundEngine.playPaintSound();
          state.camoColor = key;
          if (hudCamo) hudCamo.textContent = state.camoColor;
          showToast(`Assigned Camouflage Strategy: ${key}`, 'info');
        }
      });

      const btnW = 200;
      const btnH = 44;
      const btnX = (w - btnW) / 2;
      const btnY = 460;

      if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
        soundEngine.playClickSound();
        try {
          await setupPlayer(state.userId, state.characterModel, state.camoColor);
          showToast('Operative Setup Saved to Backend!', 'success');
        } catch (e) {
          showToast('Player setup saved locally', 'info');
        }
        triggerLoadingScreen('ENTERING SHADOW WORLD...', 'Loading World Diorama', 500, () => {
          state.activeView = 'MAP';
          setActiveTab(tabMap);
          if (viewTitle) viewTitle.textContent = 'Shared World Map (2.5D Isometric)';
          if (viewBadge) viewBadge.textContent = 'Click Unclaimed Plot to Claim';
          loadMapData();
        });
      }

    } else if (state.activeView === 'MAP') {
      if (!state.hoveredPlotId) return;
      soundEngine.playClickSound();
      const targetPlot = state.plots.find((p) => p.id === state.hoveredPlotId);
      if (!targetPlot) return;

      if (targetPlot.ownerId === state.userId || targetPlot.isOccupied) {
        triggerLoadingScreen('ENTERING OPERATIVE BASE...', `Loading Base Plot #${targetPlot.id}`, 450, () => {
          state.activePlotId = targetPlot.id;
          state.activeView = 'BUILDER';
          setActiveTab(tabBuilder);
          if (viewTitle) viewTitle.textContent = `Base Builder — Plot #${state.activePlotId}`;
          if (hudPlot) hudPlot.textContent = `#${state.activePlotId}`;
        });
        return;
      }

      try {
        const res = await claimPlot(state.userId, targetPlot.id);
        if (res.success) {
          soundEngine.playSuccessSound();
          showToast(`Successfully Claimed Plot #${res.plot.id}!`, 'success');
          state.coins = res.coinsRemaining;
          updateHUD();
          triggerLoadingScreen('BASE PLOT CLAIMED...', `Constructing Base Plot #${res.plot.id}`, 450, () => {
            state.activePlotId = res.plot.id;
            state.activeView = 'BUILDER';
            setActiveTab(tabBuilder);
            if (viewTitle) viewTitle.textContent = `Base Builder — Plot #${state.activePlotId}`;
            if (hudPlot) hudPlot.textContent = `#${state.activePlotId}`;
            loadMapData();
          });
        }
      } catch (err) {
        showToast(`Plot Claim Failed: ${err.message}`, 'error');
      }

    } else if (state.activeView === 'BUILDER') {
      if (!state.hoverTile) return;
      const { xPos, yPos } = state.hoverTile;

      if (['CRAFT_HOUSE', 'INK_HOUSE', 'SLEEP_HOUSE', 'COIN_GENERATOR'].includes(state.selectedTool)) {
        try {
          const res = await placeBuilding(
            state.userId,
            state.activePlotId,
            state.selectedTool,
            1,
            xPos,
            yPos,
            state.selectedColor
          );
          if (res.success) {
            soundEngine.playBuildSound();
            showToast(`Placed ${state.selectedTool} successfully!`, 'success');
            if (res.inkRemaining !== undefined) state.inkEnergy = res.inkRemaining;
            updateHUD();

            const { w: widthFoot, h: heightFoot } = getBuildingSize(state.selectedTool);
            state.buildings.push({
              id: res.buildingId,
              buildingType: state.selectedTool,
              xPos, yPos,
              footprintWidth: widthFoot, footprintHeight: heightFoot,
              hexColor: state.selectedColor,
              level: 1,
            });
          }
        } catch (err) {
          if (err.data && err.data.error === 'COLOR_QUOTA_EXCEEDED') {
            showToast(`COLOR_QUOTA_EXCEEDED: Color exceeds 35% surface cap (${err.data.colorUsagePercent}%)!`, 'error');
          } else {
            showToast(`Placement Failed: ${err.message}`, 'error');
          }
        }

      } else if (['LIGHTHOUSE', 'PATROL_ROBOT'].includes(state.selectedTool)) {
        try {
          const res = await placeDefense(
            state.userId,
            state.activePlotId,
            state.selectedTool,
            1
          );
          if (res.success) {
            soundEngine.playBuildSound();
            showToast(`Placed ${res.defenseType} successfully!`, 'success');
            state.defenses.push({ id: res.defenseId, type: res.defenseType });
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
    }
  });

  async function loadMapData() {
    try {
      const data = await fetchMap();
      if (data && data.plots) {
        state.plots = data.plots;
      }
    } catch (err) {
      showToast(`Failed to load world map: ${err.message}`, 'error');
    }
  }

  function updateHUD() {
    if (hudUserId) hudUserId.textContent = state.userId;
    if (hudCoins) hudCoins.textContent = state.coins;
    if (hudInk) hudInk.textContent = state.inkEnergy;
    if (hudChips) hudChips.textContent = state.chips;
    if (hudCamo) hudCamo.textContent = state.camoColor;
    if (hudPlot) hudPlot.textContent = `#${state.activePlotId}`;
  }
});

// Continuous Animation Render Loop (60FPS)
function startRenderLoop(ctx) {
  function loop() {
    if (state.activeView === 'ONBOARDING') {
      renderOnboarding(ctx, state);
    } else if (state.activeView === 'MAP') {
      renderWorldMap(ctx, state.plots, state.userId, state.hoveredPlotId, state.zoomScale);
    } else if (state.activeView === 'BUILDER') {
      renderBaseBuilder(ctx, state);
    } else if (state.activeView === 'RAID') {
      renderGrayscaleRaid(ctx, state.raid, state.zoomScale);
    }

    // Render RTS Minimap Radar Overlay
    const minimapCanvas = document.getElementById('minimapCanvas');
    if (minimapCanvas) {
      const mctx = minimapCanvas.getContext('2d');
      renderMinimap(mctx, state.plots || [], state.userId, { panX: 0, panY: 0 });
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type === 'error' ? 'error' : 'success'}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
