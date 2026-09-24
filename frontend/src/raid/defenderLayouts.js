import { GAME_COLOR_KEYS } from '../colors.js';
import { MAP_COLS, MAP_ROWS } from '../gamemap/mapConfig.js';

function hashSeed(n) {
  let x = (n >>> 0) * 1664525 + 1013904223;
  return (x >>> 0) / 4294967296;
}

function keyAt(column, row) {
  return `${column},${row}`;
}

const HOUSE_TYPES = ['SLEEP_HOUSE', 'INK_HOUSE', 'CRAFT_HOUSE', 'COIN_GENERATOR'];
const HOUSE_GRAY = ['#C8C8C8', '#B0B0B0', '#9A9A9A', '#D0D0D0'];

/**
 * Deterministic defender paint layout for raid targets.
 * Colors are gameplay-only; raid renderer keeps tiles gray until the beam hits.
 */
export function generateDefenderTiles(seed = 34) {
  const tiles = {};
  const sx = MAP_COLS / 12;
  const sy = MAP_ROWS / 10;
  const blobs = [
    { color: GAME_COLOR_KEYS[Math.floor(hashSeed(seed) * 5)], cx: 2 * sx, cy: 2 * sy, r: 2.4 * Math.min(sx, sy) },
    { color: GAME_COLOR_KEYS[Math.floor(hashSeed(seed + 3) * 5)], cx: 9 * sx, cy: 2 * sy, r: 2.2 * Math.min(sx, sy) },
    { color: GAME_COLOR_KEYS[Math.floor(hashSeed(seed + 7) * 5)], cx: 5 * sx, cy: 5 * sy, r: 2.8 * Math.min(sx, sy) },
    { color: GAME_COLOR_KEYS[Math.floor(hashSeed(seed + 11) * 5)], cx: 2 * sx, cy: 7 * sy, r: 2.4 * Math.min(sx, sy) },
    { color: GAME_COLOR_KEYS[Math.floor(hashSeed(seed + 13) * 5)], cx: 9 * sx, cy: 7 * sy, r: 2.6 * Math.min(sx, sy) },
    { color: GAME_COLOR_KEYS[Math.floor(hashSeed(seed + 19) * 5)], cx: 5 * sx, cy: 3 * sy, r: 2.2 * Math.min(sx, sy) },
    { color: GAME_COLOR_KEYS[Math.floor(hashSeed(seed + 23) * 5)], cx: 3 * sx, cy: 5 * sy, r: 2.0 * Math.min(sx, sy) },
    { color: GAME_COLOR_KEYS[Math.floor(hashSeed(seed + 29) * 5)], cx: 8 * sx, cy: 5 * sy, r: 2.1 * Math.min(sx, sy) },
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

/**
 * Houses spread across the larger fortress — same 3×3 footprints as the base builder.
 * Always includes a Coin Generator and Ink House so raiders can steal resources in-world.
 */
export function generateDefenderBuildings(seed = 34, count = 4) {
  const slots = [
    { x: 2, y: 2 },
    { x: MAP_COLS - 5, y: 2 },
    { x: 2, y: MAP_ROWS - 5 },
    { x: MAP_COLS - 5, y: MAP_ROWS - 5 },
    { x: Math.floor(MAP_COLS * 0.35), y: 3 },
    { x: Math.floor(MAP_COLS * 0.6), y: MAP_ROWS - 5 },
    { x: 4, y: Math.floor(MAP_ROWS * 0.45) },
    { x: MAP_COLS - 6, y: Math.floor(MAP_ROWS * 0.45) },
  ];
  const n = Math.max(2, Math.min(slots.length, count));
  const buildings = [];
  for (let i = 0; i < n; i++) {
    const slot = slots[i];
    // First two houses are always steal targets.
    const type =
      i === 0
        ? 'COIN_GENERATOR'
        : i === 1
          ? 'INK_HOUSE'
          : HOUSE_TYPES[Math.floor(hashSeed(seed + i * 17) * HOUSE_TYPES.length)];
    buildings.push({
      id: `def-b-${seed}-${i}`,
      buildingType: type,
      xPos: slot.x,
      yPos: slot.y,
      footprintWidth: 3,
      footprintHeight: 3,
      hexColor: HOUSE_GRAY[i % HOUSE_GRAY.length],
      level: 1 + Math.floor(hashSeed(seed + i * 31) * 3),
    });
  }
  return buildings;
}

export function generateDefenderBase(seed = 34, { buildingCount = 4, patrol = false } = {}) {
  return {
    tiles: generateDefenderTiles(seed),
    buildings: generateDefenderBuildings(seed, buildingCount),
    defenses: patrol
      ? [{ id: `def-patrol-${seed}`, type: 'PATROL_ROBOT', defenseType: 'PATROL_ROBOT' }]
      : [],
  };
}

export function tileColorAt(tiles, column, row) {
  if (!tiles) return null;
  const value = tiles[keyAt(column, row)];
  return value || null;
}
