import * as THREE from 'three';
import { MAP_COLORS, RAID_COLORS } from './mapConfig.js';

// ─── Northern-lights sky dome ─────────────────────────────────────────────
// Huge inverted sphere with a procedural shader: gradient night sky, twinkling
// stars, and slow aurora curtains rolling across the northern (-Z) horizon.
// Horizon colour matches the scene fog so the terrain still melts into it.

const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform float uTime;
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform float uIntensity;
  uniform float uGray;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += amp * noise(p);
      p = rot * p * 2.05 + vec2(3.1, 1.7);
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, 0.0, 1.0);

    // Night gradient
    vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.55, h));

    // Longitude measured from north (-Z) so the atan seam lands behind the camera (+Z)
    float lon = atan(d.x, -d.z) / 3.14159265; // 0 = north, ±1 = south
    float lat = asin(clamp(d.y, -1.0, 1.0));

    // Stars — small round points, only well above the horizon so fog never fights them
    vec2 sp = vec2(lon * 3.14159265 * 26.0, lat * 26.0);
    vec2 cell = floor(sp);
    vec2 f = fract(sp) - 0.5;
    float sh = hash(cell);
    float size = 0.06 + 0.06 * hash(cell + 2.1);
    float point = 1.0 - smoothstep(0.0, size, length(f));
    float star = point * step(0.972, sh) * smoothstep(0.04, 0.25, h);
    float twinkle = 0.55 + 0.45 * sin(uTime * 1.6 + hash(cell + 7.3) * 6.2831);
    col += vec3(0.85, 0.92, 1.0) * star * twinkle;

    // Aurora curtains — widest over the northern horizon, fading toward east/west
    float north = 1.0 - smoothstep(0.25, 0.75, abs(lon));
    float elev = smoothstep(0.06, 0.26, h) * (1.0 - smoothstep(0.5, 0.92, h));

    float band = 0.0;
    for (int i = 0; i < 2; i++) {
      float fi = float(i);
      vec2 p = vec2(lon * 3.4 + fi * 1.9 + uTime * (0.025 + fi * 0.012), h * 2.2 - uTime * 0.035 + fi * 4.0);
      float curtain = smoothstep(0.42, 0.72, fbm(p));
      // Fine vertical rays rippling along the curtain
      float rays = 0.5 + 0.5 * fbm(vec2(lon * 34.0 + fi * 3.0 + uTime * 0.12, h * 2.0 + fi));
      band += curtain * rays * (1.0 - fi * 0.35);
    }
    band *= elev * north;

    // Green at the base, teal/violet toward the top, pink fringe
    vec3 aurora = mix(vec3(0.16, 0.95, 0.55), vec3(0.3, 0.55, 1.0), smoothstep(0.15, 0.45, h));
    aurora = mix(aurora, vec3(0.75, 0.35, 0.95), smoothstep(0.4, 0.75, h) * 0.7);
    col += aurora * band * uIntensity;

    // Soft glow haze under the curtain so it does not float on black
    col += vec3(0.1, 0.45, 0.35) * band * 0.25 * uIntensity;

    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(col, vec3(l), uGray);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * @param {{ radius: number, grayscale?: boolean }} opts
 * @returns {{ object: THREE.Mesh, update(elapsed: number): void, dispose(): void }}
 */
export function createAuroraSky({ radius, grayscale = false }) {
  const palette = grayscale ? RAID_COLORS : MAP_COLORS;
  const horizon = new THREE.Color(palette.sky);
  const zenith = horizon.clone().multiplyScalar(0.6);

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uHorizon: { value: horizon },
      uZenith: { value: zenith },
      uIntensity: { value: grayscale ? 0.45 : 1.2 },
      uGray: { value: grayscale ? 1 : 0 },
    },
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });

  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 22), material);
  dome.name = 'AuroraSky';
  dome.frustumCulled = false;
  dome.renderOrder = -1000;
  dome.userData.keepColor = true;
  dome.matrixAutoUpdate = false;
  dome.updateMatrix();

  return {
    object: dome,
    update(elapsed) {
      material.uniforms.uTime.value = elapsed;
    },
    dispose() {
      dome.geometry.dispose();
      material.dispose();
    },
  };
}
