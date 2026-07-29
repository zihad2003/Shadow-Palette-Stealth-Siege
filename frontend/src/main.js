import { fetchMap, claimPlot, placeBuilding, placeDefense, fetchRaidTarget, completeRaid } from './api.js';
import { renderWorldMap } from './worldMapRenderer.js';
import { renderBaseBuilder, getBuildingSize } from './baseBuilderRenderer.js';
import { renderGrayscaleRaid } from './raidRenderer.js';
import { checkLighthouseDetection, getLuminanceBand } from './stealthEngine.js';
import { COLORS } from './colors.js';

// Application State
const state = {
  activeView: 'MAP', // 'MAP' | 'BUILDER' | 'RAID'
  userId: 12,
  coins: 500,
  inkEnergy: 100,
  chips: 200,
  camoColor: 'BLUE',
  activePlotId: 1,

  // World Map State
  plots: [],
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
    isGateLocked: false,
    isAlarmTriggered: false,
    tickCount: 0,
    beamAngleDeg: 90,
    sessionLog: [],
    wallBreakEvents: [],
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

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

  // --- Initial Data Load ---
  loadMapData();

  // --- Navigation Tabs ---
  tabMap.addEventListener('click', () => {
    state.activeView = 'MAP';
    setActiveTab(tabMap);
    viewTitle.textContent = 'Shared World Map (5×5 Grid)';
    viewBadge.textContent = 'Click Unclaimed Plot to Claim';
    btnHitWall.style.display = 'none';
    btnSubmitRaid.style.display = 'none';
    loadMapData();
  });

  tabBuilder.addEventListener('click', () => {
    state.activeView = 'BUILDER';
    setActiveTab(tabBuilder);
    viewTitle.textContent = `Base Builder — Plot #${state.activePlotId}`;
    viewBadge.textContent = 'Click Grid Tile to Place Structure';
    btnHitWall.style.display = 'none';
    btnSubmitRaid.style.display = 'none';
    render();
  });

  tabRaid.addEventListener('click', () => {
    state.activeView = 'RAID';
    setActiveTab(tabRaid);
    viewTitle.textContent = `Stealth Raid Simulation — Target User #${inputDefenderId.value}`;
    viewBadge.textContent = 'Grayscale Canvas — Move & Stealth Infiltrate';
    btnHitWall.style.display = 'inline-block';
    btnSubmitRaid.style.display = 'inline-block';
    render();
  });

  function setActiveTab(activeTab) {
    [tabMap, tabBuilder, tabRaid].forEach((t) => t.classList.remove('active'));
    activeTab.classList.add('active');
  }

  // --- Start Raid Button Listener ---
  btnStartRaid.addEventListener('click', async () => {
    const defenderId = parseInt(inputDefenderId.value, 10) || 34;
    try {
      const data = await fetchRaidTarget(defenderId);
      if (data) {
        state.activeView = 'RAID';
        setActiveTab(tabRaid);
        viewTitle.textContent = `Stealth Raid Simulation — Target User #${defenderId}`;

        state.raid.defenderId = defenderId;
        state.raid.buildings = (data.layout && data.layout.buildings) || [];
        state.raid.walls = (data.layout && data.layout.walls) || [];
        state.raid.lighthouse = (data.layout && data.layout.lighthouse) || { xPos: 10, yPos: 2, coneAngle: 60, coneRange: 7 };
        state.raid.chipsAvailable = data.chipsAvailable || 200;

        state.raid.playerPos = { x: 10, y: 19 };
        state.raid.gateWallHits = 0;
        state.raid.isAlarmTriggered = false;
        state.raid.tickCount = 0;
        state.raid.sessionLog = [{ tick: 0, xPos: 10, yPos: 19 }];
        state.raid.wallBreakEvents = [];

        btnHitWall.style.display = 'inline-block';
        btnSubmitRaid.style.display = 'inline-block';

        showToast(`Raid Started against User #${defenderId}! Base rendered in grayscale.`, 'success');
        render();
      }
    } catch (err) {
      showToast(`Failed to load raid target: ${err.message}`, 'error');
    }
  });

  // --- Hit Wall Button Listener ---
  btnHitWall.addEventListener('click', () => {
    if (state.activeView !== 'RAID') return;
    state.raid.gateWallHits += 1;
    state.raid.wallBreakEvents.push({
      wallBlockId: 9,
      hits: state.raid.gateWallHits,
      gateWasLocked: state.raid.isAlarmTriggered,
    });

    if (state.raid.gateWallHits >= 4) {
      showToast('Exit Gate WALL BROKEN (4/4)! You can now extract successfully!', 'success');
    } else {
      showToast(`Hit Gate Wall! Progress: ${state.raid.gateWallHits}/4 hits`, 'info');
    }
    render();
  });

  // --- Submit Raid Button Listener ---
  btnSubmitRaid.addEventListener('click', async () => {
    if (state.activeView !== 'RAID') return;

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

  // --- Keyboard Movement Listener for Raid ---
  window.addEventListener('keydown', (e) => {
    if (state.activeView !== 'RAID') return;

    let { x, y } = state.raid.playerPos;
    let moved = false;

    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { y = Math.max(0, y - 1); moved = true; }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { y = Math.min(19, y + 1); moved = true; }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { x = Math.max(0, x - 1); moved = true; }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { x = Math.min(19, x + 1); moved = true; }
    if (e.key === ' ') { btnHitWall.click(); }

    if (moved) {
      state.raid.playerPos = { x, y };
      state.raid.tickCount += 1;
      state.raid.sessionLog.push({ tick: state.raid.tickCount, xPos: x, yPos: y });

      // Rotate beam angle
      state.raid.beamAngleDeg = (state.raid.tickCount * 1.5) % 360;

      // Stealth Detection Check
      const lh = {
        x: state.raid.lighthouse.xPos || 10,
        y: state.raid.lighthouse.yPos || 2,
        beamAngleDeg: state.raid.beamAngleDeg,
        coneAngleDeg: 60,
        coneRangeTiles: 7,
      };

      const playerObj = {
        x, y,
        camoBand: getLuminanceBand(state.camoColor),
      };

      const result = checkLighthouseDetection(lh, playerObj, 3);
      if (result.isDetected) {
        state.raid.isAlarmTriggered = true;
        showToast(`ALARM DETECTED! Reason: ${result.reason}`, 'error');
      }
      render();
    }
  });

  // --- Color Palette Selection Listener ---
  document.querySelectorAll('.color-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
      swatch.classList.add('active');
      state.selectedColor = swatch.dataset.color;
    });
  });

  // --- Tool / Building Placement Listener ---
  document.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedTool = btn.dataset.tool;
    });
  });

  // --- User Switcher Listener ---
  btnSetUser.addEventListener('click', () => {
    const val = parseInt(inputUserId.value, 10);
    if (val > 0) {
      state.userId = val;
      hudUserId.textContent = state.userId;
      showToast(`Switched Active User ID to #${state.userId}`, 'info');
      loadMapData();
    }
  });

  // --- Canvas Mouse Listener ---
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (state.activeView === 'MAP') {
      const padding = 40;
      const cellW = (canvas.width - padding * 2) / 5;
      const cellH = (canvas.height - padding * 2) / 5;
      const col = Math.floor((mx - padding) / cellW);
      const row = Math.floor((my - padding) / cellH);
      const found = state.plots.find((p) => p.xCoord === col && p.yCoord === row);
      state.hoveredPlotId = found ? found.id : null;
    } else if (state.activeView === 'BUILDER') {
      const tileSize = canvas.width / 20;
      const xPos = Math.floor(mx / tileSize);
      const yPos = Math.floor(my / tileSize);
      if (xPos >= 0 && xPos < 20 && yPos >= 0 && yPos < 20) {
        state.hoverTile = { xPos, yPos };
      } else {
        state.hoverTile = null;
      }
    }
    render();
  });

  canvas.addEventListener('click', async () => {
    if (state.activeView === 'MAP') {
      if (!state.hoveredPlotId) return;
      const targetPlot = state.plots.find((p) => p.id === state.hoveredPlotId);
      if (!targetPlot) return;

      if (targetPlot.ownerId === state.userId || targetPlot.isOccupied) {
        state.activePlotId = targetPlot.id;
        state.activeView = 'BUILDER';
        setActiveTab(tabBuilder);
        viewTitle.textContent = `Base Builder — Plot #${state.activePlotId}`;
        hudPlot.textContent = `#${state.activePlotId}`;
        render();
        return;
      }

      try {
        const res = await claimPlot(state.userId, targetPlot.id);
        if (res.success) {
          showToast(`Successfully Claimed Plot #${res.plot.id}!`, 'success');
          state.coins = res.coinsRemaining;
          updateHUD();
          state.activePlotId = res.plot.id;
          state.activeView = 'BUILDER';
          setActiveTab(tabBuilder);
          viewTitle.textContent = `Base Builder — Plot #${state.activePlotId}`;
          hudPlot.textContent = `#${state.activePlotId}`;
          loadMapData();
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
            showToast(`Placed ${state.selectedTool} successfully!`, 'success');
            if (res.inkRemaining !== undefined) state.inkEnergy = res.inkRemaining;
            updateHUD();

            const { w, h } = getBuildingSize(state.selectedTool);
            state.buildings.push({
              id: res.buildingId,
              buildingType: state.selectedTool,
              xPos, yPos,
              footprintWidth: w, footprintHeight: h,
              hexColor: state.selectedColor,
              level: 1,
            });
            render();
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
            showToast(`Placed ${res.defenseType} successfully!`, 'success');
            state.defenses.push({ id: res.defenseId, type: res.defenseType });
            render();
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

  function render() {
    if (state.activeView === 'MAP') {
      renderWorldMap(ctx, state.plots, state.userId, state.hoveredPlotId);
    } else if (state.activeView === 'BUILDER') {
      renderBaseBuilder(ctx, state);
    } else if (state.activeView === 'RAID') {
      renderGrayscaleRaid(ctx, state.raid);
    }
  }

  async function loadMapData() {
    try {
      const data = await fetchMap();
      if (data && data.plots) {
        state.plots = data.plots;
        render();
      }
    } catch (err) {
      showToast(`Failed to load world map: ${err.message}`, 'error');
    }
  }

  function updateHUD() {
    hudUserId.textContent = state.userId;
    hudCoins.textContent = state.coins;
    hudInk.textContent = state.inkEnergy;
    hudChips.textContent = state.chips;
    hudCamo.textContent = state.camoColor;
    hudPlot.textContent = `#${state.activePlotId}`;
  }
});

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type === 'error' ? 'error' : 'success'}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
