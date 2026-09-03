import * as THREE from 'three';
import { createMapLights } from './MapLights.js';
import { createOcean } from './Ocean.js';
import { createWaterRipples } from './WaterRipples.js';
import { createShoreFoam } from './ShoreFoam.js';
import { createIslandBody } from './IslandBody.js';
import { createBeachRing } from './BeachRing.js';
import { createCliffShelf } from './CliffShelf.js';
import { createStonePlaza } from './StonePlaza.js';
import { createInnerRoadRing } from './InnerRoadRing.js';
import { createSpokeRoads } from './SpokeRoads.js';
import { createHarborDock } from './HarborDock.js';
import { createPlotField } from './PlotField.js';
import { createPlotSelectRing } from './PlotSelectRing.js';
import { createPineTree, createCherryTree, createRockCluster, createSeaStack, createCloudLayer, createAmbientDust } from './nature.js';
import { createGateArch, createBridgeSpan, createBannerPole, createCenterFountain, createFogHaze } from './decor.js';
import { createWatchtowerProp } from './buildings.js';

function ringScatter(count, radius, factory, y = 0.48) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + 0.17;
    const jitter = 0.35 + (i % 3) * 0.12;
    const obj = factory();
    obj.position.set(Math.cos(a) * (radius + jitter * 0.2), y, Math.sin(a) * (radius + jitter * 0.2));
    obj.rotation.y = a;
    obj.scale.setScalar(0.85 + (i % 4) * 0.08);
    group.add(obj);
  }
  return group;
}

export function composeIsland(plots) {
  const root = new THREE.Group();
  root.name = 'IslandRoot';

  root.add(createMapLights());
  root.add(createOcean());
  root.add(createWaterRipples());
  root.add(createShoreFoam());
  root.add(createFogHaze());
  root.add(createBeachRing());
  root.add(createIslandBody());
  root.add(createCliffShelf());
  root.add(createStonePlaza());
  root.add(createCenterFountain());
  root.add(createInnerRoadRing());
  root.add(createSpokeRoads());
  root.add(createHarborDock());
  root.add(createGateArch());
  root.add(createBridgeSpan());

  const pines = ringScatter(14, 7.15, createPineTree);
  pines.name = 'PineBelt';
  root.add(pines);

  const cherries = ringScatter(6, 6.4, createCherryTree, 0.48);
  cherries.name = 'CherryBelt';
  root.add(cherries);

  const rocks = ringScatter(8, 8.2, createRockCluster, 0.05);
  rocks.name = 'RockBelt';
  root.add(rocks);

  const stacks = new THREE.Group();
  stacks.name = 'SeaStacks';
  [0.8, 2.4, 4.1].forEach((a) => {
    const stack = createSeaStack();
    stack.position.set(Math.cos(a) * 10.2, -0.15, Math.sin(a) * 10.2);
    stacks.add(stack);
  });
  root.add(stacks);

  const banner = createBannerPole();
  banner.position.set(0.9, 0.48, 0.2);
  root.add(banner);

  const tower = createWatchtowerProp();
  tower.position.set(-1.1, 0.48, -0.4);
  root.add(tower);

  root.add(createCloudLayer());
  root.add(createAmbientDust());

  const plotsGroup = createPlotField(plots);
  root.add(plotsGroup);

  const selectRing = createPlotSelectRing();
  root.add(selectRing);

  return { root, plotsGroup, selectRing };
}
