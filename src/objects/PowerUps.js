import * as THREE from 'three';
import { addShadow } from './Shadow.js';

const puBoxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const puRingGeo = new THREE.TorusGeometry(0.9, 0.1, 6, 12);

// Pre-cached materials
const puMatShield = new THREE.MeshLambertMaterial({ color: 0x00e5ff, emissive: 0x007799, flatShading: true });
const puMatTriple = new THREE.MeshLambertMaterial({ color: 0xffb300, emissive: 0x995500, flatShading: true });
const puMatMagnet = new THREE.MeshLambertMaterial({ color: 0xd500f9, emissive: 0x660088, flatShading: true });
const puMatRapid = new THREE.MeshLambertMaterial({ color: 0xff3d00, emissive: 0xaa1100, flatShading: true });

export function spawnPowerUp(scene, powerups, type, x, y, z) {
  const g = new THREE.Group();
  let m = puMatShield;
  if (type === 'triple') m = puMatTriple;
  else if (type === 'magnet') m = puMatMagnet;
  else if (type === 'rapid') m = puMatRapid;

  const box = new THREE.Mesh(puBoxGeo, m);
  g.add(box);

  const ring = new THREE.Mesh(puRingGeo, m);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  g.position.set(x, y, z);
  g.userData = { type, r: 1.2 };
  addShadow(scene, g, 1.0);
  scene.add(g);
  powerups.push(g);
}

export function pickRandomPowerUpType() {
  const rpu = Math.random();
  return rpu < 0.25 ? 'shield' : (rpu < 0.5 ? 'triple' : (rpu < 0.75 ? 'magnet' : 'rapid'));
}
