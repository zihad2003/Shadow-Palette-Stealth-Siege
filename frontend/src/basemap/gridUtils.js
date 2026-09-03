// Logical base grid: 20x20 hidden cells, 1 world unit each, centered at origin.
// The player never sees this grid — it only drives paint patches and snapping.
export const GRID = 20;
export const CELL = 1;
export const HALF = GRID / 2;

// Center plaza cells reserved for the fixed lighthouse (no building placement)
export const PLAZA_MIN = 8;
export const PLAZA_MAX = 11;

export function cellToWorld(x, y) {
  return { wx: x - HALF + 0.5, wz: y - HALF + 0.5 };
}

export function worldToCell(wx, wz) {
  return { x: Math.floor(wx + HALF), y: Math.floor(wz + HALF) };
}

export function inGrid(x, y) {
  return x >= 0 && x < GRID && y >= 0 && y < GRID;
}

export function inPlaza(x, y, w = 1, h = 1) {
  return x + w - 1 >= PLAZA_MIN && x <= PLAZA_MAX && y + h - 1 >= PLAZA_MIN && y <= PLAZA_MAX;
}

export function footprintCenter(xPos, yPos, w, h) {
  return { wx: xPos + w / 2 - HALF, wz: yPos + h / 2 - HALF };
}
