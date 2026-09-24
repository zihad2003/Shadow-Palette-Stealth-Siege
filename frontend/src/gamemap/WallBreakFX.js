import * as THREE from 'three';
import { TILE_HEIGHT, tileWorldPos, MAP_COLS, MAP_ROWS } from './mapConfig.js';
import { WALL_X, WALL_Z } from './FortressBorder.js';

function outwardNormal(column, row) {
  if (row <= 0) return { x: 0, z: -1 };
  if (row >= MAP_ROWS - 1) return { x: 0, z: 1 };
  if (column <= 0) return { x: -1, z: 0 };
  if (column >= MAP_COLS - 1) return { x: 1, z: 0 };
  return { x: 0, z: 1 };
}

function wallAnchor(column, row) {
  const p = tileWorldPos(column, row);
  const n = outwardNormal(column, row);
  return {
    x: n.x < 0 ? -WALL_X : n.x > 0 ? WALL_X : p.x,
    y: TILE_HEIGHT + 0.55,
    z: n.z < 0 ? -WALL_Z : n.z > 0 ? WALL_Z : p.z,
    nx: n.x,
    nz: n.z,
  };
}

function grayMat(hex, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness: 0.82,
    metalness: 0.04,
    ...extras,
  });
}

/**
 * Clay brick shatter + real wall hole. Call play() on each F-hit; tick(dt) every frame.
 */
export function createWallBreakFX(scene, border) {
  const root = new THREE.Group();
  root.name = 'WallBreakFX';
  scene.add(root);

  const shards = [];
  const cracks = [];
  const flashes = [];
  let cameraShake = 0;
  let punch = 0;

  const shardGeos = [
    new THREE.BoxGeometry(0.28, 0.16, 0.2),
    new THREE.BoxGeometry(0.18, 0.22, 0.14),
    new THREE.BoxGeometry(0.34, 0.12, 0.16),
    new THREE.BoxGeometry(0.14, 0.14, 0.26),
  ];
  const dustGeo = new THREE.SphereGeometry(0.1, 7, 7);
  const sparkGeo = new THREE.SphereGeometry(0.045, 6, 6);
  const woodGeo = new THREE.BoxGeometry(0.22, 0.08, 0.06);

  function spawnShard({ x, y, z, nx, nz, wood = false, final = false }) {
    const geo = wood ? woodGeo : shardGeos[(Math.random() * shardGeos.length) | 0];
    const mat = wood
      ? grayMat(Math.random() > 0.5 ? '#6b4a2e' : '#4a3424')
      : grayMat(Math.random() > 0.5 ? '#8a8782' : '#5e5b56');
    const mesh = new THREE.Mesh(geo, mat);
    const s = 0.7 + Math.random() * (final ? 1.4 : 0.8);
    mesh.scale.setScalar(s);
    mesh.position.set(x, y + Math.random() * 0.45, z);
    mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    mesh.castShadow = true;
    const speed = (final ? 4.2 : 2.4) + Math.random() * 3.6;
    const side = (Math.random() - 0.5) * 2.8;
    shards.push({
      mesh,
      vx: nx * speed + (nz !== 0 ? side : (Math.random() - 0.5) * 1.4),
      vy: 2.6 + Math.random() * (final ? 5.2 : 3.2),
      vz: nz * speed + (nx !== 0 ? side : (Math.random() - 0.5) * 1.4),
      spin: (Math.random() - 0.5) * 16,
      life: 1.15 + Math.random() * 0.7,
      age: 0,
      bounce: 1,
    });
    root.add(mesh);
  }

  function spawnDust(a, final) {
    const n = final ? 16 : 8;
    for (let i = 0; i < n; i++) {
      const dust = new THREE.Mesh(
        dustGeo,
        new THREE.MeshStandardMaterial({
          color: '#c4bdb4',
          transparent: true,
          opacity: 0.62,
          roughness: 1,
          depthWrite: false,
        })
      );
      dust.position.set(a.x + (Math.random() - 0.5) * 0.4, a.y + 0.15, a.z + (Math.random() - 0.5) * 0.4);
      shards.push({
        mesh: dust,
        vx: a.nx * 0.5 + (Math.random() - 0.5) * 1.3,
        vy: 0.9 + Math.random() * 1.8,
        vz: a.nz * 0.5 + (Math.random() - 0.5) * 1.3,
        spin: 0,
        life: 0.5 + Math.random() * 0.45,
        age: 0,
        dust: true,
      });
      root.add(dust);
    }
  }

  function spawnSparks(a, count) {
    for (let i = 0; i < count; i++) {
      const spark = new THREE.Mesh(
        sparkGeo,
        new THREE.MeshBasicMaterial({ color: 0xffc078, transparent: true, opacity: 1 })
      );
      spark.position.set(a.x, a.y + 0.2, a.z);
      shards.push({
        mesh: spark,
        vx: a.nx * 3 + (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 5,
        vz: a.nz * 3 + (Math.random() - 0.5) * 4,
        spin: 8,
        life: 0.28 + Math.random() * 0.18,
        age: 0,
        spark: true,
      });
      root.add(spark);
    }
  }

  function spawnShock(a, final) {
    const crack = new THREE.Mesh(
      new THREE.RingGeometry(0.12, final ? 0.85 : 0.5, 22),
      new THREE.MeshBasicMaterial({
        color: final ? 0xff8a4a : 0xfff3d6,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    crack.position.set(a.x - a.nx * 0.04, a.y, a.z - a.nz * 0.04);
    if (Math.abs(a.nx) > 0.5) crack.rotation.y = Math.PI / 2;
    else crack.rotation.x = -Math.PI / 2;
    root.add(crack);
    cracks.push({ mesh: crack, age: 0, life: final ? 0.85 : 0.42, final });
  }

  function spawnFlash(a) {
    const flash = new THREE.PointLight(0xffc078, 2.8, 8, 2);
    flash.position.set(a.x, a.y + 0.3, a.z);
    root.add(flash);
    flashes.push({ light: flash, age: 0, life: 0.18 });
  }

  function damageBricks(a, hits, final) {
    const list = border?.userData?.bricks || [];
    const radius = 1.7 + hits * 0.9;
    const knock = final ? 99 : Math.min(5, 1 + hits);
    let taken = 0;
    for (let i = 0; i < list.length; i++) {
      const brick = list[i];
      if (!brick.visible || !brick.userData.intact) continue;
      const dx = brick.position.x - a.x;
      const dy = brick.position.y - a.y;
      const dz = brick.position.z - a.z;
      const d = Math.hypot(dx, dy * 0.6, dz);
      if (d > radius) continue;
      brick.userData.hp = (brick.userData.hp || 4) - 1;
      brick.rotation.z += (Math.random() - 0.5) * 0.12;
      brick.position.x += a.nx * 0.04;
      brick.position.z += a.nz * 0.04;
      if (brick.material && brick.material.color) {
        if (!brick.userData.ownMat) {
          brick.material = brick.material.clone();
          brick.userData.ownMat = true;
        }
        brick.material.color.multiplyScalar(0.86);
      }
      const shouldKnock = final || (brick.userData.hp <= 0 && taken < knock) || (d < 0.55 && taken < knock);
      if (shouldKnock) {
        brick.visible = false;
        brick.userData.intact = false;
        taken += 1;
        spawnShard({
          x: brick.position.x,
          y: brick.position.y,
          z: brick.position.z,
          nx: a.nx,
          nz: a.nz,
          final,
        });
      }
    }
  }

  function smashGateParts(a, final) {
    const gate = border?.userData?.gate;
    if (!gate) return;
    [gate.bar, gate.rail].forEach((mesh, i) => {
      if (!mesh || !mesh.visible) return;
      mesh.rotation.z = (Math.random() - 0.5) * (0.18 + (final ? 0.4 : 0));
      mesh.position.z = WALL_Z + a.nz * (0.04 * (i + 1));
      if (final) {
        mesh.visible = false;
        for (let k = 0; k < 8; k++) {
          spawnShard({
            x: mesh.position.x + (Math.random() - 0.5),
            y: mesh.position.y,
            z: mesh.position.z,
            nx: a.nx,
            nz: a.nz,
            wood: true,
            final: true,
          });
        }
      }
    });
    const p = gate.portcullis;
    if (p && p.visible) {
      p.rotation.x = (Math.random() - 0.5) * 0.08;
      p.position.y += final ? 0 : 0.04;
      if (final) {
        p.visible = false;
        p.userData.smashed = true;
        for (let k = 0; k < 10; k++) {
          spawnShard({
            x: a.x + (Math.random() - 0.5) * 1.2,
            y: a.y + Math.random() * 0.6,
            z: a.z,
            nx: a.nx,
            nz: a.nz,
            final: true,
          });
        }
      }
    }
    gate.banners?.forEach((b) => {
      b.userData.flap = final ? 1.4 : 0.7;
    });
  }

  function spawnHole(a) {
    const hole = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 1.35, 0.55),
      new THREE.MeshStandardMaterial({
        color: '#141210',
        roughness: 1,
        transparent: true,
        opacity: 0.96,
      })
    );
    hole.position.set(a.x - a.nx * 0.18, TILE_HEIGHT + 0.52, a.z - a.nz * 0.18);
    if (Math.abs(a.nx) > 0.5) hole.rotation.y = Math.PI / 2;
    root.add(hole);

    for (let i = 0; i < 6; i++) {
      const rubble = new THREE.Mesh(shardGeos[i % shardGeos.length], grayMat('#6a6660'));
      const along = (i / 5 - 0.5) * 1.1;
      rubble.position.set(
        a.x + a.nz * along + a.nx * 0.35,
        0.12,
        a.z + a.nx * along + a.nz * 0.35
      );
      rubble.rotation.set(Math.random(), Math.random(), Math.random());
      rubble.scale.setScalar(0.7 + Math.random() * 0.6);
      root.add(rubble);
    }
  }

  function spawnBurst(column, row, { final = false, hits = 1, gate = false } = {}) {
    const a = wallAnchor(column, row);
    // Stronger punch/shake as breakProgress climbs — each F-hit must read on camera.
    punch = final ? 1.15 : 0.55 + hits * 0.14;
    cameraShake = final ? 0.95 : 0.32 + hits * 0.1;
    if (border) border.userData.shake = Math.max(border.userData.shake || 0, final ? 1.0 : 0.3 + hits * 0.12);

    // Persistent fissure that grows with hits so the wall visibly crumbles.
    const crackScale = 0.35 + hits * 0.28;
    const fissure = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08 + hits * 0.12, 0.55 + hits * 0.35),
      new THREE.MeshBasicMaterial({
        color: 0x1a1210,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    fissure.position.set(a.x - a.nx * 0.02, a.y, a.z - a.nz * 0.02);
    if (Math.abs(a.nx) > 0.5) fissure.rotation.y = Math.PI / 2;
    fissure.scale.setScalar(crackScale);
    root.add(fissure);
    cracks.push({ mesh: fissure, age: 0, life: final ? 0.01 : 12, final: false, persist: !final });

    const flying = final ? 34 : 14 + hits * 4;
    for (let i = 0; i < flying; i++) {
      spawnShard({ x: a.x, y: a.y, z: a.z, nx: a.nx, nz: a.nz, wood: gate && i % 3 === 0, final });
    }
    spawnDust(a, final);
    spawnSparks(a, final ? 22 : 8 + hits * 3);
    spawnShock(a, final);
    spawnFlash(a);

    if (gate) smashGateParts(a, final);
    else damageBricks(a, hits, final);

    if (final && !gate) spawnHole(a);
  }

  function tick(dt, camera) {
    cameraShake = Math.max(0, cameraShake - dt * 1.2);
    punch = Math.max(0, punch - dt * 1.85);

    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i];
      s.age += dt;
      s.vy -= (s.spark ? 10 : 16) * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      s.mesh.rotation.x += s.spin * dt;
      s.mesh.rotation.z += s.spin * 0.7 * dt;
      if (s.dust) {
        const t = s.age / s.life;
        s.mesh.scale.setScalar(1 + t * 3.4);
        if (s.mesh.material) s.mesh.material.opacity = Math.max(0, 0.62 * (1 - t));
      } else if (s.spark) {
        const t = s.age / s.life;
        if (s.mesh.material) s.mesh.material.opacity = Math.max(0, 1 - t);
        s.mesh.scale.setScalar(1.2 * (1 - t));
      } else if (s.mesh.position.y < 0.08 && s.bounce > 0 && s.vy < 0) {
        s.vy *= -0.32;
        s.vx *= 0.6;
        s.vz *= 0.6;
        s.bounce -= 1;
        s.mesh.position.y = 0.08;
      }
      if (s.age >= s.life || s.mesh.position.y < -1.4) {
        root.remove(s.mesh);
        if (s.dust || s.spark) {
          s.mesh.geometry?.dispose?.();
          s.mesh.material?.dispose?.();
        } else {
          s.mesh.material?.dispose?.();
        }
        shards.splice(i, 1);
      }
    }

    for (let i = cracks.length - 1; i >= 0; i--) {
      const c = cracks[i];
      c.age += dt;
      if (c.persist) {
        // Keep fissure visible; gentle opacity breathe so it reads as damage.
        if (c.mesh.material) {
          c.mesh.material.opacity = 0.72 + Math.sin(c.age * 3) * 0.08;
        }
        continue;
      }
      const t = c.age / c.life;
      c.mesh.scale.setScalar(1 + t * (c.final ? 3.2 : 1.8));
      c.mesh.material.opacity = Math.max(0, 0.95 * (1 - t) * (1 - t));
      if (c.age >= c.life) {
        root.remove(c.mesh);
        c.mesh.geometry.dispose();
        c.mesh.material.dispose();
        cracks.splice(i, 1);
      }
    }

    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.age += dt;
      f.light.intensity = 3.4 * Math.max(0, 1 - f.age / f.life);
      if (f.age >= f.life) {
        root.remove(f.light);
        flashes.splice(i, 1);
      }
    }

    if (camera && cameraShake > 0.001) {
      const mag = cameraShake * 0.22;
      camera.position.x += (Math.random() - 0.5) * mag;
      camera.position.y += (Math.random() - 0.5) * mag * 0.75;
      camera.position.z += (Math.random() - 0.5) * mag;
    }

    return { punch, cameraShake };
  }

  return {
    play: spawnBurst,
    tick,
    get punch() {
      return punch;
    },
  };
}

export default createWallBreakFX;
