import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { COLORS } from '../../colors.js';

function clayMat(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.48,
    metalness: 0.05,
  });
}

function statusColor(status) {
  if (status === 'CLAIMED_SELF') return COLORS.BLUE;
  if (status === 'CLAIMED_ENEMY') return COLORS.RED;
  return COLORS.GREEN;
}

function buildPlot(status) {
  const group = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.2, 1.85), clayMat(statusColor(status)));
  pad.position.y = 0.1;
  pad.castShadow = true;
  pad.receiveShadow = true;
  group.add(pad);

  const rim = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.08, 2.05), clayMat('#0D1B1E'));
  rim.position.y = 0.02;
  group.add(rim);

  const house = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.55, 0.72), clayMat(COLORS.WHITE));
  house.position.y = 0.48;
  house.castShadow = true;
  group.add(house);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.42, 4), clayMat('#F4A261'));
  roof.position.y = 0.96;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  return group;
}

export default function PlotPreview({ status = 'UNCLAIMED', className = '' }) {
  const mountRef = useRef(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
    camera.position.set(2.5, 2.6, 2.5);
    camera.lookAt(0, 0.35, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    mount.style.overflow = 'hidden';
    mount.appendChild(canvas);

    scene.add(new THREE.HemisphereLight(0xf1faee, 0x0d1b1e, 0.9));
    const key = new THREE.DirectionalLight(0xffe6c8, 1.05);
    key.position.set(3, 5, 2);
    key.castShadow = true;
    scene.add(key);

    let plot = buildPlot(statusRef.current);
    scene.add(plot);

    const draw = () => renderer.render(scene, camera);

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
      draw();
    };
    resize.lastW = 0;
    resize.lastH = 0;
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let last = statusRef.current;
    const poll = window.setInterval(() => {
      if (statusRef.current === last) return;
      last = statusRef.current;
      scene.remove(plot);
      plot.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
      plot = buildPlot(last);
      scene.add(plot);
      draw();
    }, 250);

    return () => {
      window.clearInterval(poll);
      ro.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      scene.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
    };
  }, []);

  return <div ref={mountRef} className={`w-full h-full ${className}`} aria-hidden="true" />;
}
