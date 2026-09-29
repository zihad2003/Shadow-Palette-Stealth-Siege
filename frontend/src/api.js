// API Service Client for Backend Integration

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

/* ---- JWT token management ---- */
let _jwtToken = null;
try {
  _jwtToken = window.sessionStorage.getItem('sp_jwt') || window.localStorage.getItem('sp_jwt') || null;
} catch { /* private mode */ }

export function setJwtToken(token) {
  _jwtToken = token || null;
  try {
    if (token) {
      window.sessionStorage.setItem('sp_jwt', token);
      window.localStorage.setItem('sp_jwt', token);
    } else {
      window.sessionStorage.removeItem('sp_jwt');
      window.localStorage.removeItem('sp_jwt');
    }
  } catch { /* private mode */ }
}

export function getJwtToken() {
  return _jwtToken;
}

async function request(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (_jwtToken) {
    headers['Authorization'] = `Bearer ${_jwtToken}`;
  }
  // Add a timeout so the UI doesn't hang if backend proxy is unresponsive
  const signal = options.signal || (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined);
  const res = await fetch(fullUrl, { ...options, headers, signal }).catch((err) => {
    // Convert fetch abort/network errors into an offline error immediately
    const errorMsg = 'Backend offline or unreachable';
    const fakeRes = new Error(errorMsg);
    fakeRes.status = 503;
    fakeRes.data = { success: false, error: errorMsg };
    throw fakeRes;
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  }

  if (!data) {
    const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    const errorMsg = !API_BASE_URL && isVercel
      ? 'Backend URL not configured on Vercel (set VITE_API_BASE_URL)'
      : 'Backend offline or returned non-JSON';
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = { success: false, error: errorMsg };
    throw err;
  }

  if (!res.ok || (data && data.success === false && data.error)) {
    const errorMsg = data.error || data.message || `HTTP ${res.status}`;
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

export function getOrCreateDeviceToken() {
  try {
    let token = window.localStorage.getItem('sp_device_token');
    if (!token) {
      token = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      window.localStorage.setItem('sp_device_token', token);
    }
    return token;
  } catch {
    return 'temp_device_' + Date.now();
  }
}

/** Resolve or create a player identity server-side locked to device token. */
export async function startSession(userId, username, password, recoveryToken) {
  const deviceToken = recoveryToken || getOrCreateDeviceToken();
  const payload = { recoveryToken: deviceToken };
  if (userId != null) payload.userId = userId;
  if (username) payload.username = username;
  if (password) payload.password = password;
  return request('/api/session/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function savePlayerProgress(payload) {
  return request('/api/player/save', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchMap() {
  return request('/api/map');
}

export async function setupPlayer(userId, characterModel, camoColor, username) {
  const payload = { userId, characterModel, camoColor };
  if (username) payload.username = username;
  return request('/api/player/setup', {
    method: 'POST',
    body: JSON.stringify(payload),
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

export async function duoSetReady(payload) {
  return request('/api/duo/ready', { method: 'POST', body: JSON.stringify(payload) });
}

export async function duoForUser(userId) {
  return request(`/api/duo/user/${userId}`);
}

export async function postRansomOffer(payload) {
  return request('/api/raid/ransom/offer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function postRansomSettle(payload) {
  return request('/api/raid/ransom/settle', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

