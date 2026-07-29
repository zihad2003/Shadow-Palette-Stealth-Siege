// API Service Client for Backend Integration

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({ success: false, error: 'INVALID_JSON_RESPONSE' }));

  if (!res.ok) {
    const errorMsg = data.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function fetchHealth() {
  return request('/api/health');
}

export async function fetchMap() {
  return request('/api/map');
}

export async function setupPlayer(userId, characterModel, camoColor) {
  return request('/api/player/setup', {
    method: 'POST',
    body: JSON.stringify({ userId, characterModel, camoColor }),
  });
}

export async function claimPlot(userId, plotId) {
  return request('/api/plot/claim', {
    method: 'POST',
    body: JSON.stringify({ userId, plotId }),
  });
}

export async function placeBuilding(userId, plotId, buildingType, modelVariant, xPos, yPos, hexColor) {
  return request('/api/building/place', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      plotId,
      action: 'PLACE_BUILDING',
      buildingType,
      modelVariant: modelVariant || 1,
      xPos,
      yPos,
      hexColor,
    }),
  });
}

export async function upgradeBuilding(userId, targetId) {
  return request('/api/building/upgrade', {
    method: 'POST',
    body: JSON.stringify({ userId, targetId, targetType: 'BUILDING' }),
  });
}

export async function placeDefense(userId, plotId, defenseType, modelVariant) {
  return request('/api/defense/place', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      plotId,
      defenseType,
      modelVariant: modelVariant || 1,
    }),
  });
}
