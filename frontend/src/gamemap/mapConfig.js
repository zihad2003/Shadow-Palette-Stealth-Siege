// ─── Blank base map configuration ────────────────────────────────────────
// The playable grid is deliberately easy to resize: change ROWS/COLS and
// everything (board slab, border, camera framing) follows.

/** 4× the original 12×10 fortress (48×40). */
export const MAP_ROWS = 40;
export const MAP_COLS = 48;

export const TILE_SIZE = 1.15; // world units per tile — big paver look
export const TILE_GAP = 0.08; // seams so each slab reads as a separate clay piece
export const TILE_HEIGHT = 0.38; // thick enough that sides show at 3/4 camera
export const TILE_RADIUS = 0.1; // rounded corners + bevel
export const TILE_HOVER_LIFT = 0.03;
export const TILE_HOVER_SCALE = 1.02;

export const TILE_PITCH = TILE_SIZE + TILE_GAP;
export const GRID_WIDTH = MAP_COLS * TILE_PITCH - TILE_GAP; // world width (x)
export const GRID_DEPTH = MAP_ROWS * TILE_PITCH - TILE_GAP; // world depth (z)
export const MAP_TILE_COUNT = MAP_COLS * MAP_ROWS;
export const LARGE_MAP = MAP_TILE_COUNT > 400;

// Palette matched to the clay-board reference: cream pavers, grey stone wall,
// warm lamps, deep layered purple terrain. Playable tiles stay one neutral
// cream until the USER paints them.
export const MAP_COLORS = {
  tileNeutral: '#ECE4D0', // pale warm stone — every tile starts exactly this
  tileHover: '#FAF3E1', // hover lightening only, not a paint
  boardSlab: '#B4A68C', // seam bed under the pavers
  wallStone: '#94918C', // cool grey clay bricks
  wallStoneDark: '#767370',
  wallTop: '#ABA8A3',
  towerStone: '#9C9994',
  lamp: '#FFB25A',
  banner: '#D5453C',
  bannerGold: '#F4C245',
  path: '#918A80',
  terrainL1: '#4C3E88', // lightest strata, hugging the wall
  terrainL2: '#3B2F70',
  terrainL3: '#2E2459',
  terrainBase: '#241B48',
  sky: '#1D1540',
};

/** Rec.709 luminance — raid mode drains every clay color to a gray band. */
export function toGrayHex(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const y = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const hh = y.toString(16).padStart(2, '0');
  return `#${hh}${hh}${hh}`.toUpperCase();
}

export const RAID_COLORS = Object.fromEntries(
  Object.entries(MAP_COLORS).map(([key, hex]) => [key, toGrayHex(hex)])
);

// Front-high 3/4 matching the reference art: gate at the bottom of the
// screen, board reads as a large rectangle (not a diamond).
export const CAMERA = {
  azimuthDeg: 0,
  elevationDeg: LARGE_MAP ? 44 : 52,
  fov: LARGE_MAP ? 38 : 32,
  // >1 = closer than a full-sphere fit (flat board looks tiny otherwise)
  fill: LARGE_MAP ? 1.42 : 0.92,
  zoomMin: LARGE_MAP ? 0.85 : 0.45,
  zoomMax: LARGE_MAP ? 2.6 : 2.2,
  defaultZoom: LARGE_MAP ? 1.55 : 1,
};

/** GTA-style third-person follow — character framed above bottom HUD. */
export const CHASE_CAM = {
  distance: 5.6,
  height: 2.85,
  lookAhead: 1.05,
  lookAtHeight: 0.55,
  shoulder: 0.38,
  fov: 58,
  /** Positive = looking up. */
  lookPitch: 0.0,
  /** Mouse-down limit (camera climbs, looks at the ground). */
  pitchMin: -0.55,
  /** Mouse-up limit (camera drops to shoulder height, looks at the sky). */
  pitchMax: 0.95,
  minCamHeight: 0.5,
  minDist: 3.6,
  maxDist: 7.5,
};

/** Seconds to glide from one tile center to the next (WASD). */
export const WALK_TILE_SECONDS = 0.34;

export function cameraDistance() {
  // Flat board ≠ bounding sphere: use the larger half-extent so 48×40 fills the view.
  const halfW = GRID_WIDTH / 2 + (LARGE_MAP ? 0.8 : 1.7);
  const halfD = GRID_DEPTH / 2 + (LARGE_MAP ? 1.0 : 2.2);
  const radius = LARGE_MAP ? Math.max(halfW, halfD) : Math.hypot(halfW, halfD);
  const vHalf = (CAMERA.fov * Math.PI) / 180 / 2;
  return radius / Math.sin(vHalf) / CAMERA.fill;
}

/** Fog that never swallows the playable board from the iso camera. */
export function boardFogRange() {
  const dist = cameraDistance();
  return {
    near: dist * 1.15,
    far: dist * 2.4,
  };
}

export function tileWorldPos(column, row) {
  return {
    x: -GRID_WIDTH / 2 + TILE_SIZE / 2 + column * TILE_PITCH,
    z: -GRID_DEPTH / 2 + TILE_SIZE / 2 + row * TILE_PITCH,
  };
}

export const SEARCHLIGHT_TILE = {
  column: (MAP_COLS - 1) / 2,
  row: (MAP_ROWS - 1) / 2,
};

export const GATE_SPAWN_TILE = {
  column: Math.floor(MAP_COLS / 2),
  row: MAP_ROWS - 1,
};
