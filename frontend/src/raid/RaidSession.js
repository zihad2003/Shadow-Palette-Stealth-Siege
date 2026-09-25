import { isGameColor } from '../colors.js';
import { RAID_OUTCOMES } from './stealthConstants.js';
import { estimateLootAmounts, estimateLootPercent } from './extraction.js';

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
    channelProgress: 0,
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

export function resolveRaidOutcome({ alarmTriggered, caught, extractionOk = false }) {
  if (caught) return 'CAUGHT';
  if (!extractionOk) return 'INCOMPLETE';
  if (alarmTriggered) return 'ESCAPED';
  return 'SILENT';
}

export function chipsForOutcome(outcome, baseChips) {
  const n = Math.max(0, baseChips || 0);
  if (outcome === 'CAUGHT' || outcome === 'INCOMPLETE') return 0;
  if (outcome === 'ESCAPED') return Math.round(n * 1.5);
  return n;
}

export { estimateLootPercent };

/**
 * Client-side greed loot preview (server recomputes via LootCalculationStrategy).
 */
export function lootForOutcome(outcome, { coins = 0, ink = 0, elapsedSeconds = 40 } = {}) {
  return estimateLootAmounts(elapsedSeconds, { coins, ink }, outcome);
}
