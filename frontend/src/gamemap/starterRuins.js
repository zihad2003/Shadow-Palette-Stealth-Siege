import { MAP_COLS, MAP_ROWS } from './mapConfig.js';

/** Pre-placed broken houses on a fresh 48×40 fortress — walk up and repair. */
export const REPAIR_BUILDING_COST = { coins: 80, ink: 12 };

export function createStarterRuins() {
  const slots = [
    { buildingType: 'SLEEP_HOUSE', xPos: 3, yPos: 3 },
    { buildingType: 'INK_HOUSE', xPos: MAP_COLS - 5, yPos: 3 },
    { buildingType: 'CRAFT_HOUSE', xPos: 3, yPos: MAP_ROWS - 5 },
    { buildingType: 'COIN_GENERATOR', xPos: MAP_COLS - 5, yPos: MAP_ROWS - 5 },
    { buildingType: 'SLEEP_HOUSE', xPos: Math.floor(MAP_COLS * 0.35), yPos: Math.floor(MAP_ROWS * 0.4) },
    { buildingType: 'INK_HOUSE', xPos: Math.floor(MAP_COLS * 0.55), yPos: Math.floor(MAP_ROWS * 0.55) },
  ];

  return slots.map((s, i) => ({
    id: i + 1,
    buildingType: s.buildingType,
    xPos: s.xPos,
    yPos: s.yPos,
    footprintWidth: 2,
    footprintHeight: 2,
    hexColor: '#9A958C',
    level: 1,
    ruined: true,
  }));
}

export function buildingCoversTile(building, column, row) {
  if (!building) return false;
  const w = building.footprintWidth || 2;
  const h = building.footprintHeight || 2;
  return (
    column >= building.xPos &&
    column < building.xPos + w &&
    row >= building.yPos &&
    row < building.yPos + h
  );
}

export function findRuinAt(buildings, column, row) {
  return buildings.find((b) => b.ruined && buildingCoversTile(b, column, row)) || null;
}

/** Stand on the ruin footprint or any adjacent tile to repair. */
export function findRuinNear(buildings, column, row) {
  const direct = findRuinAt(buildings, column, row);
  if (direct) return direct;
  const neighbors = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dx, dy] of neighbors) {
    const hit = findRuinAt(buildings, column + dx, row + dy);
    if (hit) return hit;
  }
  return null;
}
