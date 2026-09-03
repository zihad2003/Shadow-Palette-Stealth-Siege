import * as THREE from 'three';
import { createTile } from './Tile.js';
import { MAP_ROWS, MAP_COLS, TILE_PITCH, TILE_SIZE, GRID_WIDTH, GRID_DEPTH } from './mapConfig.js';

/**
 * The playable grid: MAP_ROWS x MAP_COLS independent tiles, centered on the
 * origin. Tiles are NOT merged — every one is raycastable and paintable.
 */
export function createTileGrid(grayscale = false) {
  const group = new THREE.Group();
  group.name = 'TileGrid';

  const tiles = [];
  const byId = new Map();

  for (let row = 0; row < MAP_ROWS; row++) {
    for (let column = 0; column < MAP_COLS; column++) {
      const tile = createTile(row, column, grayscale);
      tile.position.x = -GRID_WIDTH / 2 + TILE_SIZE / 2 + column * TILE_PITCH;
      tile.position.z = -GRID_DEPTH / 2 + TILE_SIZE / 2 + row * TILE_PITCH;
      group.add(tile);
      tiles.push(tile);
      byId.set(tile.userData.tileId, tile);
    }
  }

  return {
    group,
    tiles, // flat array for raycaster.intersectObjects(tiles)
    getTile(row, column) {
      return byId.get(`tile-${row}-${column}`) || null;
    },
    dispose() {
      tiles.forEach((tile) => tile.material.dispose());
      if (tiles[0]) tiles[0].geometry.dispose(); // shared geometry
    },
  };
}
