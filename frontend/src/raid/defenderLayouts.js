import { GAME_COLOR_KEYS } from '../colors.js';
import { MAP_COLS, MAP_ROWS } from '../gamemap/mapConfig.js';

function hashSeed(n) {
  let x = (n >>> 0) * 1664525 + 1013904223;
  return (x >>> 0) / 4294967296;
}

function keyAt(column, row) {
  return `${column},${row}`;
}

const HOUSE_TYPES = ['SLEEP_HOUSE', 'INK_HOUSE', 'CRAFT_HOUSE', 'COIN_GENERATOR', 'JAIL'];
const HOUSE_GRAY = ['#C8C8C8', '#B0B0B0', '#9A9A9A', '#D0D0D0'];

import { generate5ColorTechniqueTiles } from '../gamemap/starterRuins.js';

/**
 * Deterministic defender paint layout for raid targets using the 5-color block technique.
 * Colors are gameplay-only; raid renderer keeps tiles gray until the beam hits.
 */
export function generateDefenderTiles(seed = 34) {
  return generate5ColorTechniqueTiles(seed);
}

/**
 * Custom tailored building arrangements for the 5 bot factions.
 */
export function generateDefenderBuildings(seed = 34, count = 4) {
  // Preset distinct architectural blueprints for the 5 bot factions
  const PRESET_LAYOUTS = {
    101: [ // Crimson Citadel (Heavy red volcanic fortress, center generator)
      { type: 'COIN_GENERATOR', x: Math.floor(MAP_COLS * 0.45), y: Math.floor(MAP_ROWS * 0.45), level: 3, hexColor: '#E53E3E' },
      { type: 'INK_HOUSE', x: 3, y: 3, level: 2, hexColor: '#FF6B6B' },
      { type: 'INK_HOUSE', x: MAP_COLS - 6, y: MAP_ROWS - 6, level: 2, hexColor: '#FF6B6B' },
      { type: 'CRAFT_HOUSE', x: MAP_COLS - 6, y: 3, level: 2, hexColor: '#C53030' },
      { type: 'SLEEP_HOUSE', x: 3, y: MAP_ROWS - 6, level: 2, hexColor: '#9B2C2C' },
    ],
    102: [ // Emerald Vault (Stealth garden sanctuary, spaced caches)
      { type: 'COIN_GENERATOR', x: 2, y: 2, level: 2, hexColor: '#38A169' },
      { type: 'COIN_GENERATOR', x: MAP_COLS - 5, y: MAP_ROWS - 5, level: 2, hexColor: '#38A169' },
      { type: 'INK_HOUSE', x: Math.floor(MAP_COLS * 0.5), y: 3, level: 1, hexColor: '#48BB78' },
      { type: 'SLEEP_HOUSE', x: 3, y: Math.floor(MAP_ROWS * 0.5), level: 1, hexColor: '#2F855A' },
    ],
    103: [ // Cobalt Bastion (Quad-corner high-tech grid)
      { type: 'COIN_GENERATOR', x: 3, y: 3, level: 3, hexColor: '#3182CE' },
      { type: 'COIN_GENERATOR', x: MAP_COLS - 6, y: 3, level: 3, hexColor: '#3182CE' },
      { type: 'INK_HOUSE', x: 3, y: MAP_ROWS - 6, level: 3, hexColor: '#4299E1' },
      { type: 'INK_HOUSE', x: MAP_COLS - 6, y: MAP_ROWS - 6, level: 3, hexColor: '#4299E1' },
      { type: 'CRAFT_HOUSE', x: Math.floor(MAP_COLS * 0.45), y: 3, level: 2, hexColor: '#2B6CB0' },
      { type: 'SLEEP_HOUSE', x: Math.floor(MAP_COLS * 0.45), y: MAP_ROWS - 6, level: 2, hexColor: '#2C5282' },
    ],
    104: [ // Amber Refinery (Triple clustered industrial generators)
      { type: 'COIN_GENERATOR', x: Math.floor(MAP_COLS * 0.35), y: Math.floor(MAP_ROWS * 0.4), level: 2, hexColor: '#D69E2E' },
      { type: 'COIN_GENERATOR', x: Math.floor(MAP_COLS * 0.55), y: Math.floor(MAP_ROWS * 0.4), level: 3, hexColor: '#ECC94B' },
      { type: 'COIN_GENERATOR', x: Math.floor(MAP_COLS * 0.45), y: Math.floor(MAP_ROWS * 0.65), level: 2, hexColor: '#D69E2E' },
      { type: 'INK_HOUSE', x: 3, y: 3, level: 2, hexColor: '#FAF089' },
      { type: 'CRAFT_HOUSE', x: MAP_COLS - 6, y: MAP_ROWS - 6, level: 2, hexColor: '#B7791F' },
    ],
    105: [ // Amethyst Sanctum (Void stronghold with holding cell / JAIL)
      { type: 'COIN_GENERATOR', x: Math.floor(MAP_COLS * 0.45), y: 3, level: 4, hexColor: '#805AD5' },
      { type: 'JAIL', x: Math.floor(MAP_COLS * 0.45), y: Math.floor(MAP_ROWS * 0.45), level: 3, hexColor: '#553C9A' },
      { type: 'INK_HOUSE', x: 3, y: Math.floor(MAP_ROWS * 0.45), level: 3, hexColor: '#9F7AEA' },
      { type: 'INK_HOUSE', x: MAP_COLS - 6, y: Math.floor(MAP_ROWS * 0.45), level: 3, hexColor: '#9F7AEA' },
      { type: 'CRAFT_HOUSE', x: 3, y: MAP_ROWS - 6, level: 3, hexColor: '#6B46C1' },
      { type: 'SLEEP_HOUSE', x: MAP_COLS - 6, y: MAP_ROWS - 6, level: 3, hexColor: '#44337A' },
    ],
  };

  if (PRESET_LAYOUTS[seed]) {
    return PRESET_LAYOUTS[seed].map((b, i) => ({
      id: `def-b-${seed}-${i}`,
      buildingType: b.type,
      xPos: b.x,
      yPos: b.y,
      footprintWidth: 3,
      footprintHeight: 3,
      hexColor: b.hexColor,
      level: b.level || 1,
    }));
  }

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
    const type =
      i === 0
        ? 'COIN_GENERATOR'
        : i === 1
          ? 'INK_HOUSE'
          : i === 2 && count >= 5
            ? 'JAIL'
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
