// Main Vanilla JS entry point for Shadow Palette Frontend

const GRID_SIZE = 20;
const CANVAS_SIZE = 600;
const TILE_SIZE = CANVAS_SIZE / GRID_SIZE;

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const statusBadge = document.getElementById('backend-status');
  const healthOutput = document.getElementById('health-output');
  const btnRecheck = document.getElementById('btn-recheck');

  // Initialize Canvas
  drawGrid(ctx);

  // Health check fetcher
  const checkHealth = async () => {
    statusBadge.className = 'status-badge status-connecting';
    statusBadge.innerHTML = '<span class="dot"></span> Backend: Connecting...';
    healthOutput.textContent = 'Fetching /api/health...';

    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      if (data.status === 'ok') {
        statusBadge.className = 'status-badge status-ok';
        statusBadge.innerHTML = '<span class="dot"></span> Backend: Online';
        healthOutput.innerHTML = `<span style="color: var(--accent-emerald); font-weight: 600;">STATUS OK</span> — Response: <code>${JSON.stringify(data)}</code>`;
      } else {
        throw new Error('Unexpected response content');
      }
    } catch (err) {
      statusBadge.className = 'status-badge status-error';
      statusBadge.innerHTML = '<span class="dot"></span> Backend: Offline';
      healthOutput.innerHTML = `<span style="color: var(--accent-rose); font-weight: 600;">DISCONNECTED</span> — ${err.message}`;
    }
  };

  btnRecheck.addEventListener('click', checkHealth);

  // Initial check
  checkHealth();
});

function drawGrid(ctx) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Draw background tiles
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#111622' : '#0d111a';
      ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // Draw grid lines
  ctx.strokeStyle = '#1e283b';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * TILE_SIZE, 0);
    ctx.lineTo(i * TILE_SIZE, CANVAS_SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * TILE_SIZE);
    ctx.lineTo(CANVAS_SIZE, i * TILE_SIZE);
    ctx.stroke();
  }

  // Draw Gate placeholder at top center
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(9 * TILE_SIZE, 0, 2 * TILE_SIZE, TILE_SIZE / 2);
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px Inter';
  ctx.textAlign = 'center';
  ctx.fillText('GATE', 10 * TILE_SIZE, 10);
}
