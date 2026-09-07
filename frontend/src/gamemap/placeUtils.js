import { MAP_COLS, MAP_ROWS, SEARCHLIGHT_TILE } from './mapConfig.js';

/** Compact footprints so structures fit the 12×10 raid-style fortress board. */
export const GAME_FOOTPRINTS = {
  SLEEP_HOUSE: { w: 2, h: 2 },
  INK_HOUSE: { w: 2, h: 2 },
  CRAFT_HOUSE: { w: 2, h: 2 },
  COIN_GENERATOR: { w: 2, h: 2 },
};

export function getGameFootprint(type) {
  return GAME_FOOTPRINTS[type] || { w: 2, h: 2 };
}

function inGrid(x, y) {
  return x >= 0 && y >= 0 && x < MAP_COLS && y < MAP_ROWS;
}

/** Keep the center searchlight clear of placed structures. */
export function inSearchlightPlaza(x, y, w = 1, h = 1) {
  const cx = Math.floor(SEARCHLIGHT_TILE.column);
  const cy = Math.floor(SEARCHLIGHT_TILE.row);
  const minC = cx - 1;
  const maxC = cx + 1;
  const minR = cy - 1;
  const maxR = cy + 1;
  return x + w - 1 >= minC && x <= maxC && y + h - 1 >= minR && y <= maxR;
}

function overlapsBuilding(buildings, x, y, w, h) {
  return buildings.some((b) => {
    if (b.buildingType === 'MAKEUP_HOUSE') return false;
    const bw = b.footprintWidth || 2;
    const bh = b.footprintHeight || 2;
    return x < b.xPos + bw && x + w > b.xPos && y < b.yPos + bh && y + h > b.yPos;
  });
}

export function canPlaceOnGameMap(buildings, x, y, w, h) {
  if (!inGrid(x, y) || !inGrid(x + w - 1, y + h - 1)) return false;
  if (inSearchlightPlaza(x, y, w, h)) return false;
  return !overlapsBuilding(buildings, x, y, w, h);
}
