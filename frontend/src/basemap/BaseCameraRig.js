import * as THREE from 'three';

// Isometric-feel camera framed so the walled base fills the viewport.
// The terrain skirt runs past the frustum edges, so there is never empty
// background around the village.
const AZIMUTH = Math.PI / 4;
const ELEVATION = 0.66; // radians above horizon
const FIT_RADIUS = 14.5; // sphere around the walls we keep inside the smaller axis

export function createBaseCameraRig() {
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 220);
  let zoom = 1;

  const apply = (aspect) => {
    camera.aspect = aspect;
    const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const halfFov = Math.min(vHalf, hHalf);
    const dist = (FIT_RADIUS / Math.sin(halfFov)) * zoom;

    const y = Math.sin(ELEVATION) * dist;
    const ground = Math.cos(ELEVATION) * dist;
    camera.position.set(Math.sin(AZIMUTH) * ground, y, Math.cos(AZIMUTH) * ground);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };

  return {
    camera,
    resize(width, height) {
      apply(width / Math.max(1, height));
    },
    zoomIn() {
      zoom = Math.max(0.62, zoom * 0.82);
      apply(camera.aspect);
    },
    zoomOut() {
      zoom = Math.min(1.5, zoom / 0.82);
      apply(camera.aspect);
    },
  };
}
