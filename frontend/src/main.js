import { fetchMap, claimPlot, placeBuilding, placeDefense, upgradeBuilding } from './api.js';
import { renderWorldMap } from './worldMapRenderer.js';
import { renderBaseBuilder, getBuildingSize } from './baseBuilderRenderer.js';
import { COLORS } from './colors.js';

// Application State
const state = {
  activeView: 'MAP', // 'MAP' | 'BUILDER'
  userId: 12,
  coins: 500,
  inkEnergy: 100,
  camoColor: 'BLUE',
  activePlotId: 1,

  // World Map State
  plots: [],
  hoveredPlotId: null,

  // Base Builder State
  selectedColor: COLORS.WHITE,
  selectedTool: 'CRAFT_HOUSE', // CRAFT_HOUSE, INK_HOUSE, SLEEP_HOUSE, COIN_GENERATOR, LIGHTHOUSE, PATROL_ROBOT
  buildings: [],
  defenses: [],
  paintedTiles: {},
  hoverTile: null,
};

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const tabMap = document.getElementById('tab-map');
  const tabBuilder = document.getElementById('tab-builder');
  const viewTitle = document.getElementById('view-title');
  const viewBadge = document.getElementById('view-badge');

  const hudUserId = document.getElementById('hud-user-id');
  const hudCoins = document.getElementById('hud-coins');
  const hudInk = document.getElementById('hud-ink');
  const hudCamo = document.getElementById('hud-camo');
  const hudPlot = document.getElementById('hud-plot');

  const inputUserId = document.getElementById('input-user-id');
  const btnSetUser = document.getElementById('btn-set-user');

  // --- Initial Data Load ---
  loadMapData();

  // --- Tab Navigation Event Listeners ---
  tabMap.addEventListener('click', () => {
    state.activeView = 'MAP';
    tabMap.classList.add('active');
    tabBuilder.classList.remove('active');
    viewTitle.textContent = 'Shared World Map (5×5 Grid)';
    viewBadge.textContent = 'Click Unclaimed Plot to Claim';
    loadMapData();
  });

  tabBuilder.addEventListener('click', () => {
    state.activeView = 'BUILDER';
    tabBuilder.classList.add('active');
    tabMap.classList.remove('active');
    viewTitle.textContent = `Base Builder — Plot #${state.activePlotId}`;
    viewBadge.textContent = 'Click Grid Tile to Place Structure';
    render();
  });

  // --- Color Palette Selection Event Listeners ---
  document.querySelectorAll('.color-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
      swatch.classList.add('active');
      state.selectedColor = swatch.dataset.color;
      showToast(`Selected Color: ${swatch.title}`, 'info');
    });
  });

  // --- Tool / Structure Placement Event Listeners ---
  document.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedTool = btn.dataset.tool;
      showToast(`Selected Structure: ${btn.dataset.tool}`, 'info');
    });
  });

  // --- User Switching Event Listener ---
  btnSetUser.addEventListener('click', () => {
    const val = parseInt(inputUserId.value, 10);
    if (val > 0) {
      state.userId = val;
      hudUserId.textContent = state.userId;
      showToast(`Switched Active User ID to #${state.userId}`, 'info');
      loadMapData();
    }
  });

  // --- Canvas Mouse Events ---
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
        // Open Base Builder for this plot
        state.activePlotId = targetPlot.id;
        state.activeView = 'BUILDER';
        tabBuilder.classList.add('active');
        tabMap.classList.remove('active');
        viewTitle.textContent = `Base Builder — Plot #${state.activePlotId}`;
        hudPlot.textContent = `#${state.activePlotId}`;
        render();
        return;
      }

      // Claim Unclaimed Plot
      try {
        const res = await claimPlot(state.userId, targetPlot.id);
        if (res.success) {
          showToast(`Successfully Claimed Plot #${res.plot.id}!`, 'success');
          state.coins = res.coinsRemaining;
          updateHUD();
          state.activePlotId = res.plot.id;
          state.activeView = 'BUILDER';
          tabBuilder.classList.add('active');
          tabMap.classList.remove('active');
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
              xPos,
              yPos,
              footprintWidth: w,
              footprintHeight: h,
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
            state.defenses.push({
              id: res.defenseId,
              type: res.defenseType,
            });
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

  // Main Render Loop Function
  function render() {
    if (state.activeView === 'MAP') {
      renderWorldMap(ctx, state.plots, state.userId, state.hoveredPlotId);
    } else if (state.activeView === 'BUILDER') {
      renderBaseBuilder(ctx, state);
    }
  }

  // Load Map Data from Backend
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

  setTimeout(() => {
    toast.remove();
  }, 4000);
}
