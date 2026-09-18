import { MAP_COLS, MAP_ROWS, SEARCHLIGHT_TILE } from './mapConfig.js';

const HOUSE_TYPES = new Set(['SLEEP_HOUSE', 'INK_HOUSE', 'CRAFT_HOUSE', 'COIN_GENERATOR']);

/** Concept houses sit on a 3×3 tile pad. */
export const GAME_FOOTPRINTS = {
  SLEEP_HOUSE: { w: 3, h: 3 },
  INK_HOUSE: { w: 3, h: 3 },
  CRAFT_HOUSE: { w: 3, h: 3 },
  COIN_GENERATOR: { w: 3, h: 3 },
};

export function getGameFootprint(type) {
  return GAME_FOOTPRINTS[type] || { w: 3, h: 3 };
}

/** Grow saved 2×2 houses to 3×3 and keep them on the board. */
export function migrateHouseFootprints(list) {
  if (!Array.isArray(list)) return [];
  return list.map((b) => {
    if (!b || !HOUSE_TYPES.has(b.buildingType)) return b;
    const fp = getGameFootprint(b.buildingType);
    const w = Number(b.footprintWidth) || 2;
    const h = Number(b.footprintHeight) || 2;
    if (w >= fp.w && h >= fp.h) return b;
    const xPos = Math.max(1, Math.min(Number(b.xPos) || 0, MAP_COLS - 1 - fp.w));
    const yPos = Math.max(1, Math.min(Number(b.yPos) || 0, MAP_ROWS - 1 - fp.h));
    return { ...b, footprintWidth: fp.w, footprintHeight: fp.h, xPos, yPos };
  });
}

function inGrid(x, y) {
  return x >= 0 && y >= 0 && x < MAP_COLS && y < MAP_ROWS;
}

/** Keep the center searchlight clear of placed structures. */
export function inSearchlightPlaza(x, y, w = 1, h = 1) {
  const cx = Math.floor(SEARCHLIGHT_TILE.column);
  const cy = Math.floor(SEARCHLIGHT_TILE.row);
  const clear = 2;
  const minC = cx - clear;
  const maxC = cx + clear;
  const minR = cy - clear;
  const maxR = cy + clear;
  return x + w - 1 >= minC && x <= maxC && y + h - 1 >= minR && y <= maxR;
}

function overlapsBuilding(buildings, x, y, w, h, excludeId) {
  return buildings.some((b) => {
    if (excludeId != null && b.id === excludeId) return false;
    if (b.buildingType === 'MAKEUP_HOUSE') return false;
    const bw = b.footprintWidth || getGameFootprint(b.buildingType).w;
    const bh = b.footprintHeight || getGameFootprint(b.buildingType).h;
    return x < b.xPos + bw && x + w > b.xPos && y < b.yPos + bh && y + h > b.yPos;
  });
}

export function canPlaceOnGameMap(buildings, x, y, w, h, excludeId) {
  if (!inGrid(x, y) || !inGrid(x + w - 1, y + h - 1)) return false;
  if (inSearchlightPlaza(x, y, w, h)) return false;
  return !overlapsBuilding(buildings, x, y, w, h, excludeId);
}
