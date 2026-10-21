import * as THREE from 'three';
import { rand } from '../config.js';

export const particles = [];
const partGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
const partMats = {};

export function burst(scene, pos, color, n = 12) {
  if (particles.length > 60) return;
  const pm = partMats[color] || (partMats[color] = new THREE.MeshBasicMaterial({ color }));
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(partGeo, pm);
    m.position.copy(pos);
    m.userData = {
      v: new THREE.Vector3(rand(-6, 6), rand(-2, 7), rand(-6, 6)),
      life: 1
    };
    scene.add(m);
    particles.push(m);
  }
}

export function updateParticles(scene, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const u = p.userData;
    u.life -= dt * 1.4;
    u.v.y -= 12 * dt;
    p.position.addScaledVector(u.v, dt);
    p.rotation.x += dt * 5;
    p.rotation.y += dt * 5;
    p.scale.setScalar(Math.max(u.life, 0.01));
    if (u.life <= 0) {
      scene.remove(p);
      particles.splice(i, 1);
    }
  }
}

export function clearParticles(scene) {
  for (const p of particles) {
    scene.remove(p);
  }
  particles.length = 0;
}
