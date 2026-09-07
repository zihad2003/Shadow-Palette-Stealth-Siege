import React, { useEffect, useRef } from 'react';
import { buildCharacter, tickCharacter } from '../../character/buildCharacter.js';
import * as THREE from 'three';

function clayMat(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.48,
    metalness: 0.05,
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

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 24);
    camera.position.set(0.55, 1.45, 4.4);
    camera.lookAt(0, 1.05, 0);

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
    const key = new THREE.DirectionalLight(0xffe0c2, 1.25);
    key.position.set(2.6, 4.4, 3.4);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8d5cc7, 0.4);
    rim.position.set(-2.8, 2.2, -2);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0x72b83f, 0.28);
    fill.position.set(-2.2, 1.2, 1.5);
    scene.add(fill);

    const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.25, 0.16, 36), clayMat('#152428'));
    ground.position.y = -0.08;
    ground.receiveShadow = true;
    scene.add(ground);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.03, 10, 40),
      clayMat('#F4A261', { transparent: true, opacity: 0.55 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

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
      const elapsed = clock.getElapsedTime();
      const sig = `${stateRef.current.characterModel}:${stateRef.current.camoColor}`;
      if (sig !== lastSig) {
        lastSig = sig;
        rebuild();
      }
      figure.rotation.y = elapsed * 0.35;
      figure.position.y = Math.sin(elapsed * 1.6) * 0.02;
      tickCharacter(figure, elapsed);
      ring.rotation.z = elapsed * 0.25;
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
