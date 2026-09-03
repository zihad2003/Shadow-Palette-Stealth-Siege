import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createMapCamera, applyMapZoom } from '../../worldmap/MapCameraRig.js';
import { composeIsland } from '../../worldmap/composeIsland.js';
import { tintPlotField } from '../../worldmap/PlotField.js';
import { placePlotSelectRing } from '../../worldmap/PlotSelectRing.js';
import { createMapRaycaster } from '../../worldmap/MapRaycaster.js';
import { soundEngine } from '../../soundEngine.js';

export default function WorldMapScene({
  plots,
  selectedPlot,
  hoveredPlotId,
  onHoverPlot,
  onSelectPlot,
  zoomScale,
}) {
  const mountRef = useRef(null);
  const threeRef = useRef(null);
  const plotsRef = useRef(plots);
  plotsRef.current = plots;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d1b1e');
    scene.fog = new THREE.Fog('#0d1b1e', 22, 48);

    const camera = createMapCamera(1);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    mount.style.overflow = 'hidden';
    mount.appendChild(canvas);

    const { root, plotsGroup, selectRing } = composeIsland(plotsRef.current);
    scene.add(root);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.autoRotate = false;
    controls.minDistance = 12;
    controls.maxDistance = 32;
    controls.minPolarAngle = Math.PI / 4.4;
    controls.maxPolarAngle = Math.PI / 2.7;
    controls.target.set(0, 0.35, 0);

    const api = { scene, camera, renderer, controls, root, plotsGroup, selectRing };
    threeRef.current = api;

    const resize = () => {
      const w = Math.floor(mount.clientWidth);
      const h = Math.floor(mount.clientHeight);
      if (w < 2 || h < 2) return;
      if (w === resize.lastW && h === resize.lastH) return;
      resize.lastW = w;
      resize.lastH = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize.lastW = 0;
    resize.lastH = 0;
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const detachRay = createMapRaycaster(canvas, camera, plotsGroup, {
      onHover: (id) => onHoverPlot?.(id),
      onSelect: (id) => {
        soundEngine.playClickSound();
        const plot = plotsRef.current.find((p) => p.id === id);
        if (plot) onSelectPlot?.(plot);
      },
    });

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      const t = clock.getElapsedTime();
      const clouds = root.getObjectByName('CloudLayer');
      if (clouds) clouds.rotation.y = t * 0.015;
      const ripples = root.getObjectByName('WaterRipples');
      if (ripples) {
        ripples.children.forEach((ring) => {
          ring.rotation.z = t * (ring.userData.speed || 0.08);
        });
      }
      const dust = root.getObjectByName('AmbientDust');
      if (dust) dust.rotation.y = t * 0.02;
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      detachRay();
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (canvas.parentNode === mount) mount.removeChild(canvas);
      scene.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else if (child.material) child.material.dispose();
        }
      });
      threeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const api = threeRef.current;
    if (!api) return;
    applyMapZoom(api.camera, zoomScale);
  }, [zoomScale]);

  useEffect(() => {
    const api = threeRef.current;
    if (!api) return;
    tintPlotField(api.plotsGroup, plots, hoveredPlotId, selectedPlot?.id);
    placePlotSelectRing(api.selectRing, selectedPlot);
  }, [plots, hoveredPlotId, selectedPlot]);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
}
