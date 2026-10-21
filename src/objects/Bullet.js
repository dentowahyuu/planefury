import * as THREE from 'three';
import { soundShoot } from '../audio.js';

const bulletGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6);
bulletGeo.rotateX(Math.PI / 2);
const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });

// Pre-allocate 120 bullets in the pool for zero GC allocation during rapid streams
export const bulletPool = [];
for (let i = 0; i < 120; i++) {
  const b = new THREE.Mesh(bulletGeo, bulletMat);
  b.visible = false;
  bulletPool.push(b);
}

export function getBulletMesh() {
  if (bulletPool.length > 0) {
    const b = bulletPool.pop();
    b.visible = true;
    return b;
  }
  return new THREE.Mesh(bulletGeo, bulletMat);
}

export function recycleBullet(scene, b) {
  scene.remove(b);
  if (bulletPool.length < 150) {
    bulletPool.push(b);
  }
}

export function fireBullet(scene, plane, isPlaying, tripleTimer, rapidTimer, bullets) {
  if (!isPlaying || !plane.visible) return;
  soundShoot(rapidTimer > 0);
  const bSpeed = rapidTimer > 0 ? 210 : 180;

  if (tripleTimer > 0) {
    const configs = [
      { ox: 0, vx: 0 },
      { ox: -1.6, vx: -20 },
      { ox: 1.6, vx: 20 }
    ];
    for (const c of configs) {
      const b = getBulletMesh();
      b.position.set(plane.position.x + c.ox, plane.position.y - 0.1, plane.position.z - 1.8);
      b.userData = { speed: bSpeed, vx: c.vx, life: 1.2 };
      scene.add(b);
      bullets.push(b);
    }
  } else {
    const offsets = [-1.5, 1.5];
    for (const ox of offsets) {
      const b = getBulletMesh();
      b.position.set(plane.position.x + ox, plane.position.y - 0.1, plane.position.z - 1.8);
      b.userData = { speed: bSpeed, vx: 0, life: 1.2 };
      scene.add(b);
      bullets.push(b);
    }
  }
}

export function clearBullets(scene, bullets) {
  for (const b of bullets) {
    recycleBullet(scene, b);
  }
  bullets.length = 0;
}
