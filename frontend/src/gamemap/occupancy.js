import { MAP_COLS, MAP_ROWS, LARGE_MAP, SEARCHLIGHT_TILE, GATE_SPAWN_TILE } from './mapConfig.js';
import { inSearchlightPlaza } from './placeUtils.js';

export function tileKey(column, row) {
  return `${column},${row}`;
}

/** True if a prop should avoid this cell when scattering decor. */
export function isDecorBannedTile(column, row, buildings = []) {
  if (column <= 0 || row <= 0 || column >= MAP_COLS - 1 || row >= MAP_ROWS - 1) return true;
  if (inSearchlightPlaza(column, row, 1, 1)) return true;
  if (Math.abs(column - GATE_SPAWN_TILE.column) <= 2 && row >= MAP_ROWS - 3) return true;
  return buildings.some((b) => {
    if (!b || b.buildingType === 'MAKEUP_HOUSE') return false;
    // Decor can sit around ruins; keep clear of repaired houses only
    if (b.ruined) return false;
    const w = b.footprintWidth || 2;
    const h = b.footprintHeight || 2;
    return column >= b.xPos && column < b.xPos + w && row >= b.yPos && row < b.yPos + h;
  });
}

function markBuildingFootprints(solids, buildings = []) {
  buildings.forEach((b) => {
    if (!b || b.buildingType === 'MAKEUP_HOUSE') return;
    // Ruins are walkable rubble — stand on them and press F to repair
    if (b.ruined) return;
    const w = b.footprintWidth || 2;
    const h = b.footprintHeight || 2;
    for (let x = b.xPos; x < b.xPos + w; x++) {
      for (let y = b.yPos; y < b.yPos + h; y++) {
        if (x >= 0 && y >= 0 && x < MAP_COLS && y < MAP_ROWS) {
          solids.add(tileKey(x, y));
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

/**
 * Solid tiles the character cannot enter — buildings, searchlight, world props.
 * Perimeter / gate stay walkable for escape routes.
 */
export function collectSolidTiles({
  buildings = [],
  decorTiles = null,
  includeSearchlight = true,
} = {}) {
  const solids = new Set();
  markBuildingFootprints(solids, buildings);
  if (includeSearchlight) markSearchlight(solids);
  if (decorTiles) {
    decorTiles.forEach((key) => solids.add(key));
  }
  solids.delete(tileKey(GATE_SPAWN_TILE.column, GATE_SPAWN_TILE.row));
  return solids;
}

export function isTileSolid(column, row, solids) {
  if (column < 0 || row < 0 || column >= MAP_COLS || row >= MAP_ROWS) return true;
  return solids.has(tileKey(column, row));
}

export function canEnterTile(column, row, solids) {
  return !isTileSolid(column, row, solids);
}

export default collectSolidTiles;
