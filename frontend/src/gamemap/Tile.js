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

/**
 * Paintable clay tile. `realColor` is the gameplay key (RED / null).
 * Raid visuals stay neutral gray and never read this key.
 */
export function createTile(row, column, grayscale = false) {
  const palette = grayscale ? RAID_COLORS : MAP_COLORS;
  const material = new THREE.MeshStandardMaterial({
    color: palette.tileNeutral,
    roughness: 0.72,
    metalness: 0.02,
  });

  const tile = new THREE.Mesh(getTileGeometry(), material);
  tile.castShadow = true;
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
}

export function clearTile(tile) {
  tile.userData.painted = false;
  tile.userData.color = null;
  tile.userData.realColor = null;
  tile.userData.paintFrom = tile.material.color.clone();
  tile.userData.paintTo = new THREE.Color(paletteFor(tile).tileNeutral);
  tile.userData.paintT = tile.userData.grayscale ? 1 : 0;
  if (tile.userData.grayscale) tile.material.color.set(paletteFor(tile).tileNeutral);
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
}

export function tickTile(tile) {
  const ud = tile.userData;
  if (ud.paintTo && ud.paintT < 1) {
    ud.paintT = Math.min(1, ud.paintT + 0.09);
    if (ud.paintFrom) {
      tile.material.color.copy(ud.paintFrom).lerp(ud.paintTo, easePaint(ud.paintT));
    }
  }
  ud.hoverLift += (ud.hoverTarget - ud.hoverLift) * 0.22;
  ud.hoverScale += (ud.scaleTarget - ud.hoverScale) * 0.22;
  ud.press *= 0.78;
  const squash = 1 - ud.press * 0.14;
  tile.position.y = ud.baseY + ud.hoverLift;
  tile.scale.set(ud.hoverScale, squash, ud.hoverScale);
}
