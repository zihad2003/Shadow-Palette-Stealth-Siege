import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createMapGround } from './MapGround.js';
import { createTileGrid } from './TileGrid.js';
import { createFortressBorder } from './FortressBorder.js';
import { createOuterTerrain, applyMapAtmosphere } from './OuterTerrain.js';
import { paintTile, clearTile, setTileHover, pulseTile, tickTile } from './Tile.js';
import { applyGrayscaleWorld } from './applyGrayscale.js';
import { createSearchlight } from './Searchlight.js';
import { createMakeupHouse } from './MakeupHouse.js';
import { createAttacker } from '../character/buildCharacter.js';
import {
  CAMERA,
  MAP_COLORS,
  RAID_COLORS,
  TILE_SIZE,
  TILE_HEIGHT,
  MAP_COLS,
  MAP_ROWS,
  cameraDistance,
  tileWorldPos,
  SEARCHLIGHT_TILE,
} from './mapConfig.js';
import { DEFAULT_SEARCHLIGHT_LEVEL } from '../raid/stealthConstants.js';

export default function GameMap({
  onTileClick,
  onTileHover,
  onMakeupHouseClick,
  apiRef,
  grayscale = false,
  paintedTiles = {},
  showSearchlight = true,
  showMakeupHouse = false,
  searchlightLevel = DEFAULT_SEARCHLIGHT_LEVEL,
  attacker = null,
}) {
  const mountRef = useRef(null);
  const callbacksRef = useRef({});
  callbacksRef.current = { onTileClick, onTileHover, onMakeupHouseClick };
  const paintedRef = useRef(paintedTiles);
  paintedRef.current = paintedTiles;
  const attackerRef = useRef(attacker);
  attackerRef.current = attacker;
  const worldRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    applyMapAtmosphere(scene);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    mount.appendChild(canvas);

    const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.5, 240);
    const az = THREE.MathUtils.degToRad(CAMERA.azimuthDeg);
    const el = THREE.MathUtils.degToRad(CAMERA.elevationDeg);
    const dist = cameraDistance();
    const pan = { x: 0, z: 0 };

    const placeCamera = () => {
      camera.position.set(
        Math.sin(az) * Math.cos(el) * dist + pan.x,
        Math.sin(el) * dist,
        Math.cos(az) * Math.cos(el) * dist + pan.z
      );
      camera.lookAt(pan.x, 0, pan.z);
    };
    placeCamera();

    let targetZoom = CAMERA.defaultZoom;
    const frame = (width, height) => {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };

    scene.add(new THREE.HemisphereLight(grayscale ? 0xefefef : 0xfff6e8, grayscale ? 0x222222 : 0x3a2e6e, 0.82));
    const key = new THREE.DirectionalLight(grayscale ? 0xf0f0f0 : 0xfff3e0, 1.18);
    key.position.set(-14, 26, 18);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -24;
    key.shadow.camera.right = 24;
    key.shadow.camera.top = 24;
    key.shadow.camera.bottom = -24;
    key.shadow.camera.near = 6;
    key.shadow.camera.far = 80;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 5;
    scene.add(key);
    const fill = new THREE.DirectionalLight(grayscale ? 0x888888 : 0x8d7bd6, 0.22);
    fill.position.set(16, 8, -10);
    scene.add(fill);

    scene.add(createOuterTerrain());
    scene.add(createMapGround());
    const grid = createTileGrid(grayscale);
    scene.add(grid.group);
    scene.add(createFortressBorder());
    if (grayscale) applyGrayscaleWorld(scene);

    const searchlight = showSearchlight ? createSearchlight({ level: searchlightLevel }) : null;
    if (searchlight) scene.add(searchlight.object);

    const makeupHouse = showMakeupHouse && !grayscale ? createMakeupHouse() : null;
    if (makeupHouse) scene.add(makeupHouse);

    let attackerMesh = null;
    const syncAttacker = () => {
      const data = attackerRef.current;
      if (!data) {
        if (attackerMesh) attackerMesh.visible = false;
        return;
      }
      if (!attackerMesh) {
        attackerMesh = createAttacker({
          camoColor: data.camoColor,
          characterModel: data.characterModel || 1,
        });
        scene.add(attackerMesh);
      }
      attackerMesh.visible = true;
      const col = THREE.MathUtils.clamp(data.column, 0, MAP_COLS - 1);
      const row = THREE.MathUtils.clamp(data.row, 0, MAP_ROWS - 1);
      const p = tileWorldPos(col, row);
      attackerMesh.position.set(p.x, TILE_HEIGHT, p.z);
    };
    syncAttacker();

    const rimGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(TILE_SIZE * 1.02, TILE_HEIGHT * 1.08, TILE_SIZE * 1.02));
    const selectRim = new THREE.LineSegments(
      rimGeo,
      new THREE.LineBasicMaterial({ color: grayscale ? 0xdddddd : 0xf4a261, transparent: true, opacity: 0.95 })
    );
    selectRim.visible = false;
    scene.add(selectRim);

    const applyPainted = () => {
      const tiles = paintedRef.current || {};
      grid.tiles.forEach((tile) => {
        const key = tiles[`${tile.userData.column},${tile.userData.row}`] || null;
        if (key) {
          if (tile.userData.realColor !== key) {
            paintTile(tile, key);
            if (!grayscale) pulseTile(tile);
          }
        } else if (tile.userData.painted) {
          clearTile(tile);
        }
      });
    };
    applyPainted();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredTile = null;
    let selectedTile = null;
    let pointerDown = null;
    let alarm = false;

    const pick = (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      if (makeupHouse) {
        const houseHits = raycaster.intersectObject(makeupHouse, true);
        if (houseHits.length) return { type: 'makeup' };
      }
      if (grayscale) return { type: 'none' };
      const hits = raycaster.intersectObjects(grid.tiles, false);
      return hits.length ? { type: 'tile', tile: hits[0].object } : { type: 'none' };
    };

    const onPointerMove = (e) => {
      if (pointerDown) {
        const dx = e.clientX - pointerDown.x;
        const dy = e.clientY - pointerDown.y;
        if (Math.hypot(dx, dy) > 5) pointerDown.dragged = true;
        if (pointerDown.dragged) {
          pan.x -= dx * 0.012;
          pan.z -= dy * 0.012;
          pointerDown.x = e.clientX;
          pointerDown.y = e.clientY;
          placeCamera();
          return;
        }
      }
      const hit = pick(e);
      const tile = hit.type === 'tile' ? hit.tile : null;
      canvas.style.cursor = hit.type === 'makeup' || tile ? 'pointer' : pointerDown ? 'grabbing' : 'default';
      if (tile === hoveredTile) return;
      if (hoveredTile) setTileHover(hoveredTile, false);
      hoveredTile = tile;
      if (hoveredTile) setTileHover(hoveredTile, true);
      const cb = callbacksRef.current.onTileHover;
      if (cb) cb(hoveredTile ? { ...hoveredTile.userData } : null);
    };

    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      pointerDown = { x: e.clientX, y: e.clientY, dragged: false };
      canvas.style.cursor = 'grabbing';
    };

    const onPointerUp = (e) => {
      const wasDrag = pointerDown && pointerDown.dragged;
      pointerDown = null;
      canvas.style.cursor = hoveredTile ? 'pointer' : 'default';
      if (wasDrag) return;
      const hit = pick(e);
      if (hit.type === 'makeup') {
        const cb = callbacksRef.current.onMakeupHouseClick;
        if (cb) cb();
        return;
      }
      if (hit.type !== 'tile') return;
      selectedTile = hit.tile;
      selectRim.visible = true;
      selectRim.position.copy(hit.tile.position);
      pulseTile(hit.tile);
      const cb = callbacksRef.current.onTileClick;
      if (cb) cb({ ...hit.tile.userData }, hit.tile);
    };

    const onPointerLeave = () => {
      pointerDown = null;
      if (hoveredTile) setTileHover(hoveredTile, false);
      hoveredTile = null;
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);

    const clampZoom = (z) => Math.min(CAMERA.zoomMax, Math.max(CAMERA.zoomMin, z));
    const onWheel = (e) => {
      e.preventDefault();
      targetZoom = clampZoom(targetZoom * (e.deltaY > 0 ? 0.92 : 1.08));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    if (apiRef) {
      apiRef.current = {
        zoomIn: () => {
          targetZoom = clampZoom(targetZoom * 1.18);
        },
        zoomOut: () => {
          targetZoom = clampZoom(targetZoom / 1.18);
        },
        resetCamera: () => {
          pan.x = 0;
          pan.z = 0;
          targetZoom = CAMERA.defaultZoom;
          placeCamera();
        },
        paintTile: (row, column, colorKey) => {
          const tile = grid.getTile(row, column);
          if (tile) {
            paintTile(tile, colorKey);
            pulseTile(tile);
          }
        },
        clearTile: (row, column) => {
          const tile = grid.getTile(row, column);
          if (tile) clearTile(tile);
        },
        getTileData: (row, column) => {
          const tile = grid.getTile(row, column);
          return tile ? { ...tile.userData } : null;
        },
        getSearchlightState: () =>
          searchlight
            ? {
                x: SEARCHLIGHT_TILE.column,
                y: SEARCHLIGHT_TILE.row,
                beamAngleDeg: searchlight.beamAngleDeg,
                coneAngleDeg: searchlight.coneAngleDeg,
                coneRangeTiles: searchlight.rangeTiles + (alarm ? searchlight.spec.alarmRangeBonus : 0),
                level: searchlight.level,
              }
            : null,
        setAlarm: (value) => {
          alarm = !!value;
        },
      };
    }

    worldRef.current = { grid, applyPainted, selectRim, syncAttacker };

    const resize = () => {
      const w = Math.floor(mount.clientWidth);
      const h = Math.floor(mount.clientHeight);
      if (w < 2 || h < 2) return;
      if (w === resize.lastW && h === resize.lastH) return;
      resize.lastW = w;
      resize.lastH = h;
      renderer.setSize(w, h, false);
      frame(w, h);
    };
    resize.lastW = 0;
    resize.lastH = 0;
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      const dt = Math.min(0.05, clock.getDelta());
      camera.zoom += (targetZoom - camera.zoom) * 0.12;
      camera.updateProjectionMatrix();
      grid.tiles.forEach(tickTile);
      if (selectRim.visible && selectedTile) selectRim.position.copy(selectedTile.position);
      if (searchlight) searchlight.update(dt, { alarm });
      syncAttacker();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('wheel', onWheel);
      if (apiRef) apiRef.current = null;
      worldRef.current = null;
      grid.dispose();
      renderer.dispose();
      if (canvas.parentNode === mount) mount.removeChild(canvas);
      scene.traverse((child) => {
        if (child.isMesh || child.isLineSegments) {
          if (child.geometry) child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else if (child.material) child.material.dispose();
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grayscale, showSearchlight, showMakeupHouse, searchlightLevel]);

  useEffect(() => {
    if (worldRef.current) worldRef.current.applyPainted();
  }, [paintedTiles]);

  useEffect(() => {
    attackerRef.current = attacker;
  }, [attacker]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0"
      style={{ background: grayscale ? RAID_COLORS.sky : MAP_COLORS.sky }}
      aria-hidden="true"
    />
  );
}
