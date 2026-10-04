import { MAP_COLS, MAP_ROWS, GATE_SPAWN_TILE } from './mapConfig.js';

/** Pre-placed broken houses on a fresh 48×40 fortress — walk up and repair. */
export const REPAIR_BUILDING_COST = { coins: 80, ink: 12 };
export const STARTER_HOUSE_COUNT = 6;

/** North yard, clear of the corner houses and the lighthouse plaza. */
export const MAKEUP_RUIN_SLOT = { xPos: 22, yPos: 8 };
export const REBUILD_SECONDS = 2;

export function houseLabel(type) {
  if (type === 'JAIL' || type === 'BASE_JAIL') return 'Base Jail (Holding Cell)';
  return String(type || 'HOUSE').replace(/_/g, ' ');
}

export function createStarterRuins() {
  const slots = [
    { buildingType: 'SLEEP_HOUSE', xPos: 3, yPos: 3 },
    { buildingType: 'INK_HOUSE', xPos: MAP_COLS - 5, yPos: 3 },
    { buildingType: 'CRAFT_HOUSE', xPos: 3, yPos: MAP_ROWS - 5 },
    { buildingType: 'COIN_GENERATOR', xPos: MAP_COLS - 5, yPos: MAP_ROWS - 5 },
    { buildingType: 'JAIL', xPos: Math.floor(MAP_COLS * 0.35), yPos: Math.floor(MAP_ROWS * 0.4) },
    { buildingType: 'MAKEUP_HOUSE', xPos: MAKEUP_RUIN_SLOT.xPos, yPos: MAKEUP_RUIN_SLOT.yPos },
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

/** Old saves predate this house — drop a ruined copy in the north yard. */
export function ensureMakeupRuin(list) {
  const buildings = Array.isArray(list) ? [...list] : [];
  if (buildings.some((b) => b?.buildingType === 'MAKEUP_HOUSE')) return buildings;
  const id = Math.max(0, ...buildings.map((b) => Number(b?.id) || 0)) + 1;
  buildings.push({
    id,
    buildingType: 'MAKEUP_HOUSE',
    xPos: MAKEUP_RUIN_SLOT.xPos,
    yPos: MAKEUP_RUIN_SLOT.yPos,
    footprintWidth: 3,
    footprintHeight: 3,
    hexColor: '#9A958C',
    level: 1,
    ruined: true,
  });
  return buildings;
}

const MAX_HOUSE_COLORS = [
  { hexColor: '#536DDE', colorKey: 'BLUE' },
  { hexColor: '#72B83F', colorKey: 'GREEN' },
  { hexColor: '#E5B93D', colorKey: 'YELLOW' },
  { hexColor: '#E74C3C', colorKey: 'RED' },
  { hexColor: '#8D5CC7', colorKey: 'PURPLE' },
  { hexColor: '#536DDE', colorKey: 'BLUE' },
];

/**
 * 5-Color Technique generator for player and bot bases.
 * Allocates 5 colors in distinct 10-tile strategic patches per base technique.
 */
export function generate5ColorTechniqueTiles(seed = 1) {
  const paintedTiles = {};
  const technique = Math.abs(Number(seed) || 1) % 5;

  if (technique === 0) {
    // Technique: Sector Hub (Central core + 4 quadrant zones of 10 tiles each)
    const centers = [
      { color: 'RED', cx: 12, cy: 10 },
      { color: 'GREEN', cx: 34, cy: 10 },
      { color: 'BLUE', cx: 12, cy: 28 },
      { color: 'YELLOW', cx: 34, cy: 28 },
      { color: 'PURPLE', cx: 23, cy: 19 },
    ];
    centers.forEach(({ color, cx, cy }) => {
      let count = 0;
      for (let dx = -2; dx <= 2 && count < 10; dx++) {
        for (let dy = -2; dy <= 2 && count < 10; dy++) {
          if (Math.abs(dx) + Math.abs(dy) <= 3) {
            paintedTiles[`${cx + dx},${cy + dy}`] = color;
            count++;
          }
        }
      }
    });
  } else if (technique === 1) {
    // Technique: Building Sanctuaries (10-tile tactical clusters defending key houses)
    const centers = [
      { color: 'YELLOW', cx: 34, cy: 28 }, // Coin Vault sanctuary
      { color: 'PURPLE', cx: 19, cy: 18 }, // Base Jail holding cell
      { color: 'BLUE', cx: 34, cy: 8 },   // Ink House generator
      { color: 'GREEN', cx: 8, cy: 8 },    // Sleep House quarters
      { color: 'RED', cx: 8, cy: 28 },     // Craft Workshop
    ];
    centers.forEach(({ color, cx, cy }) => {
      let count = 0;
      for (let dx = -2; dx <= 2 && count < 10; dx++) {
        for (let dy = -2; dy <= 2 && count < 10; dy++) {
          paintedTiles[`${cx + dx},${cy + dy}`] = color;
          count++;
        }
      }
    });
  } else if (technique === 2) {
    // Technique: Strategic Corridors (Linear 10-tile stealth runways)
    const strips = [
      { color: 'RED', startX: 10, startY: 12, dx: 1, dy: 0 },
      { color: 'GREEN', startX: 28, startY: 12, dx: 1, dy: 0 },
      { color: 'BLUE', startX: 10, startY: 26, dx: 1, dy: 0 },
      { color: 'YELLOW', startX: 28, startY: 26, dx: 1, dy: 0 },
      { color: 'PURPLE', startX: 19, startY: 19, dx: 1, dy: 0 },
    ];
    strips.forEach(({ color, startX, startY, dx, dy }) => {
      for (let i = 0; i < 10; i++) {
        paintedTiles[`${startX + i * dx},${startY + i * dy}`] = color;
      }
    });
  } else if (technique === 3) {
    // Technique: Fortified Rings (Concentric defensive perimeter bands)
    const rings = [
      { color: 'RED', points: [[14,14],[15,14],[16,14],[17,14],[18,14],[14,15],[18,15],[14,16],[18,16],[14,17]] },
      { color: 'GREEN', points: [[30,14],[31,14],[32,14],[33,14],[34,14],[30,15],[34,15],[30,16],[34,16],[30,17]] },
      { color: 'BLUE', points: [[14,24],[15,24],[16,24],[17,24],[18,24],[14,25],[18,25],[14,26],[18,26],[14,27]] },
      { color: 'YELLOW', points: [[30,24],[31,24],[32,24],[33,24],[34,24],[30,25],[34,25],[30,26],[34,26],[30,27]] },
      { color: 'PURPLE', points: [[20,18],[21,18],[22,18],[23,18],[24,18],[20,20],[21,20],[22,20],[23,20],[24,20]] },
    ];
    rings.forEach(({ color, points }) => {
      points.forEach(([x, y]) => {
        paintedTiles[`${x},${y}`] = color;
      });
    });
  } else {
    // Technique: Tactical Staggered Clusters (Checkerboard islands of 10 tiles)
    const islands = [
      { color: 'RED', cx: 14, cy: 11 },
      { color: 'GREEN', cx: 28, cy: 11 },
      { color: 'BLUE', cx: 21, cy: 20 },
      { color: 'YELLOW', cx: 14, cy: 28 },
      { color: 'PURPLE', cx: 28, cy: 28 },
    ];
    islands.forEach(({ color, cx, cy }) => {
      let count = 0;
      for (let dx = -2; dx <= 2 && count < 10; dx++) {
        for (let dy = -2; dy <= 2 && count < 10; dy++) {
          paintedTiles[`${cx + dx},${cy + dy}`] = color;
          count++;
        }
      }
    });
  }

  return paintedTiles;
}

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
  const paintedTiles = generate5ColorTechniqueTiles(1);
  return {
    coins: 50000,
    inkEnergy: 100,
    chips: 8000,
    buildings,
    paintedTiles,
    defenses: [
      { id: 101, type: 'PATROL_ROBOT', defenseType: 'PATROL_ROBOT', xPos: 20, yPos: 18 },
    ],
    patrolOn: true,
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
    buildings.find((b) => !b.ruined && buildingCoversTile(b, column, row)) || null
  );
}

/** Stand beside a repaired house. Closest footprint wins when two houses are adjacent. */
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
  let best = null;
  let bestDist = Infinity;
  const seen = new Set();
  for (const [dx, dy] of neighbors) {
    const hit = findRepairedAt(buildings, column + dx, row + dy);
    if (!hit || seen.has(hit.id)) continue;
    seen.add(hit.id);
    const cx = hit.xPos + ((hit.footprintWidth || 3) - 1) / 2;
    const cy = hit.yPos + ((hit.footprintHeight || 3) - 1) / 2;
    const dist = Math.hypot(column - cx, row - cy);
    if (dist < bestDist) {
      best = hit;
      bestDist = dist;
    }
  }
  return best;
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

export function isHouseBuilding(building) {
  return (
    !!building &&
    !building.ruined &&
    ['SLEEP_HOUSE', 'INK_HOUSE', 'CRAFT_HOUSE', 'COIN_GENERATOR'].includes(building.buildingType)
  );
}

/** Nearest unfinished ruin to the gate (then the next nearest as houses complete). */
export function nextGuideRuin(buildings, fromTile = GATE_SPAWN_TILE) {
  const ruins = (buildings || []).filter((b) => b.ruined);
  if (!ruins.length) return null;
  const fx = fromTile.column ?? fromTile.x ?? GATE_SPAWN_TILE.column;
  const fy = fromTile.row ?? fromTile.y ?? GATE_SPAWN_TILE.row;
  const center = (b) => ({
    x: b.xPos + ((b.footprintWidth || 3) - 1) / 2,
    y: b.yPos + ((b.footprintHeight || 3) - 1) / 2,
  });
  return [...ruins].sort((a, b) => {
    const ca = center(a);
    const cb = center(b);
    return Math.hypot(ca.x - fx, ca.y - fy) - Math.hypot(cb.x - fx, cb.y - fy);
  })[0];
}
