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
import { buildGameHouse, placeHouseOnTile, createGamePatrolRobot } from './buildStructure.js';
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
  onBuildingClick,
  apiRef,
  grayscale = false,
  paintedTiles = {},
  buildings = [],
  defenses = [],
  selectedBuildingId = null,
  showSearchlight = true,
  showMakeupHouse = false,
  searchlightLevel = DEFAULT_SEARCHLIGHT_LEVEL,
  attacker = null,
}) {
  const mountRef = useRef(null);
  const callbacksRef = useRef({});
  callbacksRef.current = { onTileClick, onTileHover, onMakeupHouseClick, onBuildingClick };
  const paintedRef = useRef(paintedTiles);
  paintedRef.current = paintedTiles;
  const attackerRef = useRef(attacker);
  attackerRef.current = attacker;
  const buildingsRef = useRef(buildings);
  buildingsRef.current = buildings;
  const defensesRef = useRef(defenses);
  defensesRef.current = defenses;
  const selectedBuildingRef = useRef(selectedBuildingId);
  selectedBuildingRef.current = selectedBuildingId;
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

    const buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);
    let patrol = null;

    const selectRing = new THREE.Mesh(
      new THREE.TorusGeometry(TILE_SIZE * 0.95, 0.05, 10, 36),
      new THREE.MeshBasicMaterial({ color: 0xf4a261, transparent: true, opacity: 0.9 })
    );
    selectRing.rotation.x = Math.PI / 2;
    selectRing.position.y = TILE_HEIGHT + 0.04;
    selectRing.visible = false;
    scene.add(selectRing);

    const syncBuildings = () => {
      while (buildingsGroup.children.length) {
        const child = buildingsGroup.children[0];
        buildingsGroup.remove(child);
        child.traverse((n) => {
          if (n.geometry) n.geometry.dispose();
          if (n.material) {
            if (Array.isArray(n.material)) n.material.forEach((m) => m.dispose());
            else n.material.dispose();
          }
        });
      }
      (buildingsRef.current || []).forEach((b) => {
        if (b.buildingType === 'MAKEUP_HOUSE') return;
        const w = b.footprintWidth || 2;
        const h = b.footprintHeight || 2;
        const house = buildGameHouse(b.buildingType, b.hexColor, b.level || 1, w, h);
        placeHouseOnTile(house, b.xPos, b.yPos, w, h);
        house.userData.buildingId = b.id;
        house.traverse((n) => {
          n.userData.buildingId = b.id;
        });
        buildingsGroup.add(house);
      });
    };
    syncBuildings();

    const syncPatrol = () => {
      const has = (defensesRef.current || []).some((d) => (d.type || d.defenseType) === 'PATROL_ROBOT');
      if (has && !patrol) {
        patrol = createGamePatrolRobot();
        scene.add(patrol.object);
      } else if (!has && patrol) {
        scene.remove(patrol.object);
        patrol = null;
      }
    };
    syncPatrol();

    const syncSelection = () => {
      const id = selectedBuildingRef.current;
      const building = (buildingsRef.current || []).find((b) => b.id === id);
      if (!building || building.buildingType === 'MAKEUP_HOUSE') {
        selectRing.visible = false;
        return;
      }
      const w = building.footprintWidth || 2;
      const h = building.footprintHeight || 2;
      const cx = building.xPos + (w - 1) / 2;
      const cy = building.yPos + (h - 1) / 2;
      const p = tileWorldPos(cx, cy);
      selectRing.visible = true;
      selectRing.position.set(p.x, TILE_HEIGHT + 0.04, p.z);
      const scale = Math.max(w, h) * 0.85;
      selectRing.scale.set(scale, scale, 1);
    };
    syncSelection();

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
    const tileRim = new THREE.LineSegments(
      rimGeo,
      new THREE.LineBasicMaterial({ color: grayscale ? 0xdddddd : 0xf4a261, transparent: true, opacity: 0.95 })
    );
    tileRim.visible = false;
    scene.add(tileRim);

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
      if (!grayscale && buildingsGroup.children.length) {
        const bHits = raycaster.intersectObjects(buildingsGroup.children, true);
        if (bHits.length) {
          let node = bHits[0].object;
          while (node && node.userData.buildingId === undefined) node = node.parent;
          if (node && node.userData.buildingId !== undefined) {
            return { type: 'building', buildingId: node.userData.buildingId };
          }
        }
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
      canvas.style.cursor =
        hit.type === 'makeup' || hit.type === 'building' || tile ? 'pointer' : pointerDown ? 'grabbing' : 'default';
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
      if (hit.type === 'building') {
        const cb = callbacksRef.current.onBuildingClick;
        if (cb) cb(hit.buildingId);
        return;
      }
      if (hit.type !== 'tile') return;
      selectedTile = hit.tile;
      tileRim.visible = true;
      tileRim.position.copy(hit.tile.position);
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

    worldRef.current = { grid, applyPainted, syncAttacker, syncBuildings, syncPatrol, syncSelection };

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
      const elapsed = clock.elapsedTime;
      camera.zoom += (targetZoom - camera.zoom) * 0.12;
      camera.updateProjectionMatrix();
      grid.tiles.forEach(tickTile);
      if (tileRim.visible && selectedTile) tileRim.position.copy(selectedTile.position);
      if (searchlight) searchlight.update(dt, { alarm });
      if (patrol) patrol.update(elapsed);
      selectRing.rotation.z = elapsed * 0.6;
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

  useEffect(() => {
    buildingsRef.current = buildings;
    if (worldRef.current) {
      worldRef.current.syncBuildings();
      worldRef.current.syncSelection();
    }
  }, [buildings]);

  useEffect(() => {
    defensesRef.current = defenses;
    if (worldRef.current) worldRef.current.syncPatrol();
  }, [defenses]);

  useEffect(() => {
    selectedBuildingRef.current = selectedBuildingId;
    if (worldRef.current) worldRef.current.syncSelection();
  }, [selectedBuildingId]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0"
      style={{ background: grayscale ? RAID_COLORS.sky : MAP_COLORS.sky }}
      aria-hidden="true"
    />
  );
}
