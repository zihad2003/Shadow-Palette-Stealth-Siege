import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createBaseCameraRig } from './BaseCameraRig.js';
import { createBaseLights } from './BaseLights.js';
import { applySkyVignette } from './SkyVignette.js';
import { createGroundFill } from './GroundFill.js';
import { createHiddenSnapMesh } from './HiddenSnapMesh.js';
import { createTerrainSkirt } from './TerrainSkirt.js';
import { createDirtPaths } from './DirtPaths.js';
import { createCenterPlaza } from './CenterPlaza.js';
import { createGroundDecals } from './GroundDecals.js';
import { createOuterWalls } from './OuterWalls.js';
import { createGate } from './Gate.js';
import { createCornerPosts } from './CornerPosts.js';
import { createLighthouseCore } from './LighthouseCore.js';
import { createSpotlightCone } from './SpotlightCone.js';
import { createBeamSweep } from './LighthouseBeamSweep.js';
import { buildHouse, getFootprint, createSelectRing, createUpgradeBadge } from './buildings.js';
import { createPlacementGhost } from './PlacementGhost.js';
import { createDecorField } from './decor.js';
import { createAmbientDust, createCloudLayer } from './atmosphere.js';
import { createPatrolRobot } from './PatrolRobot.js';
import { disposeObject } from './clayMaterials.js';
import { inGrid, inPlaza, footprintCenter, cellToWorld } from './gridUtils.js';

const PLACEABLE = ['CRAFT_HOUSE', 'INK_HOUSE', 'SLEEP_HOUSE', 'COIN_GENERATOR', 'MAKEUP_HOUSE'];

function overlapsBuilding(buildings, x, y, w, h) {
  return buildings.some((b) => {
    const bw = b.footprintWidth || 2;
    const bh = b.footprintHeight || 2;
    return x < b.xPos + bw && x + w > b.xPos && y < b.yPos + bh && y + h > b.yPos;
  });
}

export function canPlaceAt(buildings, x, y, w, h) {
  if (!inGrid(x, y) || !inGrid(x + w - 1, y + h - 1)) return false;
  if (inPlaza(x, y, w, h)) return false;
  return !overlapsBuilding(buildings, x, y, w, h);
}

export default function BaseMapScene({
  buildings,
  defenses,
  paintedTiles,
  selectedTool,
  selectedColor,
  selectedBuildingId,
  onCellClick,
  onBuildingClick,
  apiRef,
}) {
  const mountRef = useRef(null);
  const stateRef = useRef({});
  stateRef.current = {
    buildings,
    defenses,
    paintedTiles,
    selectedTool,
    selectedColor,
    selectedBuildingId,
    onCellClick,
    onBuildingClick,
  };
  const worldRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    applySkyVignette(scene);

    const rig = createBaseCameraRig();
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

    scene.add(createBaseLights());
    scene.add(createTerrainSkirt());

    const groundFill = createGroundFill();
    groundFill.updatePaint(stateRef.current.paintedTiles);
    scene.add(groundFill.mesh);

    const snapPlane = createHiddenSnapMesh();
    scene.add(snapPlane);

    scene.add(createDirtPaths());
    scene.add(createGroundDecals());
    scene.add(createCenterPlaza());
    scene.add(createOuterWalls());
    scene.add(createGate());
    scene.add(createCornerPosts());
    scene.add(createDecorField());

    const lighthouse = createLighthouseCore();
    scene.add(lighthouse);
    const spotlight = createSpotlightCone(lighthouse.userData.lampY);
    scene.add(spotlight);
    const beamSweep = createBeamSweep(spotlight);

    const dust = createAmbientDust();
    scene.add(dust.object);
    const clouds = createCloudLayer();
    scene.add(clouds.object);

    const buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);
    const selectRing = createSelectRing();
    scene.add(selectRing);
    const upgradeBadge = createUpgradeBadge();
    scene.add(upgradeBadge);
    const ghost = createPlacementGhost();
    scene.add(ghost.group);

    let patrol = null;

    worldRef.current = {
      scene,
      groundFill,
      buildingsGroup,
      selectRing,
      upgradeBadge,
      setPatrol(active) {
        if (active && !patrol) {
          patrol = createPatrolRobot();
          scene.add(patrol.object);
        } else if (!active && patrol) {
          scene.remove(patrol.object);
          disposeObject(patrol.object);
          patrol = null;
        }
      },
    };

    // ---- Interaction ----
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hover = null; // { cell: {x,y} } | { buildingId }

    const pick = (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, rig.camera);

      const hits = raycaster.intersectObjects([...buildingsGroup.children, snapPlane], true);
      for (const hit of hits) {
        let node = hit.object;
        while (node && node.userData.buildingId === undefined && !node.userData.isSnapPlane) {
          node = node.parent;
        }
        if (node && node.userData.buildingId !== undefined) {
          return { buildingId: node.userData.buildingId };
        }
        if (node && node.userData.isSnapPlane) {
          const { x, y } = {
            x: Math.floor(hit.point.x + 10),
            y: Math.floor(hit.point.z + 10),
          };
          if (inGrid(x, y)) return { cell: { x, y } };
        }
      }
      return null;
    };

    const updateGhost = () => {
      const st = stateRef.current;
      if (!hover) {
        ghost.hide();
        return;
      }
      if (hover.cell && st.selectedTool === 'PAINT') {
        const { wx, wz } = cellToWorld(hover.cell.x, hover.cell.y);
        ghost.showPaint(wx, wz, st.selectedColor);
      } else if (hover.cell && PLACEABLE.includes(st.selectedTool)) {
        const { w, h } = getFootprint(st.selectedTool);
        const ok = canPlaceAt(st.buildings, hover.cell.x, hover.cell.y, w, h);
        const { wx, wz } = footprintCenter(hover.cell.x, hover.cell.y, w, h);
        ghost.showBuilding(wx, wz, w, h, ok);
      } else {
        ghost.hide();
      }
    };

    const onPointerMove = (e) => {
      hover = pick(e);
      canvas.style.cursor = hover ? 'pointer' : 'default';
      updateGhost();
    };

    const onClick = (e) => {
      const target = pick(e);
      const st = stateRef.current;
      if (!target) return;
      if (target.buildingId !== undefined && st.onBuildingClick) st.onBuildingClick(target.buildingId);
      else if (target.cell && st.onCellClick) st.onCellClick(target.cell.x, target.cell.y);
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('click', onClick);

    if (apiRef) {
      apiRef.current = {
        zoomIn: () => rig.zoomIn(),
        zoomOut: () => rig.zoomOut(),
      };
    }

    // ---- Resize: canvas is absolute inset-0; camera reframes to keep the map filling the screen ----
    const resize = () => {
      const w = Math.floor(mount.clientWidth);
      const h = Math.floor(mount.clientHeight);
      if (w < 2 || h < 2) return;
      if (w === resize.lastW && h === resize.lastH) return;
      resize.lastW = w;
      resize.lastH = h;
      renderer.setSize(w, h, false);
      rig.resize(w, h);
    };
    resize.lastW = 0;
    resize.lastH = 0;
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // ---- Loop ----
    let raf = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      const elapsed = clock.getElapsedTime();
      beamSweep.update(elapsed);
      dust.update(elapsed);
      clouds.update(elapsed);
      if (patrol) patrol.update(elapsed);
      selectRing.rotation.z = elapsed * 0.6;
      if (upgradeBadge.visible) {
        upgradeBadge.position.y = upgradeBadge.userData.baseY + Math.sin(elapsed * 2.2) * 0.08;
        upgradeBadge.rotation.y = elapsed * 1.4;
      }
      renderer.render(scene, rig.camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('click', onClick);
      if (apiRef) apiRef.current = null;
      renderer.dispose();
      if (canvas.parentNode === mount) mount.removeChild(canvas);
      groundFill.dispose();
      disposeObject(scene);
      worldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild building meshes when the roster changes
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    const group = world.buildingsGroup;
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      disposeObject(child);
    }
    buildings.forEach((b) => {
      const w = b.footprintWidth || 2;
      const h = b.footprintHeight || 2;
      const house = buildHouse(b.buildingType, b.hexColor, b.level || 1);
      const { wx, wz } = footprintCenter(b.xPos, b.yPos, w, h);
      house.position.set(wx, 0, wz);
      house.userData.buildingId = b.id;
      group.add(house);
    });
  }, [buildings]);

  // Repaint ground splats
  useEffect(() => {
    const world = worldRef.current;
    if (world) world.groundFill.updatePaint(paintedTiles);
  }, [paintedTiles]);

  // Selection ring + upgrade badge follow the selected building
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    const building = buildings.find((b) => b.id === selectedBuildingId);
    if (!building) {
      world.selectRing.visible = false;
      world.upgradeBadge.visible = false;
      return;
    }
    const w = building.footprintWidth || 2;
    const h = building.footprintHeight || 2;
    const { wx, wz } = footprintCenter(building.xPos, building.yPos, w, h);
    world.selectRing.visible = true;
    world.selectRing.position.set(wx, 0.06, wz);
    const scale = Math.max(w, h) * 0.62;
    world.selectRing.scale.set(scale, scale, 1);

    const canUpgrade = (building.level || 1) < 3;
    world.upgradeBadge.visible = canUpgrade;
    if (canUpgrade) {
      const baseY = 2.4 + (building.level || 1) * 0.15;
      world.upgradeBadge.userData.baseY = baseY;
      world.upgradeBadge.position.set(wx, baseY, wz);
    }
  }, [selectedBuildingId, buildings]);

  // Patrol robot appears with the defense
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    world.setPatrol(defenses.some((d) => (d.type || d.defenseType) === 'PATROL_ROBOT'));
  }, [defenses]);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />;
}
