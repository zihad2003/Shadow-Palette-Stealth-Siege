import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GRID_WIDTH, GRID_DEPTH, MAP_COLORS } from './mapConfig.js';

const SLAB_MARGIN = 1.5; // slab extends under the border walls
export const SLAB_HALF_W = GRID_WIDTH / 2 + SLAB_MARGIN;
export const SLAB_HALF_D = GRID_DEPTH / 2 + SLAB_MARGIN;

/**
 * The clay board the tiles sit on — a thick rounded plinth that lifts the
 * whole fortress above the purple terrain like a physical game board.
 */
export function createMapGround() {
  const slab = new THREE.Mesh(
    new RoundedBoxGeometry(SLAB_HALF_W * 2, 0.72, SLAB_HALF_D * 2, 3, 0.2),
    new THREE.MeshStandardMaterial({ color: MAP_COLORS.boardSlab, roughness: 0.8, metalness: 0.02 })
  );
  slab.name = 'MapGround';
  slab.position.y = -0.36;
  slab.receiveShadow = true;
  slab.castShadow = true;
  return slab;
}
