import { GAME_COLOR_KEYS } from '../colors.js';
import { MAP_COLS, MAP_ROWS } from '../gamemap/mapConfig.js';

function hashSeed(n) {
  let x = (n >>> 0) * 1664525 + 1013904223;
  return (x >>> 0) / 4294967296;
}

function keyAt(column, row) {
  return `${column},${row}`;
}

/**
 * Deterministic defender paint layout for raid targets that have no saved tiles.
 * Gameplay still stores real color keys; the raid renderer never shows them.
 */
export function generateDefenderTiles(seed = 34) {
  const tiles = {};
  const blobs = [
    { color: GAME_COLOR_KEYS[Math.floor(hashSeed(seed) * 5)], cx: 2, cy: 2, r: 2.4 },
    { color: GAME_COLOR_KEYS[Math.floor(hashSeed(seed + 3) * 5)], cx: 9, cy: 2, r: 2.2 },
    { color: GAME_COLOR_KEYS[Math.floor(hashSeed(seed + 7) * 5)], cx: 5, cy: 5, r: 2.0 },
    { color: GAME_COLOR_KEYS[Math.floor(hashSeed(seed + 11) * 5)], cx: 2, cy: 7, r: 2.1 },
    { color: GAME_COLOR_KEYS[Math.floor(hashSeed(seed + 13) * 5)], cx: 9, cy: 7, r: 2.3 },
  ];

  for (let row = 0; row < MAP_ROWS; row++) {
    for (let column = 0; column < MAP_COLS; column++) {
      let best = null;
      let bestD = 99;
      blobs.forEach((b) => {
        const d = Math.hypot(column - b.cx, row - b.cy);
        if (d < b.r && d < bestD) {
          bestD = d;
          best = b.color;
        }
      });
      if (best) tiles[keyAt(column, row)] = best;
    }
  }
  return tiles;
}

export function tileColorAt(tiles, column, row) {
  if (!tiles) return null;
  const value = tiles[keyAt(column, row)];
  return value || null;
}
