import { MAP_COLS, MAP_ROWS } from '../gamemap/mapConfig.js';
import { canEnterTile } from '../gamemap/occupancy.js';

/** Turn speed in radians/second when steering with A/D. */
export const TURN_RATE = 2.45;

/**
 * Quantize camera-relative input into an 8-way tile step.
 * Facing (yaw) maps to the world direction (sin yaw, cos yaw); right is (-cos yaw, sin yaw).
 * @returns {{ dCol: number, dRow: number } | null}
 */
export function stepDirection(yaw, forward, strafe) {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const vx = fx * forward - fz * strafe;
  const vz = fz * forward + fx * strafe;
  const len = Math.hypot(vx, vz);
  if (len < 1e-3) return null;
  const nx = vx / len;
  const nz = vz / len;
  // ~22.5° sectors: axis when dominant, diagonal in between
  const dCol = Math.abs(nx) > 0.383 ? Math.sign(nx) : 0;
  const dRow = Math.abs(nz) > 0.383 ? Math.sign(nz) : 0;
  if (!dCol && !dRow) return null;
  return { dCol, dRow };
}

const clampCol = (c) => Math.max(0, Math.min(MAP_COLS - 1, c));
const clampRow = (r) => Math.max(0, Math.min(MAP_ROWS - 1, r));

const ESCAPE_DIRS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

function roundPos(pos) {
  return { column: Math.round(pos.column), row: Math.round(pos.row) };
}

/** If a house/prop spawned on the player, step onto the nearest open tile. */
export function nudgeOffSolid(pos, solids) {
  const here = roundPos(pos);
  if (canEnterTile(here.column, here.row, solids)) return null;
  for (const [dCol, dRow] of ESCAPE_DIRS) {
    const column = clampCol(here.column + dCol);
    const row = clampRow(here.row + dRow);
    if (column === here.column && row === here.row) continue;
    if (!canEnterTile(column, row, solids)) continue;
    if (dCol && dRow) {
      const sideA = canEnterTile(column, here.row, solids);
      const sideB = canEnterTile(here.column, row, solids);
      if (!sideA && !sideB) continue;
      if (sideA && !sideB) return { ok: true, column, row: here.row, diagonal: false };
      if (sideB && !sideA) return { ok: true, column: here.column, row, diagonal: false };
    }
    return { ok: true, column, row, diagonal: !!(dCol && dRow) };
  }
  return null;
}

/**
 * Resolve a step against solids. Diagonals never cut corners; when a diagonal is
 * blocked the mover slides along whichever axis is open.
 * @returns {{ ok: boolean, blocked?: boolean, column?: number, row?: number, diagonal?: boolean }}
 */
export function attemptStep(pos, dir, solids) {
  const here = roundPos(pos);
  if (!canEnterTile(here.column, here.row, solids)) {
    if (dir) {
      const prefer = attemptStepFrom(here, dir, solids);
      if (prefer.ok) return prefer;
    }
    return nudgeOffSolid(here, solids) || { ok: false, blocked: true };
  }
  return attemptStepFrom(here, dir, solids);
}

function attemptStepFrom(pos, dir, solids) {
  if (!dir) return { ok: false };
  const column = clampCol(pos.column + dir.dCol);
  const row = clampRow(pos.row + dir.dRow);
  if (column === pos.column && row === pos.row) return { ok: false };

  const diagonal = column !== pos.column && row !== pos.row;
  if (!diagonal) {
    if (!canEnterTile(column, row, solids)) return { ok: false, blocked: true };
    return { ok: true, column, row, diagonal: false };
  }

  const sideA = canEnterTile(column, pos.row, solids);
  const sideB = canEnterTile(pos.column, row, solids);
  if (sideA && sideB && canEnterTile(column, row, solids)) {
    return { ok: true, column, row, diagonal: true };
  }
  if (sideA) return { ok: true, column, row: pos.row, diagonal: false };
  if (sideB) return { ok: true, column: pos.column, row, diagonal: false };
  return { ok: false, blocked: true };
}
