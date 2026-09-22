import React, { useEffect, useRef } from 'react';
import { buildCharacter, tickCharacter, CHAR_MESH_REV } from '../../character/buildCharacter.js';
import * as THREE from 'three';

function clayMat(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.02,
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
    scene.background = new THREE.Color('#C9C2B6');

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 24);
    camera.position.set(1.28, 0.92, 2.95);
    camera.lookAt(0, 0.78, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    mount.style.overflow = 'hidden';
    mount.appendChild(canvas);

    scene.add(new THREE.HemisphereLight(0xf5efe6, 0x8a8478, 0.9));
    const key = new THREE.DirectionalLight(0xfff6ea, 1.05);
    key.position.set(2.2, 4.4, 3.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.38);
    fill.position.set(-2.4, 1.8, 1.6);
    scene.add(fill);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(1.15, 40), clayMat('#B7AFA3'));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    const contact = new THREE.Mesh(
      new THREE.CircleGeometry(0.28, 24),
      new THREE.MeshBasicMaterial({ color: '#8A8478', transparent: true, opacity: 0.28, depthWrite: false })
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.004;
    scene.add(contact);

    let figure = buildCharacter(stateRef.current.characterModel, stateRef.current.camoColor);
    figure.rotation.y = 0.62;
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
      figure.rotation.y = 0.62;
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

    let lastSig = `${stateRef.current.characterModel}:${stateRef.current.camoColor}:${CHAR_MESH_REV}`;
    let raf = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      const dt = clock.getDelta();
      const elapsed = clock.elapsedTime;
      const sig = `${stateRef.current.characterModel}:${stateRef.current.camoColor}:${CHAR_MESH_REV}`;
      if (sig !== lastSig) {
        lastSig = sig;
        rebuild();
      }
      figure.rotation.y = 0.62;
      tickCharacter(figure, elapsed, { dt, speed: 0.85 });
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
