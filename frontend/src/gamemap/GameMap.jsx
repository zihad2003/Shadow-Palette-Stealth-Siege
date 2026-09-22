import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createMapGround } from './MapGround.js';
import { createTileGrid } from './TileGrid.js';
import { createFortressBorder, lockFortressGate, tickFortressBorder } from './FortressBorder.js';
import { createOuterTerrain, applyMapAtmosphere } from './OuterTerrain.js';
import { createAuroraSky } from './AuroraSky.js';
import { createInteriorDecor, tickDecorMotion } from './MapDecor.js';
import { paintTile, clearTile, setTileHover, pulseTile, tickTile, revealTileColor } from './Tile.js';
import { applyGrayscaleWorld, desaturateObject } from './applyGrayscale.js';
import { createSearchlight } from './Searchlight.js';
import { createMakeupHouse } from './MakeupHouse.js';
import { createWallBreakFX } from './WallBreakFX.js';
import { buildGameHouse, buildRuinedHouse, placeHouseOnTile, createGamePatrolRobot, tickBuildingMotion, buildHouseBlueprint, tintBlueprint, createGuideMarker, tickGuideMarker, createRebuildFX, tickRebuildFX } from './buildStructure.js';
import { createAttacker, tickCharacter, CHAR_MESH_REV } from '../character/buildCharacter.js';
import { canEnterTile } from './occupancy.js';
import {
  buildPaletteBuggy,
  buildPartPickup,
  buildGaragePad,
  buggyTrackPose,
  garageCenterWorld,
  garageCenterTile,
  isGarageTile,
  BUGGY_WORLD_SCALE,
  SEATED_CHAR_SCALE,
} from './paletteBuggy.js';
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
import { getGameFootprint } from './placeUtils.js';
import { HOUSE_MESH_REV } from './houseKit.js';

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
  activeRuinId = null,
  rebuildProgress = 0,
  rebuildingId = null,
  movingBuildingId = null,
  garageUnlocked = false,
  mountedParts = [],
  partSpawns = [],
  buggyRide = null,
  carriedPart = null,
  pickupAnim = null,
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
  const activeRuinRef = useRef(activeRuinId);
  activeRuinRef.current = activeRuinId;
  const rebuildRef = useRef({ id: rebuildingId, progress: rebuildProgress });
  rebuildRef.current = { id: rebuildingId, progress: rebuildProgress };
  const movingRef = useRef(movingBuildingId);
  movingRef.current = movingBuildingId;
  const vehicleRef = useRef({
    unlocked: garageUnlocked,
    mountedParts,
    partSpawns,
    ride: buggyRide,
    carriedPart,
    pickupAnim,
  });
  vehicleRef.current = {
    unlocked: garageUnlocked,
    mountedParts,
    partSpawns,
    ride: buggyRide,
    carriedPart,
    pickupAnim,
  };
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

    // Sky dome sits just inside the camera's far plane; rendered first, ignores fog
    const aurora = createAuroraSky({ radius: camFar * 0.9, grayscale });
    scene.add(aurora.object);

    scene.add(createOuterTerrain());
    scene.add(createMapGround());
    const grid = createTileGrid(grayscale);
    scene.add(grid.group);
    const fortressBorder = createFortressBorder();
    scene.add(fortressBorder);

    let interiorDecor = createInteriorDecor({ seed: grayscale ? 41 : 7, buildings: buildingsRef.current });
    scene.add(interiorDecor);

    if (grayscale) applyGrayscaleWorld(scene);

    const searchlight = showSearchlight ? createSearchlight({ level: searchlightLevel }) : null;
    if (searchlight) scene.add(searchlight.object);

    const wallBreakFX = createWallBreakFX(scene, fortressBorder);
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

    const guideMarker = createGuideMarker();
    scene.add(guideMarker.root);
    const guideScr = new THREE.Vector3();
    const rebuildFX = createRebuildFX();
    scene.add(rebuildFX.group);

    const dimHouse = (house, dim) => {
      if (!!house.userData.dimmedMove === dim) return;
      house.userData.dimmedMove = dim;
      house.traverse((n) => {
        if (!n.material) return;
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        mats.forEach((mat) => {
          mat.userData = mat.userData || {};
          if (mat.userData._baseOp == null) mat.userData._baseOp = mat.opacity ?? 1;
          if (dim) {
            mat.transparent = true;
            mat.opacity = Math.min(0.48, mat.userData._baseOp);
          } else {
            mat.opacity = mat.userData._baseOp;
            mat.transparent = mat.userData._baseOp < 0.99;
          }
        });
      });
    };

    let scaffold = null;
    const clearScaffold = () => {
      if (!scaffold) return;
      scene.remove(scaffold);
      scaffold.traverse((n) => {
        if (n.geometry) n.geometry.dispose();
        if (n.material) {
          if (Array.isArray(n.material)) n.material.forEach((m) => m.dispose());
          else n.material.dispose();
        }
      });
      scaffold = null;
    };

    const disposeObject = (obj) => {
      if (!obj) return;
      obj.traverse((n) => {
        if (n.geometry) n.geometry.dispose();
        if (n.material) {
          if (Array.isArray(n.material)) n.material.forEach((m) => m.dispose());
          else n.material.dispose();
        }
      });
    };

    const makeHouseMesh = (b) => {
      const w = b.footprintWidth || getGameFootprint(b.buildingType).w;
      const h = b.footprintHeight || getGameFootprint(b.buildingType).h;
      const house = b.ruined
        ? buildRuinedHouse(b.buildingType, w, h)
        : buildGameHouse(b.buildingType, b.hexColor, b.level || 1, w, h);
      placeHouseOnTile(house, b.xPos, b.yPos, w, h);
      house.userData.buildingId = b.id;
      house.userData.ruined = !!b.ruined;
      house.userData.xPos = b.xPos;
      house.userData.yPos = b.yPos;
      house.userData.hexColor = b.hexColor;
      house.userData.level = b.level || 1;
      house.userData.meshRev = HOUSE_MESH_REV;
      house.traverse((n) => {
        n.userData.buildingId = b.id;
        n.userData.ruined = !!b.ruined;
      });
      if (grayscale) desaturateObject(house);
      return house;
    };

    let lastDecorSig = '';
    const syncBuildings = () => {
      const list = (buildingsRef.current || []).filter((b) => b.buildingType !== 'MAKEUP_HOUSE');
      const wanted = new Set(list.map((b) => b.id));
      const byId = new Map();
      [...buildingsGroup.children].forEach((child) => {
        const id = child.userData.buildingId;
        if (id == null || !wanted.has(id)) {
          buildingsGroup.remove(child);
          disposeObject(child);
          return;
        }
        byId.set(id, child);
      });

      list.forEach((b) => {
        const w = b.footprintWidth || getGameFootprint(b.buildingType).w;
        const hgt = b.footprintHeight || getGameFootprint(b.buildingType).h;
        const existing = byId.get(b.id);
        const ruined = !!b.ruined;
        if (
          existing &&
          existing.userData.ruined === ruined &&
          existing.userData.hexColor === b.hexColor &&
          existing.userData.level === (b.level || 1) &&
          existing.userData.meshRev === HOUSE_MESH_REV
        ) {
          const dest = tileWorldPos(b.xPos + (w - 1) / 2, b.yPos + (hgt - 1) / 2);
          const dist = Math.hypot(dest.x - existing.position.x, dest.z - existing.position.z);
          if (dist > 0.12) {
            existing.userData.slideFrom = existing.position.clone();
            existing.userData.slideTo = new THREE.Vector3(dest.x, TILE_HEIGHT, dest.z);
            existing.userData.slideT = 0;
          } else if (!existing.userData.slideTo) {
            placeHouseOnTile(existing, b.xPos, b.yPos, w, hgt);
          }
          existing.userData.xPos = b.xPos;
          existing.userData.yPos = b.yPos;
          return;
        }
        if (existing) {
          buildingsGroup.remove(existing);
          disposeObject(existing);
        }
        buildingsGroup.add(makeHouseMesh(b));
      });

      const decorSig = list.map((b) => `${b.id}:${b.ruined ? 1 : 0}:${b.hexColor}:${b.level || 1}`).join('|');
      if (decorSig !== lastDecorSig) {
        lastDecorSig = decorSig;
        if (interiorDecor) {
          scene.remove(interiorDecor);
          disposeObject(interiorDecor);
        }
        interiorDecor = createInteriorDecor({ seed: grayscale ? 41 : 7, buildings: buildingsRef.current });
        if (grayscale) desaturateObject(interiorDecor);
        scene.add(interiorDecor);
      }
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
      const w = building.footprintWidth || getGameFootprint(building.buildingType).w;
      const h = building.footprintHeight || getGameFootprint(building.buildingType).h;
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
    let garagePad = null;
    let buggyMesh = null;
    const carTile = garageCenterTile();
    let carYaw = 0;
    const buggyGlide = { x: 0, z: 0, primed: false };
    let driveInput = { driving: false, forward: 0, sprintMul: 1, solids: null };
    let exitSnap = null;
    const worldToTile = (x, z) => ({
      column: THREE.MathUtils.clamp(
        Math.round((x - (-GRID_WIDTH / 2 + TILE_SIZE / 2)) / TILE_PITCH),
        0,
        MAP_COLS - 1
      ),
      row: THREE.MathUtils.clamp(
        Math.round((z - (-GRID_DEPTH / 2 + TILE_SIZE / 2)) / TILE_PITCH),
        0,
        MAP_ROWS - 1
      ),
    });
    const carFits = (x, z, yaw, solids) => {
      if (!solids) return true;
      const s = Math.sin(yaw);
      const c = Math.cos(yaw);
      const samples = [
        [0, 0],
        [0.62, 0.36],
        [0.62, -0.36],
        [-0.55, 0.36],
        [-0.55, -0.36],
      ];
      for (let i = 0; i < samples.length; i += 1) {
        const f = samples[i][0];
        const r = samples[i][1];
        const tile = worldToTile(x + s * f + c * r, z + c * f - s * r);
        if (!canEnterTile(tile.column, tile.row, solids)) return false;
      }
      return true;
    };
    let cartPartsGroup = null;
    let rideOtherMesh = null;
    let lastPartSig = '';
    let lastOtherSig = '';
    let carryMesh = null;
    let flyMesh = null;
    const holdLocal = new THREE.Vector3(0.22, 0.92, 0.48);
    const holdWorld = new THREE.Vector3();

    const syncVehicle = (dt = 0.016, elapsed = 0) => {
      if (grayscale) return;
      const veh = vehicleRef.current || {};
      const unlocked = !!veh.unlocked;
      const parts = Array.isArray(veh.mountedParts) ? veh.mountedParts : [];
      const spawns = Array.isArray(veh.partSpawns) ? veh.partSpawns : [];
      const ride = veh.ride || {};
      if (!unlocked) {
        if (garagePad) garagePad.visible = false;
        if (buggyMesh) buggyMesh.visible = false;
        if (cartPartsGroup) cartPartsGroup.visible = false;
        if (rideOtherMesh) rideOtherMesh.visible = false;
        return;
      }
      if (!garagePad) {
        garagePad = buildGaragePad();
        scene.add(garagePad);
      }
      garagePad.visible = true;
      const sig = parts.slice().sort().join(',');
      if (!buggyMesh || lastPartSig !== sig) {
        if (buggyMesh) {
          scene.remove(buggyMesh);
          disposeObject(buggyMesh);
        }
        buggyMesh = buildPaletteBuggy(parts);
        lastPartSig = sig;
        buggyMesh.scale.setScalar(BUGGY_WORLD_SCALE);
        scene.add(buggyMesh);
      }
      buggyMesh.visible = true;
      const driving = !!(ride.seated && ride.role !== 'passenger');
      const passenger = ride.role === 'passenger' && (!!ride.seated || (ride.gear || 0) > 0);
      let rolling = false;
      if (passenger) {
        const pose = buggyTrackPose(ride.trackT || 0);
        buggyMesh.position.set(pose.x, pose.y, pose.z);
        buggyMesh.rotation.y = pose.yaw;
        rolling = (ride.gear || 0) > 0;
      } else {
        if (!buggyGlide.primed) {
          const p = tileWorldPos(carTile.column, carTile.row);
          buggyGlide.x = p.x;
          buggyGlide.z = p.z;
          buggyGlide.primed = true;
        }
        if (driving) {
          carYaw = chase.lookYaw;
          const fwd = driveInput.forward || 0;
          if (fwd && driveInput.solids) {
            const speed =
              (TILE_PITCH / WALK_TILE_SECONDS) * (driveInput.sprintMul || 1) * (fwd < 0 ? 0.68 : 1);
            const dist = speed * dt * Math.sign(fwd);
            const dx = Math.sin(carYaw) * dist;
            const dz = Math.cos(carYaw) * dist;
            const nx = buggyGlide.x + dx;
            const nz = buggyGlide.z + dz;
            if (carFits(nx, nz, carYaw, driveInput.solids)) {
              buggyGlide.x = nx;
              buggyGlide.z = nz;
              rolling = true;
            } else if (carFits(buggyGlide.x + dx, buggyGlide.z, carYaw, driveInput.solids)) {
              buggyGlide.x += dx;
              rolling = true;
            } else if (carFits(buggyGlide.x, buggyGlide.z + dz, carYaw, driveInput.solids)) {
              buggyGlide.z += dz;
              rolling = true;
            }
          }
          const t = worldToTile(buggyGlide.x, buggyGlide.z);
          carTile.column = t.column;
          carTile.row = t.row;
        }
        buggyMesh.position.set(buggyGlide.x, TILE_HEIGHT, buggyGlide.z);
        buggyMesh.rotation.y = carYaw;
      }
      if (rolling) {
        buggyMesh.traverse((n) => {
          if (n.userData?.isWheel) n.rotation.x += dt * 9;
        });
      }

      if (!cartPartsGroup) {
        cartPartsGroup = new THREE.Group();
        cartPartsGroup.name = 'CartPartPickups';
        scene.add(cartPartsGroup);
      }
      cartPartsGroup.visible = true;
      const flyingId = veh.pickupAnim && veh.pickupAnim.t < 1 ? veh.pickupAnim.partId : null;
      const wanted = new Set(spawns.filter((p) => p.id !== flyingId).map((p) => p.id));
      [...cartPartsGroup.children].forEach((child) => {
        if (!wanted.has(child.userData.partId)) {
          cartPartsGroup.remove(child);
          disposeObject(child);
        }
      });
      spawns.forEach((spawn) => {
        if (spawn.id === flyingId) return;
        let mesh = cartPartsGroup.children.find((c) => c.userData.partId === spawn.id);
        if (!mesh) {
          mesh = buildPartPickup(spawn.id);
          mesh.userData.partId = spawn.id;
          cartPartsGroup.add(mesh);
        }
        const p = tileWorldPos(spawn.column, spawn.row);
        const bob = Math.sin(elapsed * 2.6 + spawn.column) * 0.12;
        mesh.position.set(p.x, TILE_HEIGHT + 0.28 + bob, p.z);
        mesh.rotation.y = elapsed * 0.85;
        mesh.traverse((n) => {
          if (n.userData?.isBeacon) n.scale.setScalar(1 + Math.sin(elapsed * 3.2 + spawn.row) * 0.08);
        });
      });

      const other = ride.other;
      const otherOn = !!(other && other.seated);
      const otherSig = otherOn ? `${other.characterModel}|${other.camoColor}|${other.role}` : '';
      if (otherOn && (otherSig !== lastOtherSig || !rideOtherMesh)) {
        if (rideOtherMesh) {
          scene.remove(rideOtherMesh);
          disposeObject(rideOtherMesh);
        }
        rideOtherMesh = createAttacker({
          camoColor: other.camoColor || 'BLUE',
          characterModel: other.characterModel || 1,
          scale: SEATED_CHAR_SCALE,
        });
        rideOtherMesh.userData.keepColor = true;
        rideOtherMesh.traverse((n) => {
          n.userData.keepColor = true;
        });
        lastOtherSig = otherSig;
        scene.add(rideOtherMesh);
      }
      if (rideOtherMesh) {
        rideOtherMesh.visible = otherOn && !!buggyMesh;
        if (otherOn && buggyMesh) {
          const seat = other.role === 'passenger' ? buggyMesh.userData.passengerSeat : buggyMesh.userData.driverSeat;
          if (rideOtherMesh.parent !== buggyMesh) buggyMesh.attach(rideOtherMesh);
          rideOtherMesh.position.copy(seat);
          rideOtherMesh.rotation.set(0, 0, 0);
          rideOtherMesh.scale.setScalar(SEATED_CHAR_SCALE / BUGGY_WORLD_SCALE);
        } else if (rideOtherMesh.parent && rideOtherMesh.parent !== scene) {
          scene.attach(rideOtherMesh);
        }
      }
    };

    const syncAttacker = (dt = 0.016) => {
      const data = attackerRef.current;
      if (!data) {
        if (attackerMesh) attackerMesh.visible = false;
        return;
      }
      const charSig = `${data.characterModel || 1}|${data.camoColor || 'BLUE'}|${cameraModeRef.current}|${CHAR_MESH_REV}`;
      if (attackerMesh && attackerMesh.userData.charSig !== charSig) {
        scene.remove(attackerMesh);
        disposeObject(attackerMesh);
        attackerMesh = null;
      }
      if (!attackerMesh) {
        attackerMesh = createAttacker({
          camoColor: data.camoColor,
          characterModel: data.characterModel || 1,
          scale: cameraModeRef.current === 'chase' ? 0.78 : 0.42,
        });
        attackerMesh.userData.isAttacker = true;
        attackerMesh.userData.charSig = charSig;
        attackerMesh.traverse((n) => {
          n.userData.isAttacker = true;
          n.userData.keepColor = true;
        });
        scene.add(attackerMesh);
      }
      attackerMesh.visible = true;
      const ride = vehicleRef.current?.ride;
      if (ride?.seated && buggyMesh) {
        const seatLocal =
          ride.role === 'passenger' ? buggyMesh.userData.passengerSeat : buggyMesh.userData.driverSeat;
        if (attackerMesh.parent !== buggyMesh) buggyMesh.attach(attackerMesh);
        attackerMesh.position.copy(seatLocal);
        attackerMesh.rotation.set(0, 0, 0);
        attackerMesh.scale.setScalar(SEATED_CHAR_SCALE / BUGGY_WORLD_SCALE);
        buggyMesh.updateMatrixWorld(true);
        const world = new THREE.Vector3();
        attackerMesh.getWorldPosition(world);
        attackerSmooth.x = world.x;
        attackerSmooth.z = world.z;
        attackerSmooth.yaw = buggyMesh.rotation.y;
        attackerSmooth.primed = true;
        attackerSmooth.speed = 0;
        return;
      }
      if (attackerMesh.parent && attackerMesh.parent !== scene) scene.attach(attackerMesh);
      if (exitSnap) {
        const snap = tileWorldPos(exitSnap.column, exitSnap.row);
        attackerSmooth.x = snap.x;
        attackerSmooth.z = snap.z;
        attackerSmooth.yaw = chase.lookYaw;
        attackerSmooth.primed = true;
        attackerSmooth.speed = 0;
        exitSnap = null;
      }
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
        const ease = dist < TILE_PITCH * 0.14 ? 0.45 + 0.55 * (dist / (TILE_PITCH * 0.14)) : 1;
        const step = Math.min(dist, speed * safeDt * ease);
        attackerSmooth.x += (dx / dist) * step;
        attackerSmooth.z += (dz / dist) * step;
        moved = step;
      } else {
        attackerSmooth.x = p.x;
        attackerSmooth.z = p.z;
      }
      // Walk-units for the gait (1 = walking, ~1.9 = sprint). Tile glide speed is unchanged.
      const instSpeed = moved / safeDt / walkSpeed;
      attackerSmooth.speed += (instSpeed - attackerSmooth.speed) * (1 - Math.exp(-10 * dt));
      // Body faces the direction of travel while moving, the camera look when idle (GTA feel)
      const targetYaw = dist > 0.08 ? Math.atan2(dx, dz) : chase.lookYaw;
      let yawDiff = targetYaw - attackerSmooth.yaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      attackerSmooth.yaw += yawDiff * (1 - Math.exp(-(dist > 0.08 ? 9 : 5.5) * dt));
      attackerMesh.position.set(attackerSmooth.x, TILE_HEIGHT, attackerSmooth.z);
      attackerMesh.rotation.y = attackerSmooth.yaw;
    };
    syncVehicle(0.016, 0);
    syncAttacker(0.016);

    const rimGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(TILE_SIZE * 1.02, TILE_HEIGHT * 1.08, TILE_SIZE * 1.02));
    const tileRim = new THREE.LineSegments(
      rimGeo,
      new THREE.LineBasicMaterial({ color: grayscale ? 0xdddddd : 0xf4a261, transparent: true, opacity: 0.95 })
    );
    tileRim.visible = false;
    scene.add(tileRim);

    // Walk-brush preview: tinted rings on the tiles about to be painted
    const brushGroup = new THREE.Group();
    brushGroup.name = 'BrushPreview';
    brushGroup.userData.keepColor = true;
    const brushMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const brushGeo = new THREE.RingGeometry(TILE_SIZE * 0.26, TILE_SIZE * 0.4, 28);
    const brushRings = [];
    for (let i = 0; i < 25; i++) {
      const ring = new THREE.Mesh(brushGeo, brushMat);
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      ring.userData.keepColor = true;
      brushGroup.add(ring);
      brushRings.push(ring);
    }
    scene.add(brushGroup);
    let brushActive = false;
    const setBrushPreview = (tiles, hex) => {
      brushActive = Array.isArray(tiles) && tiles.length > 0;
      if (brushActive) brushMat.color.set(hex || '#FFFFFF');
      brushRings.forEach((ring, i) => {
        const t = brushActive ? tiles[i] : null;
        if (!t) {
          ring.visible = false;
          return;
        }
        const p = tileWorldPos(t.x, t.y);
        ring.position.set(p.x, TILE_HEIGHT + 0.035, p.z);
        ring.visible = true;
      });
    };

    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x7dce82,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const padGeo = new THREE.PlaneGeometry(TILE_SIZE * 0.9, TILE_SIZE * 0.9);
    const movePads = [];
    for (let i = 0; i < 9; i++) {
      const pad = new THREE.Mesh(padGeo, ghostMat);
      pad.rotation.x = -Math.PI / 2;
      pad.visible = false;
      pad.userData.keepColor = true;
      scene.add(pad);
      movePads.push(pad);
    }
    let blueprint = null;
    const setMoveGhost = (spec) => {
      if (!spec) {
        if (blueprint) blueprint.visible = false;
        movePads.forEach((p) => {
          p.visible = false;
        });
        return;
      }
      const w = spec.w || getGameFootprint(spec.type).w;
      const h = spec.h || getGameFootprint(spec.type).h;
      const key = `${spec.type || 'SLEEP_HOUSE'}|${w}|${h}|${spec.level || 1}`;
      if (!blueprint || blueprint.userData.bpKey !== key) {
        if (blueprint) {
          scene.remove(blueprint);
          blueprint.traverse((n) => {
            if (n.material) {
              if (Array.isArray(n.material)) n.material.forEach((m) => m.dispose());
              else n.material.dispose();
            }
          });
        }
        blueprint = buildHouseBlueprint(spec.type || 'SLEEP_HOUSE', spec.hex || '#7dce82', spec.level || 1, w, h);
        blueprint.userData.bpKey = key;
        scene.add(blueprint);
      }
      blueprint.visible = true;
      placeHouseOnTile(blueprint, spec.x, spec.y, w, h);
      blueprint.position.y = TILE_HEIGHT + 0.14;
      tintBlueprint(blueprint, !!spec.ok);
      ghostMat.color.setHex(spec.ok ? 0x7dce82 : 0xe63946);
      ghostMat.opacity = spec.ok ? 0.28 : 0.4;
      let i = 0;
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          if (!movePads[i]) break;
          const p = tileWorldPos(spec.x + dx, spec.y + dy);
          movePads[i].position.set(p.x, TILE_HEIGHT + 0.04, p.z);
          movePads[i].visible = true;
          i += 1;
        }
      }
      for (; i < movePads.length; i++) movePads[i].visible = false;
    };

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
          // Mouse up → look up (positive pitch)
          chase.lookPitch = THREE.MathUtils.clamp(
            chase.lookPitch - e.movementY * 0.0018,
            CHASE_CAM.pitchMin,
            CHASE_CAM.pitchMax
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
        getCarTile: () => ({ column: carTile.column, row: carTile.row }),
        getDismountTile: (solids) => {
          const x = buggyMesh ? buggyMesh.position.x : buggyGlide.x;
          const z = buggyMesh ? buggyMesh.position.z : buggyGlide.z;
          const yaw = buggyMesh ? buggyMesh.rotation.y : carYaw;
          const s = Math.sin(yaw);
          const c = Math.cos(yaw);
          const occupied = new Set();
          for (let f = -0.9; f <= 0.95; f += 0.3) {
            for (let r = -0.6; r <= 0.6; r += 0.3) {
              const tile = worldToTile(x + s * f + c * r, z + c * f - s * r);
              occupied.add(`${tile.column},${tile.row}`);
            }
          }
          const center = worldToTile(x, z);
          let best = null;
          let bestScore = Infinity;
          for (let dCol = -3; dCol <= 3; dCol += 1) {
            for (let dRow = -3; dRow <= 3; dRow += 1) {
              if (!dCol && !dRow) continue;
              const column = center.column + dCol;
              const row = center.row + dRow;
              if (column < 0 || row < 0 || column >= MAP_COLS || row >= MAP_ROWS) continue;
              if (occupied.has(`${column},${row}`)) continue;
              if (isGarageTile(column, row)) continue;
              if (solids && !canEnterTile(column, row, solids)) continue;
              const p = tileWorldPos(column, row);
              const dx = p.x - x;
              const dz = p.z - z;
              const forward = dx * s + dz * c;
              const right = dx * c - dz * s;
              const dist = Math.hypot(dCol, dRow);
              const score = dist * 10 + Math.abs(forward) * 3 - Math.abs(right) * 2;
              if (score < bestScore) {
                bestScore = score;
                best = { column, row };
              }
            }
          }
          return best;
        },
        placeOnTile: (column, row) => {
          exitSnap = { column, row };
        },
        setDriveInput: (next) => {
          driveInput = {
            driving: !!next?.driving,
            forward: Number(next?.forward) || 0,
            sprintMul: Math.max(0.5, Number(next?.sprintMul) || 1),
            solids: next?.solids || null,
          };
        },
        getFacingYaw: () => chase.lookYaw,
        addLookYaw: (delta) => {
          chase.lookYaw += delta;
        },
        isMouseLocked: () => document.pointerLockElement === canvas,
        setBrushPreview,
        setMoveGhost,
        getGuideScreen: () => {
          if (!guideMarker.root.visible) return null;
          guideScr.copy(guideMarker.root.position);
          guideScr.y += 1.62;
          guideScr.project(camera);
          const onScreen = guideScr.z < 1 && Math.abs(guideScr.x) < 0.9 && Math.abs(guideScr.y) < 0.78;
          return { nx: guideScr.x, ny: guideScr.y, onScreen };
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
        lockGate: () => lockFortressGate(fortressBorder),
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
      syncVehicle,
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
        if (
          LARGE_MAP &&
          ud.paintT >= 1 &&
          !ud.hoverLift &&
          !ud.press &&
          !ud.paintBurst &&
          !ud.revealed &&
          !ud.revealPulse &&
          !ud.inBeam
        ) {
          return;
        }
        tickTile(tile);
      });
      buildingsGroup.children.forEach((house) => {
        tickBuildingMotion(house, elapsed);
        if (house.userData.slideTo && house.userData.slideFrom) {
          house.userData.slideT = Math.min(1, (house.userData.slideT || 0) + dt / 0.42);
          const t = 1 - (1 - house.userData.slideT) ** 3;
          house.position.lerpVectors(house.userData.slideFrom, house.userData.slideTo, t);
          house.position.y = TILE_HEIGHT + Math.sin(t * Math.PI) * 0.38;
          if (house.userData.slideT >= 1) {
            house.position.copy(house.userData.slideTo);
            house.userData.slideTo = null;
            house.userData.slideFrom = null;
          }
        } else if (movingRef.current && house.userData.buildingId === movingRef.current) {
          house.position.y = TILE_HEIGHT + 0.36;
          house.userData.lifted = true;
          dimHouse(house, true);
        } else if (house.userData.lifted) {
          house.position.y = TILE_HEIGHT;
          house.userData.lifted = false;
          dimHouse(house, false);
        }
      });
      tickDecorMotion(interiorDecor, elapsed);
      aurora.update(elapsed);
      if (tileRim.visible && selectedTile) tileRim.position.copy(selectedTile.position);
      if (brushActive) {
        brushMat.opacity = 0.4 + 0.25 * Math.sin(elapsed * 5.5);
        const s = 1 + 0.06 * Math.sin(elapsed * 5.5);
        brushRings.forEach((r) => r.visible && r.scale.setScalar(s));
      }
      if (blueprint && blueprint.visible) {
        ghostMat.opacity = (ghostMat.color.getHex() === 0xe63946 ? 0.34 : 0.26) + 0.1 * Math.sin(elapsed * 4.5);
        blueprint.position.y = TILE_HEIGHT + 0.12 + Math.sin(elapsed * 3.2) * 0.04;
      }

      const rb = rebuildRef.current;
      const rebuildId = rb?.id;
      const rebuildP = rb?.progress || 0;
      buildingsGroup.children.forEach((house) => {
        if (!house.userData.ruined) return;
        if (house.userData.buildingId === rebuildId && rebuildP > 0.01) {
          const s = Math.max(0.18, 1 - rebuildP * 0.82);
          house.scale.setScalar(s);
          if (!house.userData.slideTo) house.position.y = TILE_HEIGHT - rebuildP * 0.22;
        } else {
          house.scale.setScalar(1);
        }
      });
      if (!grayscale && rebuildId && rebuildP > 0.02) {
        const b = (buildingsRef.current || []).find((x) => x.id === rebuildId);
        if (b) {
          const w = b.footprintWidth || getGameFootprint(b.buildingType).w;
          const hgt = b.footprintHeight || getGameFootprint(b.buildingType).h;
          if (!scaffold || scaffold.userData.buildingId !== rebuildId) {
            clearScaffold();
            scaffold = buildGameHouse(b.buildingType, b.hexColor || '#C9B79A', 1, w, hgt);
            scaffold.userData.buildingId = rebuildId;
            scaffold.userData.isScaffold = true;
            scaffold.traverse((n) => {
              n.castShadow = false;
              if (n.material) {
                n.material = n.material.clone();
                n.material.transparent = true;
                n.material.opacity = 0.55;
                n.material.depthWrite = false;
              }
            });
            scene.add(scaffold);
          }
          placeHouseOnTile(scaffold, b.xPos, b.yPos, w, hgt);
          const grow = 0.22 + rebuildP * 0.78;
          scaffold.scale.setScalar(grow);
          scaffold.position.y = TILE_HEIGHT + (1 - rebuildP) * 0.2;
          scaffold.traverse((n) => {
            if (n.material && n.material.opacity != null) n.material.opacity = 0.35 + rebuildP * 0.55;
          });
          const center = tileWorldPos(b.xPos + (w - 1) / 2, b.yPos + (hgt - 1) / 2);
          rebuildFX.group.position.set(center.x, TILE_HEIGHT, center.z);
          tickRebuildFX(rebuildFX, dt, true, rebuildP);
        } else {
          clearScaffold();
          tickRebuildFX(rebuildFX, dt, false, 0);
        }
      } else {
        clearScaffold();
        tickRebuildFX(rebuildFX, dt, false, 0);
      }

      const guideId = grayscale ? null : activeRuinRef.current;
      const guideB = guideId ? (buildingsRef.current || []).find((x) => x.id === guideId) : null;
      if (guideB) {
        const w = guideB.footprintWidth || getGameFootprint(guideB.buildingType).w;
        const hgt = guideB.footprintHeight || getGameFootprint(guideB.buildingType).h;
        const p = tileWorldPos(guideB.xPos + (w - 1) / 2, guideB.yPos + (hgt - 1) / 2);
        guideMarker.root.visible = true;
        guideMarker.root.position.set(p.x, TILE_HEIGHT, p.z);
        tickGuideMarker(guideMarker, elapsed, camera);
        buildingsGroup.children.forEach((house) => {
          if (!house.userData.ruined) return;
          const on = house.userData.buildingId === guideId;
          house.traverse((n) => {
            if (n.material?.emissive) n.material.emissiveIntensity = on ? 0.1 + Math.sin(elapsed * 1.4) * 0.04 : 0;
          });
        });
      } else {
        const vehGuide = vehicleRef.current || {};
        const atk = attackerRef.current;
        const carryingId = vehGuide.carriedPart;
        const spawns = Array.isArray(vehGuide.partSpawns) ? vehGuide.partSpawns : [];
        let mark = null;
        if (carryingId) {
          mark = garageCenterWorld();
        } else if (spawns.length && atk) {
          let best = spawns[0];
          let bestD = Infinity;
          spawns.forEach((p) => {
            const d = Math.hypot((p.column || 0) - atk.column, (p.row || 0) - atk.row);
            if (d < bestD) {
              bestD = d;
              best = p;
            }
          });
          mark = tileWorldPos(best.column, best.row);
        }
        if (mark) {
          guideMarker.root.visible = true;
          guideMarker.root.position.set(mark.x, TILE_HEIGHT, mark.z);
          tickGuideMarker(guideMarker, elapsed, camera);
        } else {
          guideMarker.root.visible = false;
        }
      }
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
      syncVehicle(dt, elapsed);
      syncAttacker(dt);
      if (attackerMesh) {
        const vehNow = vehicleRef.current || {};
        const picking = !!(vehNow.pickupAnim && vehNow.pickupAnim.t < 1);
        const seated = !!vehNow.ride?.seated;
        const carrying = !!vehNow.carriedPart && !seated;
        tickCharacter(attackerMesh, elapsed, {
          dt,
          speed: picking || seated ? 0 : attackerSmooth.speed,
          carrying,
          picking,
          seated,
        });
        const baseScale = seated ? SEATED_CHAR_SCALE : cameraModeRef.current === 'chase' ? 0.78 : 0.42;
        if (attackerSmooth.scale == null) attackerSmooth.scale = baseScale;
        attackerSmooth.scale += (baseScale - attackerSmooth.scale) * (1 - Math.exp(-4.8 * dt));
        const punch = wallBreakFX.punch;
        if (seated && buggyMesh && attackerMesh.parent === buggyMesh) {
          attackerMesh.position.copy(
            vehNow.ride?.role === 'passenger' ? buggyMesh.userData.passengerSeat : buggyMesh.userData.driverSeat
          );
          attackerMesh.rotation.set(0, 0, 0);
          attackerMesh.scale.setScalar(SEATED_CHAR_SCALE / BUGGY_WORLD_SCALE);
        } else if (punch > 0.01 && !seated) {
          attackerMesh.scale.setScalar(attackerSmooth.scale * (1 + punch * 0.08));
          attackerMesh.position.y = TILE_HEIGHT + punch * 0.12;
        } else {
          attackerMesh.scale.setScalar(attackerSmooth.scale);
        }
        if (rideOtherMesh && rideOtherMesh.visible) {
          tickCharacter(rideOtherMesh, elapsed, { dt, speed: 0, seated: true });
        }

        const anim = vehNow.pickupAnim;
        const carriedId = vehNow.carriedPart;
        holdLocal.set(0.22, 0.92, 0.48);
        attackerMesh.localToWorld(holdWorld.copy(holdLocal));
        if (picking && anim?.partId) {
          if (!flyMesh || flyMesh.userData.partId !== anim.partId) {
            if (flyMesh) {
              scene.remove(flyMesh);
              disposeObject(flyMesh);
            }
            flyMesh = buildPartPickup(anim.partId, { held: true });
            flyMesh.userData.partId = anim.partId;
            scene.add(flyMesh);
          }
          const from = tileWorldPos(anim.column, anim.row);
          const e = 1 - (1 - Math.min(1, anim.t || 0)) ** 3;
          flyMesh.visible = true;
          flyMesh.position.set(
            from.x + (holdWorld.x - from.x) * e,
            TILE_HEIGHT + 0.25 + (holdWorld.y - (TILE_HEIGHT + 0.25)) * e + Math.sin(e * Math.PI) * 0.85,
            from.z + (holdWorld.z - from.z) * e
          );
          flyMesh.rotation.y = elapsed * 4;
          flyMesh.scale.setScalar(1 - e * 0.35);
          if (carryMesh) carryMesh.visible = false;
        } else if (flyMesh) {
          scene.remove(flyMesh);
          disposeObject(flyMesh);
          flyMesh = null;
        }
        if (carrying && carriedId && !picking && !seated) {
          if (!carryMesh || carryMesh.userData.partId !== carriedId) {
            if (carryMesh) {
              attackerMesh.remove(carryMesh);
              disposeObject(carryMesh);
            }
            carryMesh = buildPartPickup(carriedId, { held: true });
            carryMesh.userData.partId = carriedId;
            carryMesh.position.copy(holdLocal);
            carryMesh.scale.setScalar(0.62);
            attackerMesh.add(carryMesh);
          }
          carryMesh.visible = true;
          carryMesh.position.set(holdLocal.x, holdLocal.y + Math.sin(elapsed * 6) * 0.03, holdLocal.z);
          carryMesh.rotation.y = Math.sin(elapsed * 5) * 0.18;
        } else if (carryMesh) {
          carryMesh.visible = false;
        }
      }

      if (isChase && attackerMesh && attackerSmooth.primed) {
        const yaw = chase.lookYaw;
        const pitch = chase.lookPitch;
        const sin = Math.sin(yaw);
        const cos = Math.cos(yaw);
        const inCar = !!vehicleRef.current?.ride?.seated;
        const shoulder = inCar ? 1.35 : chase.shoulder;
        const lookH = inCar ? 1.05 : CHASE_CAM.lookAtHeight;
        // Looking up drops the camera toward shoulder height; looking down lifts it
        const lift = -Math.sin(pitch) * chase.distance * 0.8;
        const camHeight = Math.max(CHASE_CAM.minCamHeight, chase.height + (inCar ? 0.45 : 0) + lift);
        const distFlat = chase.distance * (0.78 + 0.22 * Math.cos(pitch));
        chaseDesired.set(
          attackerSmooth.x - sin * distFlat + cos * shoulder,
          TILE_HEIGHT + camHeight,
          attackerSmooth.z - cos * distFlat - sin * shoulder
        );
        // Aim point rises with pitch so the sky comes into frame when looking up
        const up = pitch > 0 ? pitch * 3.6 : pitch * 1.1;
        const ahead = chase.lookAhead + Math.max(0, pitch) * 1.5;
        chaseLook.set(
          attackerSmooth.x + sin * ahead,
          TILE_HEIGHT + lookH + up,
          attackerSmooth.z + cos * ahead
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
      tickFortressBorder(fortressBorder, dt, elapsed);
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
