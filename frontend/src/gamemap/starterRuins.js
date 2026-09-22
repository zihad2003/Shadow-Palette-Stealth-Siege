import { MAP_COLS, MAP_ROWS, GATE_SPAWN_TILE } from './mapConfig.js';

/** Pre-placed broken houses on a fresh 48×40 fortress — walk up and repair. */
export const REPAIR_BUILDING_COST = { coins: 80, ink: 12 };
export const STARTER_HOUSE_COUNT = 6;
export const REBUILD_SECONDS = 2;

export function houseLabel(type) {
  return String(type || 'HOUSE').replace(/_/g, ' ');
}

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
    footprintWidth: 3,
    footprintHeight: 3,
    hexColor: '#9A958C',
    level: 1,
    ruined: true,
  }));
}

const MAX_HOUSE_COLORS = [
  { hexColor: '#536DDE', colorKey: 'BLUE' },
  { hexColor: '#72B83F', colorKey: 'GREEN' },
  { hexColor: '#E5B93D', colorKey: 'YELLOW' },
  { hexColor: '#E74C3C', colorKey: 'RED' },
  { hexColor: '#8D5CC7', colorKey: 'PURPLE' },
  { hexColor: '#536DDE', colorKey: 'BLUE' },
];

/** Fully repaired L3 home — used to jump into the complete loop. */
export function createMaxedHome() {
  const ruins = createStarterRuins();
  const buildings = ruins.map((b, i) => {
    const paint = MAX_HOUSE_COLORS[i] || MAX_HOUSE_COLORS[0];
    return {
      ...b,
      footprintWidth: b.buildingType === 'CRAFT_HOUSE' ? 4 : b.buildingType === 'COIN_GENERATOR' ? 4 : 3,
      footprintHeight: b.buildingType === 'CRAFT_HOUSE' ? 4 : 3,
      hexColor: paint.hexColor,
      colorKey: paint.colorKey,
      level: 3,
      ruined: false,
    };
  });
  const colors = ['RED', 'GREEN', 'BLUE', 'YELLOW', 'PURPLE'];
  const paintedTiles = {};
  for (let c = 6; c < MAP_COLS - 6; c += 1) {
    for (let r = 6; r < MAP_ROWS - 6; r += 1) {
      if ((c + r) % 4 !== 0) continue;
      paintedTiles[`${c},${r}`] = colors[(c + r) % colors.length];
    }
  }
  return {
    coins: 50000,
    inkEnergy: 100,
    chips: 8000,
    buildings,
    paintedTiles,
    defenses: [
      { id: 101, type: 'PATROL_ROBOT', defenseType: 'PATROL_ROBOT', xPos: 20, yPos: 18 },
      { id: 102, type: 'PATROL_ROBOT', defenseType: 'PATROL_ROBOT', xPos: 27, yPos: 21 },
    ],
    camoColor: 'BLUE',
    characterModel: 1,
    searchlightLevel: 3,
    prestigeLevel: 5,
    successfulRaids: 12,
    selectedColor: 'GREEN',
  };
}

export function buildingCoversTile(building, column, row) {
  if (!building) return false;
  const w = building.footprintWidth || 3;
  const h = building.footprintHeight || 3;
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

export function findRepairedAt(buildings, column, row) {
  return (
    buildings.find(
      (b) => !b.ruined && b.buildingType !== 'MAKEUP_HOUSE' && buildingCoversTile(b, column, row)
    ) || null
  );
}

/** Stand beside a repaired house to pick it up (footprint is solid). */
export function findRepairedNear(buildings, column, row) {
  const neighbors = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (const [dx, dy] of neighbors) {
    const hit = findRepairedAt(buildings, column + dx, row + dy);
    if (hit) return hit;
  }
  return null;
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

/** Makeup House sits on the south-west wall, off the paintable grid. */
export function isNearMakeupHouse(column, row) {
  for (let c = 0; c <= 2; c += 1) {
    for (let r = MAP_ROWS - 3; r <= MAP_ROWS - 1; r += 1) {
      if (Math.max(Math.abs(column - c), Math.abs(row - r)) <= 1) return true;
    }
  }
  return false;
}

export function isHouseBuilding(building) {
  return (
    !!building &&
    !building.ruined &&
    ['SLEEP_HOUSE', 'INK_HOUSE', 'CRAFT_HOUSE', 'COIN_GENERATOR'].includes(building.buildingType)
  );
}

/** Nearest unfinished ruin to the gate (then the next nearest as houses complete). */
export function nextGuideRuin(buildings, fromTile = GATE_SPAWN_TILE) {
  const ruins = (buildings || []).filter((b) => b.ruined && b.buildingType !== 'MAKEUP_HOUSE');
  if (!ruins.length) return null;
  const fx = fromTile.column ?? fromTile.x ?? GATE_SPAWN_TILE.column;
  const fy = fromTile.row ?? fromTile.y ?? GATE_SPAWN_TILE.row;
  return [...ruins].sort((a, b) => {
    const da = Math.hypot(a.xPos + (a.footprintWidth || 3) / 2 - fx, a.yPos + (a.footprintHeight || 3) / 2 - fy);
    const db = Math.hypot(b.xPos + (b.footprintWidth || 3) / 2 - fx, b.yPos + (b.footprintHeight || 3) / 2 - fy);
    return da - db;
  })[0];
}
