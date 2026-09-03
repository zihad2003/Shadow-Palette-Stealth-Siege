import React, { useEffect, useRef } from 'react';
import { buildCharacter } from '../../character/buildCharacter.js';
import * as THREE from 'three';

function clayMat(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.44,
    metalness: 0.06,
    ...extras,
  });
}

export default function CharacterPreview({
  characterModel = 1,
  camoColor = 'BLUE',
  className = '',
}) {
  const mountRef = useRef(null);
  const stateRef = useRef({ characterModel, camoColor });
  stateRef.current = { characterModel, camoColor };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
    camera.position.set(0, 1.35, 4.2);
    camera.lookAt(0, 0.95, 0);

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

    scene.add(new THREE.HemisphereLight(0xf1faee, 0x0d1b1e, 0.95));
    const key = new THREE.DirectionalLight(0xffe0c2, 1.15);
    key.position.set(2.4, 4.2, 3.2);
    key.castShadow = true;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x72b83f, 0.35);
    fill.position.set(-3, 1.5, -1);
    scene.add(fill);

    const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.18, 32), clayMat('#152428'));
    ground.position.y = -0.09;
    ground.receiveShadow = true;
    scene.add(ground);

    let figure = buildCharacter(stateRef.current.characterModel, stateRef.current.camoColor);
    scene.add(figure);

    const rebuild = () => {
      scene.remove(figure);
      figure.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
      figure = buildCharacter(stateRef.current.characterModel, stateRef.current.camoColor);
      scene.add(figure);
    };

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

    let lastSig = `${stateRef.current.characterModel}:${stateRef.current.camoColor}`;
    let raf = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      const sig = `${stateRef.current.characterModel}:${stateRef.current.camoColor}`;
      if (sig !== lastSig) {
        lastSig = sig;
        rebuild();
      }
      figure.rotation.y = Math.sin(clock.getElapsedTime() * 0.35) * 0.18;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      scene.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else if (child.material) child.material.dispose();
        }
      });
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`w-full h-full min-h-[220px] ${className}`}
      aria-hidden="true"
    />
  );
}
