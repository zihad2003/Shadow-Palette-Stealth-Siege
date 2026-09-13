import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createMapGround } from './MapGround.js';
import { createTileGrid } from './TileGrid.js';
import { createFortressBorder } from './FortressBorder.js';
import { createOuterTerrain, applyMapAtmosphere } from './OuterTerrain.js';
import { createInteriorDecor, tickDecorMotion } from './MapDecor.js';
import { paintTile, clearTile, setTileHover, pulseTile, tickTile, revealTileColor } from './Tile.js';
import { applyGrayscaleWorld, desaturateObject } from './applyGrayscale.js';
import { createSearchlight } from './Searchlight.js';
import { createMakeupHouse } from './MakeupHouse.js';
import { createWallBreakFX } from './WallBreakFX.js';
import { buildGameHouse, buildRuinedHouse, placeHouseOnTile, createGamePatrolRobot, tickBuildingMotion } from './buildStructure.js';
import { createAttacker, tickCharacter } from '../character/buildCharacter.js';
import {
  CAMERA,
  MAP_COLORS,
  RAID_COLORS,
  TILE_SIZE,
  TILE_HEIGHT,
  MAP_COLS,
  MAP_ROWS,
  GRID_WIDTH,
  GRID_DEPTH,
  LARGE_MAP,
  cameraDistance,
  tileWorldPos,
  CHASE_CAM,
  WALK_TILE_SECONDS,
  TILE_PITCH,
  SEARCHLIGHT_TILE,
} from './mapConfig.js';
import { DEFAULT_SEARCHLIGHT_LEVEL } from '../raid/stealthConstants.js';
import { isTileInBeam } from '../raid/SearchlightSensor.js';

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
  cameraMode = 'iso',
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
  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;
  const worldRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    applyMapAtmosphere(scene);

    const renderer = new THREE.WebGLRenderer({ antialias: !LARGE_MAP, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, LARGE_MAP ? 1.5 : 2));
    renderer.shadowMap.enabled = !LARGE_MAP;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    mount.appendChild(canvas);

    const camFar = Math.max(800, cameraDistance() * 3);
    const camera = new THREE.PerspectiveCamera(
      cameraMode === 'chase' ? 52 : CAMERA.fov,
      1,
      cameraMode === 'chase' ? 0.12 : 1,
      camFar
    );
    const az = THREE.MathUtils.degToRad(CAMERA.azimuthDeg);
    const el = THREE.MathUtils.degToRad(CAMERA.elevationDeg);
    const dist = cameraDistance();
    const pan = { x: 0, z: 0 };
    const chase = {
      distance: CHASE_CAM.distance,
      height: CHASE_CAM.height,
      lookAhead: CHASE_CAM.lookAhead,
      shoulder: CHASE_CAM.shoulder,
      fov: CHASE_CAM.fov,
      primed: false,
      targetDist: CHASE_CAM.distance,
      lookYaw: Math.PI,
      lookPitch: CHASE_CAM.lookPitch,
    };

    const placeCamera = () => {
      camera.position.set(
        Math.sin(az) * Math.cos(el) * dist + pan.x,
        Math.sin(el) * dist,
        Math.cos(az) * Math.cos(el) * dist + pan.z
      );
      camera.lookAt(pan.x, 0, pan.z);
    };
    // Always frame the board first — chase mode takes over once the attacker is ready
    placeCamera();

    let targetZoom = CAMERA.defaultZoom;
    const frame = (width, height) => {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };

    scene.add(new THREE.HemisphereLight(grayscale ? 0xefefef : 0xfff6e8, grayscale ? 0x222222 : 0x3a2e6e, 0.92));
    const key = new THREE.DirectionalLight(grayscale ? 0xf0f0f0 : 0xfff3e0, 1.25);
    key.position.set(GRID_WIDTH * 0.25, Math.max(40, GRID_WIDTH * 0.45), GRID_DEPTH * 0.3);
    key.castShadow = !LARGE_MAP;
    if (!LARGE_MAP) {
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.left = -GRID_WIDTH / 2 - 8;
      key.shadow.camera.right = GRID_WIDTH / 2 + 8;
      key.shadow.camera.top = GRID_DEPTH / 2 + 8;
      key.shadow.camera.bottom = -GRID_DEPTH / 2 - 8;
      key.shadow.camera.near = 6;
      key.shadow.camera.far = Math.max(120, Math.hypot(GRID_WIDTH, GRID_DEPTH) + 40);
      key.shadow.bias = -0.0004;
      key.shadow.radius = 5;
    }
    scene.add(key);
    const fill = new THREE.DirectionalLight(grayscale ? 0x888888 : 0x8d7bd6, 0.35);
    fill.position.set(-GRID_WIDTH * 0.2, 24, -GRID_DEPTH * 0.15);
    scene.add(fill);

    scene.add(createOuterTerrain());
    scene.add(createMapGround());
    const grid = createTileGrid(grayscale);
    scene.add(grid.group);
    scene.add(createFortressBorder());

    let interiorDecor = createInteriorDecor({ seed: grayscale ? 41 : 7, buildings: buildingsRef.current });
    scene.add(interiorDecor);

    if (grayscale) applyGrayscaleWorld(scene);

    const searchlight = showSearchlight ? createSearchlight({ level: searchlightLevel }) : null;
    if (searchlight) scene.add(searchlight.object);

    const wallBreakFX = createWallBreakFX(scene);
    let bumpShake = 0;

    const makeupHouse = showMakeupHouse ? createMakeupHouse() : null;
    if (makeupHouse) {
      if (grayscale) desaturateObject(makeupHouse);
      scene.add(makeupHouse);
    }

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
        const house = b.ruined
          ? buildRuinedHouse(b.buildingType, w, h)
          : buildGameHouse(b.buildingType, b.hexColor, b.level || 1, w, h);
        placeHouseOnTile(house, b.xPos, b.yPos, w, h);
        house.userData.buildingId = b.id;
        house.userData.ruined = !!b.ruined;
        house.traverse((n) => {
          n.userData.buildingId = b.id;
          n.userData.ruined = !!b.ruined;
        });
        if (grayscale) desaturateObject(house);
        buildingsGroup.add(house);
      });

      // Rebuild courtyard props so they never sit under houses
      if (interiorDecor) {
        scene.remove(interiorDecor);
        interiorDecor.traverse((n) => {
          if (n.geometry) n.geometry.dispose();
          if (n.material) {
            if (Array.isArray(n.material)) n.material.forEach((m) => m.dispose());
            else n.material.dispose();
          }
        });
      }
      interiorDecor = createInteriorDecor({ seed: grayscale ? 41 : 7, buildings: buildingsRef.current });
      if (grayscale) desaturateObject(interiorDecor);
      scene.add(interiorDecor);
    };
    syncBuildings();

    const syncPatrol = () => {
      const has = (defensesRef.current || []).some((d) => (d.type || d.defenseType) === 'PATROL_ROBOT');
      if (has && !patrol) {
        patrol = createGamePatrolRobot();
        if (grayscale) desaturateObject(patrol.object);
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
    // Face into the fortress (-Z) from the south gate by default
    const attackerSmooth = { x: 0, z: 0, yaw: Math.PI, primed: false, speed: 0, sprintMul: 1 };
    const chaseLook = new THREE.Vector3();
    const chaseDesired = new THREE.Vector3();
    const chaseCurrent = new THREE.Vector3();
    const patrolCmd = { chasing: false, column: SEARCHLIGHT_TILE.column, row: SEARCHLIGHT_TILE.row };
    let lastPatrolHit = { caught: false, hitting: false };

    const syncAttacker = (dt = 0.016) => {
      const data = attackerRef.current;
      if (!data) {
        if (attackerMesh) attackerMesh.visible = false;
        return;
      }
      if (!attackerMesh) {
        attackerMesh = createAttacker({
          camoColor: data.camoColor,
          characterModel: data.characterModel || 1,
          scale: cameraModeRef.current === 'chase' ? 0.78 : 0.42,
        });
        attackerMesh.userData.isAttacker = true;
        attackerMesh.traverse((n) => {
          n.userData.isAttacker = true;
          n.userData.keepColor = true;
        });
        scene.add(attackerMesh);
      }
      attackerMesh.visible = true;
      const col = THREE.MathUtils.clamp(data.column, 0, MAP_COLS - 1);
      const row = THREE.MathUtils.clamp(data.row, 0, MAP_ROWS - 1);
      const p = tileWorldPos(col, row);
      if (!attackerSmooth.primed) {
        attackerSmooth.x = p.x;
        attackerSmooth.z = p.z;
        attackerSmooth.yaw = chase.lookYaw;
        attackerSmooth.primed = true;
      }
      const dx = p.x - attackerSmooth.x;
      const dz = p.z - attackerSmooth.z;
      const dist = Math.hypot(dx, dz);
      // Constant-speed glide between tile centers (feels smooth when holding WASD)
      const walkSpeed = TILE_PITCH / WALK_TILE_SECONDS;
      const safeDt = Math.max(dt, 0.001);
      let moved = 0;
      if (dist > 1e-4) {
        const speed = walkSpeed * attackerSmooth.sprintMul;
        const step = Math.min(dist, speed * safeDt);
        attackerSmooth.x += (dx / dist) * step;
        attackerSmooth.z += (dz / dist) * step;
        moved = step;
      } else {
        attackerSmooth.x = p.x;
        attackerSmooth.z = p.z;
      }
      // Gait speed in walk units (1 = walking, ~1.9 = sprint) — smoothed for the animator
      const instSpeed = moved / safeDt / walkSpeed;
      attackerSmooth.speed += (instSpeed - attackerSmooth.speed) * (1 - Math.exp(-14 * dt));
      // Body faces mouse look (second-person feel)
      let yawDiff = chase.lookYaw - attackerSmooth.yaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      attackerSmooth.yaw += yawDiff * (1 - Math.exp(-10 * dt));
      attackerMesh.position.set(attackerSmooth.x, TILE_HEIGHT, attackerSmooth.z);
      attackerMesh.rotation.y = attackerSmooth.yaw;
    };
    syncAttacker(0.016);

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
      if (cameraModeRef.current === 'chase') {
        if (document.pointerLockElement === canvas) {
          chase.lookYaw -= e.movementX * 0.0022;
          chase.lookPitch = THREE.MathUtils.clamp(
            chase.lookPitch - e.movementY * 0.0016,
            -0.35,
            0.55
          );
        }
        return;
      }
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
      if (cameraModeRef.current === 'chase') {
        if (document.pointerLockElement !== canvas) {
          canvas.requestPointerLock?.();
        }
        return;
      }
      pointerDown = { x: e.clientX, y: e.clientY, dragged: false };
      canvas.style.cursor = 'grabbing';
    };

    const onPointerUp = (e) => {
      if (cameraModeRef.current === 'chase') return;
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
      if (cameraModeRef.current === 'chase') {
        chase.targetDist = THREE.MathUtils.clamp(
          chase.targetDist * (e.deltaY > 0 ? 1.08 : 0.92),
          CHASE_CAM.minDist,
          CHASE_CAM.maxDist
        );
        return;
      }
      targetZoom = clampZoom(targetZoom * (e.deltaY > 0 ? 0.92 : 1.08));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    if (apiRef) {
      apiRef.current = {
        zoomIn: () => {
          if (cameraModeRef.current === 'chase') {
            chase.targetDist = THREE.MathUtils.clamp(
              chase.targetDist * 0.88,
              CHASE_CAM.minDist,
              CHASE_CAM.maxDist
            );
            return;
          }
          targetZoom = clampZoom(targetZoom * 1.18);
        },
        zoomOut: () => {
          if (cameraModeRef.current === 'chase') {
            chase.targetDist = THREE.MathUtils.clamp(
              chase.targetDist * 1.12,
              CHASE_CAM.minDist,
              CHASE_CAM.maxDist
            );
            return;
          }
          targetZoom = clampZoom(targetZoom / 1.18);
        },
        resetCamera: () => {
          if (cameraModeRef.current === 'chase') {
            chase.targetDist = CHASE_CAM.distance;
            chase.primed = false;
            return;
          }
          pan.x = 0;
          pan.z = 0;
          targetZoom = CAMERA.defaultZoom;
          placeCamera();
        },
        onCameraModeChange: (mode) => {
          worldRef.current?.onCameraModeChange?.(mode);
        },
        getFacingYaw: () => chase.lookYaw,
        addLookYaw: (delta) => {
          chase.lookYaw += delta;
        },
        setSprint: (multiplier) => {
          attackerSmooth.sprintMul = Math.max(0.5, Number(multiplier) || 1);
        },
        playBump: () => {
          bumpShake = Math.max(bumpShake, 0.28);
        },
        playWallBreak: (column, row, opts = {}) => {
          wallBreakFX.play(column, row, opts);
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
          if (value && patrol) patrol.setMode('chase', { column: patrolCmd.column, row: patrolCmd.row });
        },
        setPatrolChase: (chasing, target) => {
          patrolCmd.chasing = !!chasing;
          if (target) {
            patrolCmd.column = target.column;
            patrolCmd.row = target.row;
          }
          if (patrol) {
            patrol.setMode(patrolCmd.chasing ? 'chase' : 'patrol', {
              column: patrolCmd.column,
              row: patrolCmd.row,
            });
          }
        },
        getPatrolState: () => ({
          ...lastPatrolHit,
          chasing: patrolCmd.chasing,
          position: patrol?.position || null,
        }),
      };
    }

    const applyChaseFraming = (mode = cameraModeRef.current) => {
      const w = Math.floor(mount.clientWidth);
      const h = Math.floor(mount.clientHeight);
      if (w < 2 || h < 2) return;
      if (mode === 'chase') {
        // Raise subject in frame so legs clear the bottom dock (GTA-style)
        camera.setViewOffset(w, h, 0, Math.round(h * 0.16), w, h);
      } else {
        camera.clearViewOffset();
      }
      camera.updateProjectionMatrix();
    };

    worldRef.current = {
      grid,
      applyPainted,
      syncAttacker,
      syncBuildings,
      syncPatrol,
      syncSelection,
      onCameraModeChange: (mode) => {
        if (mode === 'chase') {
          chase.primed = false;
          chase.targetDist = CHASE_CAM.distance;
          camera.near = 0.12;
          camera.fov = chase.fov;
          camera.zoom = 1;
          applyChaseFraming('chase');
          return;
        }
        if (document.pointerLockElement === canvas) document.exitPointerLock?.();
        chase.primed = false;
        // Reset map framing every time we leave POV — avoid tiny leftover zoom/pan
        pan.x = 0;
        pan.z = 0;
        targetZoom = CAMERA.defaultZoom;
        camera.near = 1;
        camera.fov = CAMERA.fov;
        camera.zoom = CAMERA.defaultZoom;
        applyChaseFraming('iso');
        placeCamera();
      },
    };

    const resize = () => {
      const w = Math.floor(mount.clientWidth);
      const h = Math.floor(mount.clientHeight);
      if (w < 2 || h < 2) return;
      if (w === resize.lastW && h === resize.lastH) return;
      resize.lastW = w;
      resize.lastH = h;
      renderer.setSize(w, h, false);
      applyChaseFraming();
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
      const isChase = cameraModeRef.current === 'chase';

      if (!isChase) {
        camera.zoom += (targetZoom - camera.zoom) * 0.12;
        camera.updateProjectionMatrix();
      } else {
        chase.distance += (chase.targetDist - chase.distance) * (1 - Math.exp(-8 * dt));
        if (Math.abs(camera.fov - chase.fov) > 0.05) {
          camera.fov += (chase.fov - camera.fov) * (1 - Math.exp(-6 * dt));
          camera.zoom = 1;
          camera.updateProjectionMatrix();
        }
      }

      grid.tiles.forEach((tile) => {
        const ud = tile.userData;
        if (LARGE_MAP && ud.paintT >= 1 && !ud.hoverLift && !ud.press && !ud.paintBurst) return;
        tickTile(tile);
      });
      buildingsGroup.children.forEach((house) => tickBuildingMotion(house, elapsed));
      tickDecorMotion(interiorDecor, elapsed);
      if (tileRim.visible && selectedTile) tileRim.position.copy(selectedTile.position);
      if (searchlight) {
        searchlight.update(dt, { alarm });
        if (grayscale) {
          const lightState = {
            x: SEARCHLIGHT_TILE.column,
            y: SEARCHLIGHT_TILE.row,
            beamAngleDeg: searchlight.beamAngleDeg,
            coneAngleDeg: searchlight.coneAngleDeg,
            coneRangeTiles: searchlight.rangeTiles + (alarm ? searchlight.spec.alarmRangeBonus : 0),
          };
          const range = Math.ceil(lightState.coneRangeTiles) + 1;
          const cx = Math.floor(SEARCHLIGHT_TILE.column);
          const cy = Math.floor(SEARCHLIGHT_TILE.row);
          grid.tiles.forEach((tile) => {
            const { column, row } = tile.userData;
            if (Math.abs(column - cx) > range || Math.abs(row - cy) > range) {
              if (tile.userData.revealed) revealTileColor(tile, false);
              return;
            }
            revealTileColor(tile, isTileInBeam(lightState, column, row));
          });
        }
      }
      if (patrol) {
        if (patrolCmd.chasing) {
          patrol.setMode('chase', { column: patrolCmd.column, row: patrolCmd.row });
        }
        lastPatrolHit = patrol.update(elapsed, dt) || lastPatrolHit;
      }
      selectRing.rotation.z = elapsed * 0.6;
      syncAttacker(dt);
      if (attackerMesh) {
        tickCharacter(attackerMesh, elapsed, { dt, speed: attackerSmooth.speed });
        const baseScale = cameraModeRef.current === 'chase' ? 0.78 : 0.42;
        const punch = wallBreakFX.punch;
        if (punch > 0.01) {
          attackerMesh.scale.setScalar(baseScale * (1 + punch * 0.08));
          attackerMesh.position.y = TILE_HEIGHT + punch * 0.12;
        } else {
          attackerMesh.scale.setScalar(baseScale);
        }
      }

      if (isChase && attackerMesh && attackerSmooth.primed) {
        const yaw = chase.lookYaw;
        const pitch = chase.lookPitch;
        const sin = Math.sin(yaw);
        const cos = Math.cos(yaw);
        const distFlat = chase.distance * Math.cos(pitch);
        const heightOff = chase.height + chase.distance * Math.sin(pitch);
        chaseDesired.set(
          attackerSmooth.x - sin * distFlat + cos * chase.shoulder,
          TILE_HEIGHT + heightOff,
          attackerSmooth.z - cos * distFlat - sin * chase.shoulder
        );
        // Look near lower torso so the full body sits above the bottom HUD (GTA framing)
        chaseLook.set(
          attackerSmooth.x + sin * chase.lookAhead,
          TILE_HEIGHT + CHASE_CAM.lookAtHeight,
          attackerSmooth.z + cos * chase.lookAhead
        );

        if (!chase.primed) {
          camera.position.copy(chaseDesired);
          chaseCurrent.copy(chaseDesired);
          chase.primed = true;
        } else {
          const camFollow = 1 - Math.exp(-9 * dt);
          chaseCurrent.lerp(chaseDesired, camFollow);
          camera.position.copy(chaseCurrent);
        }
        camera.lookAt(chaseLook);
      } else if (!isChase) {
        placeCamera();
      }

      wallBreakFX.tick(dt, camera);
      if (bumpShake > 0.001) {
        const mag = bumpShake * 0.08;
        camera.position.x += (Math.random() - 0.5) * mag;
        camera.position.y += (Math.random() - 0.5) * mag * 0.5;
        camera.position.z += (Math.random() - 0.5) * mag;
        bumpShake = Math.max(0, bumpShake - dt * 2.4);
      }

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
    cameraModeRef.current = cameraMode;
    worldRef.current?.onCameraModeChange?.(cameraMode);
  }, [cameraMode]);

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
