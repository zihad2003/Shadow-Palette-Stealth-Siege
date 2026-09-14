import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { hexForColor } from '../colors.js';
import {
  TILE_SIZE,
  TILE_HEIGHT,
  TILE_RADIUS,
  TILE_HOVER_LIFT,
  TILE_HOVER_SCALE,
  MAP_COLORS,
  RAID_COLORS,
} from './mapConfig.js';

function paletteFor(tile) {
  return tile.userData.grayscale ? RAID_COLORS : MAP_COLORS;
}

let sharedGeometry = null;
function getTileGeometry() {
  if (!sharedGeometry) {
    sharedGeometry = new RoundedBoxGeometry(TILE_SIZE, TILE_HEIGHT, TILE_SIZE, 3, TILE_RADIUS);
  }
  return sharedGeometry;
}

function jitter(row, column, salt) {
  const s = Math.sin(row * 137.1 + column * 91.7 + salt * 53.3) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

function easePaint(t) {
  return t * t * (3 - 2 * t);
}

/** Paintable clay tile. `realColor` is the gameplay key (RED / null).
 * Raid tiles stay gray until the searchlight cone hits them, then the paint shows.
 */
export function createTile(row, column, grayscale = false) {
  const palette = grayscale ? RAID_COLORS : MAP_COLORS;
  const material = new THREE.MeshStandardMaterial({
    color: palette.tileNeutral,
    roughness: 0.72,
    metalness: 0.02,
  });

  const tile = new THREE.Mesh(getTileGeometry(), material);
  tile.castShadow = false; // large grids stay performant; walls/buildings still cast
  tile.receiveShadow = true;
  tile.rotation.y = jitter(row, column, 1) * 0.012;
  tile.userData = {
    isTile: true,
    row,
    column,
    tileId: `tile_${column}_${row}`,
    painted: false,
    color: null,
    realColor: null,
    grayscale,
    baseY: TILE_HEIGHT / 2 + jitter(row, column, 2) * 0.01,
    hoverLift: 0,
    hoverTarget: 0,
    hoverScale: 1,
    scaleTarget: 1,
    press: 0,
    paintT: 1,
    paintFrom: null,
    paintTo: null,
  };
  tile.position.y = tile.userData.baseY;
  return tile;
}

export function paintTile(tile, colorKey) {
  const key = colorKey ? String(colorKey).toUpperCase() : null;
  const hex = hexForColor(key);
  tile.userData.painted = !!hex;
  tile.userData.color = hex ? key : null;
  tile.userData.realColor = hex ? key : null;

  if (tile.userData.grayscale || !hex) {
    tile.material.color.set(paletteFor(tile).tileNeutral);
    tile.userData.paintT = 1;
    return;
  }

  tile.userData.paintFrom = tile.material.color.clone();
  tile.userData.paintTo = new THREE.Color(hex);
  tile.userData.paintT = 0;
  tile.userData.paintBurst = 1;
}

function applyRevealLook(tile, hex, strength) {
  const mat = tile.material;
  if (!mat) return;
  const lit = new THREE.Color(hex);
  mat.color.copy(lit);
  if (mat.emissive) {
    mat.emissive.copy(lit);
    mat.emissiveIntensity = 0.35 + strength * 0.7;
  }
  tile.userData.keepColor = true;
}

export function revealTileColor(tile, reveal) {
  const ud = tile.userData;
  if (!ud.grayscale) return;
  const hex = ud.realColor ? hexForColor(ud.realColor) : null;

  if (reveal) {
    ud.inBeam = true;
    if (hex) {
      if (!ud.revealed) {
        ud.revealed = true;
        ud.paintT = 1;
        ud.revealPulse = 1;
      }
      applyRevealLook(tile, hex, 1);
    } else if (!ud.beamKiss) {
      ud.beamKiss = true;
      if (tile.material.emissive) {
        tile.material.emissive.set('#FFE08A');
        tile.material.emissiveIntensity = 0.22;
      }
    }
    return;
  }

  if (ud.revealed || ud.beamKiss || ud.inBeam) {
    ud.revealed = false;
    ud.beamKiss = false;
    ud.inBeam = false;
    ud.keepColor = false;
    ud.paintFrom = tile.material.color.clone();
    ud.paintTo = new THREE.Color(paletteFor(tile).tileNeutral);
    ud.paintT = 0;
    if (tile.material.emissive) {
      tile.material.emissive.set('#000000');
      tile.material.emissiveIntensity = 0;
    }
  }
}

export function clearTile(tile) {
  tile.userData.painted = false;
  tile.userData.color = null;
  tile.userData.realColor = null;
  tile.userData.revealed = false;
  tile.userData.paintFrom = tile.material.color.clone();
  tile.userData.paintTo = new THREE.Color(paletteFor(tile).tileNeutral);
  tile.userData.paintT = tile.userData.grayscale ? 1 : 0;
  if (tile.userData.grayscale) {
    tile.material.color.set(paletteFor(tile).tileNeutral);
    if (tile.material.emissive) {
      tile.material.emissive.set('#000000');
      tile.material.emissiveIntensity = 0;
    }
  }
}

export function setTileHover(tile, hovered) {
  tile.userData.hoverTarget = hovered ? TILE_HOVER_LIFT : 0;
  tile.userData.scaleTarget = hovered ? TILE_HOVER_SCALE : 1;
  if (tile.userData.grayscale || tile.userData.painted || tile.userData.paintT < 1) return;
  const palette = paletteFor(tile);
  tile.material.color.set(hovered ? palette.tileHover : palette.tileNeutral);
}

export function pulseTile(tile) {
  tile.userData.press = 1;
  tile.userData.paintBurst = Math.max(tile.userData.paintBurst || 0, 0.85);
}

export function tickTile(tile) {
  const ud = tile.userData;
  const animating =
    (ud.paintTo && ud.paintT < 1) || ud.hoverLift || ud.press || ud.paintBurst || ud.revealPulse || ud.revealed;
  if (!animating && ud.paintT >= 1 && !ud.hoverTarget && !ud.press && !ud.inBeam) {
    // Skip math when idle — critical on large grids
    if (Math.abs(ud.hoverLift) < 0.0001 && Math.abs(ud.hoverScale - 1) < 0.0001) return;
  }
  if (ud.paintTo && ud.paintT < 1) {
    ud.paintT = Math.min(1, ud.paintT + (ud.revealed ? 0.28 : 0.11));
    if (ud.paintFrom) {
      tile.material.color.copy(ud.paintFrom).lerp(ud.paintTo, easePaint(ud.paintT));
    }
    if (ud.revealed && ud.realColor) {
      const hex = hexForColor(ud.realColor);
      if (hex && tile.material.emissive) {
        tile.material.emissive.set(hex);
        tile.material.emissiveIntensity = 0.35 + ud.paintT * 0.7;
      }
    }
  }
  if (ud.revealPulse) ud.revealPulse *= 0.82;
  ud.hoverLift += (ud.hoverTarget - ud.hoverLift) * 0.22;
  ud.hoverScale += (ud.scaleTarget - ud.hoverScale) * 0.22;
  ud.press *= 0.78;
  if (ud.paintBurst) ud.paintBurst *= 0.88;
  const burst = (ud.paintBurst || 0) + (ud.revealPulse || 0) * 0.55;
  const squash = 1 - ud.press * 0.14 + burst * 0.12;
  tile.position.y = ud.baseY + ud.hoverLift + burst * 0.08;
  tile.scale.set(ud.hoverScale * (1 + burst * 0.08), squash, ud.hoverScale * (1 + burst * 0.08));
}
