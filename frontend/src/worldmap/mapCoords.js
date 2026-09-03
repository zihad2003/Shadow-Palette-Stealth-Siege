import { MAP_DIMENSIONS } from '../data/plotCoordinates.js';

export const WORLD_WIDTH = 22;

export function mapToWorld(x, y) {
  return {
    x: (x / MAP_DIMENSIONS.width - 0.5) * WORLD_WIDTH,
    z: (y / MAP_DIMENSIONS.height - 0.5) * WORLD_WIDTH,
  };
}

export function parsePlotPoints(pointsStr) {
  return pointsStr.split(/\s+/).filter(Boolean).map((pair) => {
    const [x, y] = pair.split(',').map(Number);
    return mapToWorld(x, y);
  });
}
