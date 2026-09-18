import { MAP_COLS, MAP_ROWS, LARGE_MAP, SEARCHLIGHT_TILE, GATE_SPAWN_TILE } from './mapConfig.js';
import { inSearchlightPlaza } from './placeUtils.js';

export const GARAGE_SIZE = 4;
export const GATE_HALF_TILES = 2;

export function tileKey(column, row) {
  return `${column},${row}`;
}

export function garageOrigin() {
  return {
    column: Math.floor(SEARCHLIGHT_TILE.column) - 1,
    row: Math.floor(SEARCHLIGHT_TILE.row) + 5,
  };
}

export function isGarageCell(column, row) {
  const g = garageOrigin();
  return (
    column >= g.column &&
    column < g.column + GARAGE_SIZE &&
    row >= g.row &&
    row < g.row + GARAGE_SIZE
  );
}

/** South gate opening — walkable so you can enter and climb out. */
export function isGateTile(column, row) {
  const gc = Math.floor(GATE_SPAWN_TILE.column);
  return row >= MAP_ROWS - 2 && Math.abs(column - gc) <= GATE_HALF_TILES;
}

/** Outer brick ring, excluding the gate. */
export function isWallTile(column, row) {
  if (isGateTile(column, row)) return false;
  return column <= 0 || row <= 0 || column >= MAP_COLS - 1 || row >= MAP_ROWS - 1;
}

/** Inner tile touching the wall — stand here to smash bricks after alarm. */
export function isWallBreakSpot(column, row) {
  if (isGateTile(column, row) || isWallTile(column, row)) return false;
  return column === 1 || row === 1 || column === MAP_COLS - 2 || row === MAP_ROWS - 2;
}

function buildingFootprint(b) {
  return {
    x: Math.round(Number(b.xPos) || 0),
    y: Math.round(Number(b.yPos) || 0),
    w: Math.max(1, Math.round(Number(b.footprintWidth) || 3)),
    h: Math.max(1, Math.round(Number(b.footprintHeight) || 3)),
  };
}

export function buildingCoversTile(b, column, row) {
  if (!b || b.buildingType === 'MAKEUP_HOUSE') return false;
  const { x, y, w, h } = buildingFootprint(b);
  return column >= x && column < x + w && row >= y && row < y + h;
}

/** True if a prop should avoid this cell when scattering decor. */
export function isDecorBannedTile(column, row, buildings = []) {
  if (column <= 1 || row <= 1 || column >= MAP_COLS - 2 || row >= MAP_ROWS - 2) return true;
  if (inSearchlightPlaza(column, row, 1, 1)) return true;
  if (isGateTile(column, row)) return true;
  if (isGarageCell(column, row)) return true;
  return buildings.some((b) => !b.ruined && buildingCoversTile(b, column, row));
}

/** Bans that never change with houses — keeps decor placement/collision in sync. */
export function isStaticDecorBanned(column, row) {
  return isDecorBannedTile(column, row, []);
}

function markBuildingFootprints(solids, buildings = []) {
  buildings.forEach((b) => {
    if (!b || b.buildingType === 'MAKEUP_HOUSE') return;
    if (b.ruined) return;
    const { x, y, w, h } = buildingFootprint(b);
    for (let cx = x; cx < x + w; cx++) {
      for (let cy = y; cy < y + h; cy++) {
        if (cx >= 0 && cy >= 0 && cx < MAP_COLS && cy < MAP_ROWS) {
          solids.add(tileKey(cx, cy));
        }
      }
    }
  });
}

function markSearchlight(solids) {
  const cx = Math.floor(SEARCHLIGHT_TILE.column);
  const cy = Math.floor(SEARCHLIGHT_TILE.row);
  const r = LARGE_MAP ? 2 : 1;
  for (let x = cx - r; x <= cx + r; x++) {
    for (let y = cy - r; y <= cy + r; y++) {
      if (x >= 0 && y >= 0 && x < MAP_COLS && y < MAP_ROWS) {
        solids.add(tileKey(x, y));
      }
    }
  }
}

function markPerimeterWalls(solids, { gateLocked = false } = {}) {
  for (let c = 0; c < MAP_COLS; c++) {
    for (const r of [0, MAP_ROWS - 1]) {
      if (!gateLocked && isGateTile(c, r)) continue;
      solids.add(tileKey(c, r));
    }
  }
  for (let r = 1; r < MAP_ROWS - 1; r++) {
    solids.add(tileKey(0, r));
    solids.add(tileKey(MAP_COLS - 1, r));
  }
  [
    [1, 1],
    [1, MAP_ROWS - 2],
    [MAP_COLS - 2, 1],
    [MAP_COLS - 2, MAP_ROWS - 2],
  ].forEach(([c, r]) => {
    if (!isGateTile(c, r)) solids.add(tileKey(c, r));
  });
}

function markGaragePad(solids) {
  const g = garageOrigin();
  for (let dx = 0; dx < GARAGE_SIZE; dx++) {
    for (let dy = 0; dy < GARAGE_SIZE; dy++) {
      solids.add(tileKey(g.column + dx, g.row + dy));
    }
  }
}

function markMakeupHouse(solids) {
  for (let c = 0; c <= 2; c++) {
    for (let r = MAP_ROWS - 3; r <= MAP_ROWS - 1; r++) {
      if (isGateTile(c, r)) continue;
      solids.add(tileKey(c, r));
    }
  }
}

/**
 * Solid tiles the character cannot enter — walls, houses, props, parked buggy.
 * Gate stays open unless `gateLocked`. Ruins stay walkable for rebuild.
 */
export function collectSolidTiles({
  buildings = [],
  decorTiles = null,
  includeSearchlight = true,
  includePerimeter = true,
  includeMakeupHouse = true,
  blockGarage = false,
  gateLocked = false,
} = {}) {
  const solids = new Set();
  markBuildingFootprints(solids, buildings);
  if (includeSearchlight) markSearchlight(solids);
  if (includePerimeter) markPerimeterWalls(solids, { gateLocked });
  if (includeMakeupHouse) markMakeupHouse(solids);
  if (blockGarage) markGaragePad(solids);
  if (decorTiles) {
    decorTiles.forEach((key) => solids.add(key));
  }
  if (!gateLocked) {
    solids.delete(tileKey(GATE_SPAWN_TILE.column, GATE_SPAWN_TILE.row));
    const gc = Math.floor(GATE_SPAWN_TILE.column);
    for (let c = gc - GATE_HALF_TILES; c <= gc + GATE_HALF_TILES; c++) {
      solids.delete(tileKey(c, MAP_ROWS - 1));
      solids.delete(tileKey(c, MAP_ROWS - 2));
    }
  }
  return solids;
}

export function isTileSolid(column, row, solids) {
  const c = Math.round(column);
  const r = Math.round(row);
  if (c < 0 || r < 0 || c >= MAP_COLS || r >= MAP_ROWS) return true;
  return solids.has(tileKey(c, r));
}

export function canEnterTile(column, row, solids) {
  return !isTileSolid(column, row, solids);
}

export default collectSolidTiles;
