import * as THREE from 'three';

export const SKY_TOP = 0x3f8fe0;
export const SKY_MID = 0x8fd0f2;
export const SKY_HORIZON = 0xfbe3b8;

export const BOUNDS = { x: 11, yMin: 0.5, yMax: 11 };
export const SPAWN_Z = -200;
export const DESPAWN_Z = 25;
export const SHADOW_Y = -1.4;

export const PLANE_HALF = new THREE.Vector3(2.0, 0.8, 1.8);
export const HEART_MAX = 2;
export const HEART_DELAY = [12, 20];

export const rand = (a, b) => a + Math.random() * (b - a);
export const mat = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });

export function hitsPlane(planePos, objPos, radius) {
  const cx = THREE.MathUtils.clamp(objPos.x, planePos.x - PLANE_HALF.x, planePos.x + PLANE_HALF.x);
  const cy = THREE.MathUtils.clamp(objPos.y, planePos.y - PLANE_HALF.y, planePos.y + PLANE_HALF.y);
  const cz = THREE.MathUtils.clamp(objPos.z, planePos.z - PLANE_HALF.z, planePos.z + PLANE_HALF.z);
  const dx = objPos.x - cx;
  const dy = objPos.y - cy;
  const dz = objPos.z - cz;
  return dx * dx + dy * dy + dz * dz < radius * radius;
}
