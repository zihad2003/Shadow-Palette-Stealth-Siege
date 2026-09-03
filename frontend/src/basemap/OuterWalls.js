import * as THREE from 'three';
import { clayMat, BASE_CLAY } from './clayMaterials.js';
import { HALF } from './gridUtils.js';

const WALL_H = 1.1;
const WALL_T = 0.7;
const EDGE = HALF + 0.6;
const GATE_W = 3.2; // opening on the south wall

function wallSegment(length, mat, topMat) {
  const seg = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(length, WALL_H, WALL_T), mat);
  body.position.y = WALL_H / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  seg.add(body);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(length, 0.16, WALL_T + 0.18), topMat);
  cap.position.y = WALL_H + 0.08;
  cap.castShadow = true;
  seg.add(cap);
  return seg;
}

export function createOuterWalls() {
  const group = new THREE.Group();
  const mat = clayMat(BASE_CLAY.wall);
  const topMat = clayMat(BASE_CLAY.wallTop);
  const span = EDGE * 2;

  const north = wallSegment(span, mat, topMat);
  north.position.set(0, 0, -EDGE);
  group.add(north);

  const west = wallSegment(span, mat, topMat);
  west.rotation.y = Math.PI / 2;
  west.position.set(-EDGE, 0, 0);
  group.add(west);

  const east = wallSegment(span, mat, topMat);
  east.rotation.y = Math.PI / 2;
  east.position.set(EDGE, 0, 0);
  group.add(east);

  // South wall split around the gate opening
  const sideLen = (span - GATE_W) / 2;
  const southLeft = wallSegment(sideLen, mat, topMat);
  southLeft.position.set(-(GATE_W / 2 + sideLen / 2), 0, EDGE);
  group.add(southLeft);
  const southRight = wallSegment(sideLen, mat, topMat);
  southRight.position.set(GATE_W / 2 + sideLen / 2, 0, EDGE);
  group.add(southRight);

  return group;
}

export const WALL_EDGE = EDGE;
export const GATE_WIDTH = GATE_W;
