import { isGameColor } from '../colors.js';

export function createRaidSession({ attackerId, defenderId, camoColor }) {
  const locked = String(camoColor || '').trim().toUpperCase();
  if (!isGameColor(locked)) {
    throw new Error('RAID_CAMO_REQUIRED');
  }
  return Object.freeze({
    raidId: `raid_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
    attackerId,
    defenderId,
    camoColor: locked,
    startTime: Date.now(),
    isActive: true,
  });
}

export function rejectColorChange(raid, nextColor) {
  if (raid && raid.isActive) {
    return { ok: false, reason: 'RAID_CAMO_LOCKED', camoColor: raid.camoColor };
  }
  const key = String(nextColor || '').trim().toUpperCase();
  if (!isGameColor(key)) {
    return { ok: false, reason: 'INVALID_COLOR' };
  }
  return { ok: true, camoColor: key };
}

export function resolveRaidOutcome({ alarmTriggered, caught }) {
  if (caught) return 'CAUGHT';
  if (alarmTriggered) return 'ESCAPED';
  return 'SILENT';
}

export function chipsForOutcome(outcome, baseChips) {
  const n = Math.max(0, baseChips || 0);
  if (outcome === 'CAUGHT') return 0;
  if (outcome === 'ESCAPED') return Math.round(n * 1.5);
  return n;
}
