/** Task payouts — net of rebuild cost, a full loop funds the first robot. */
export const TASK_REWARDS = {
  REBUILD: { coins: 50, chips: 15 },
  PICK_PART: { coins: 12, chips: 0 },
  MOUNT_PART: { coins: 20, chips: 8 },
  BUGGY_DONE: { coins: 80, chips: 40 },
};

export const ROBOT_BASE_COST = 500;
export const ROBOT_COST_GROWTH = 1.5;
export const ROBOT_MAX = 8;

export function robotCost(ownedCount) {
  const n = Math.max(0, Math.floor(Number(ownedCount) || 0));
  return Math.round(ROBOT_BASE_COST * ROBOT_COST_GROWTH ** n);
}

export function formatReward(reward) {
  if (!reward) return '';
  const bits = [];
  if (reward.coins) bits.push(`+${reward.coins}c`);
  if (reward.chips) bits.push(`+${reward.chips} chips`);
  return bits.join(' · ');
}

export const INK_REGEN_SECONDS = 8;
export const COIN_REGEN_SECONDS = 12;
export const INK_CAP = 100;

export const WORLD_SAVE_KEY = 'sp_world_save_v1';
export const MOUNT_SECONDS = 1.15;
export const PICKUP_SECONDS = 0.28;
