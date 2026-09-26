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

/** @deprecated World-map plot picking removed — home bases are auto-assigned at setup. */
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

export async function fetchRaidTarget(userId) {
  return request(`/api/raid/target/${userId}`);
}

/** Notify backend a raid is starting — may push a live invite if defender is online. */
export async function startRaidSession(payload) {
  return request('/api/raid/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function completeRaid(payload) {
  return request('/api/raid/complete', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminOverview() {
  return request('/api/admin/overview');
}

export async function fetchAdminUsers(query = '') {
  const q = query ? `?q=${encodeURIComponent(query)}` : '';
  return request(`/api/admin/users${q}`);
}

export async function fetchAdminUser(id) {
  return request(`/api/admin/users/${id}`);
}

export async function createAdminUser(payload) {
  return request('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUser(id, payload) {
  return request(`/api/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminUser(id) {
  return request(`/api/admin/users/${id}`, { method: 'DELETE' });
}

export async function seedAdminUsers() {
  return request('/api/admin/seed', { method: 'POST' });
}

export async function postPresenceHeartbeat(payload) {
  return request('/api/presence', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchOnlinePlayers(userId) {
  const q = userId != null ? `?userId=${encodeURIComponent(userId)}` : '';
  return request(`/api/presence/online${q}`);
}

export async function sendVisitInvite(hostId, guestId) {
  return request('/api/visit/invite', {
    method: 'POST',
    body: JSON.stringify({ hostId, guestId }),
  });
}

export async function fetchVisitInbox(userId) {
  return request(`/api/visit/inbox/${userId}`);
}

export async function acceptVisitInvite(inviteId, userId) {
  return request('/api/visit/accept', {
    method: 'POST',
    body: JSON.stringify({ inviteId, userId }),
  });
}

export async function declineVisitInvite(inviteId, userId) {
  return request('/api/visit/decline', {
    method: 'POST',
    body: JSON.stringify({ inviteId, userId }),
  });
}

export async function fetchVisitSession(visitId) {
  return request(`/api/visit/session/${visitId}`);
}

export async function postVisitState(payload) {
  return request('/api/visit/state', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function endVisitSession(payload) {
  return request('/api/visit/end', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/* —— Duo party —— */
export async function duoInvite(payload) {
  return request('/api/duo/invite', { method: 'POST', body: JSON.stringify(payload) });
}

export async function duoAccept(payload) {
  return request('/api/duo/accept', { method: 'POST', body: JSON.stringify(payload) });
}

export async function duoDecline(payload) {
  return request('/api/duo/decline', { method: 'POST', body: JSON.stringify(payload) });
}

export async function duoLeave(payload) {
  return request('/api/duo/leave', { method: 'POST', body: JSON.stringify(payload) });
}

export async function duoStartRaid(payload) {
  return request('/api/duo/raid/start', { method: 'POST', body: JSON.stringify(payload) });
}

export async function duoMarkCaught(partyId, userId) {
  return request(`/api/duo/${partyId}/caught`, {
    method: 'POST',
    body: JSON.stringify({ partyId, userId }),
  });
}

export async function duoForUser(userId) {
  return request(`/api/duo/user/${userId}`);
}

