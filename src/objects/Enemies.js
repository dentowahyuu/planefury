import * as THREE from 'three';
import { rand } from '../config.js';
import { addShadow } from './Shadow.js';
import { soundShoot } from '../audio.js';

// Model geometri musuh (Platypus-inspired: retro combat craft)
const enemyBodyGeo = new THREE.ConeGeometry(0.7, 2.2, 7);
enemyBodyGeo.rotateX(-Math.PI / 2);
const enemyWingGeo = new THREE.BoxGeometry(2.4, 0.1, 0.6);
const enemyEyeGeo = new THREE.SphereGeometry(0.25, 6, 6);

// Pre-cached materials
const enemyMatScout = new THREE.MeshLambertMaterial({ color: 0x9c27b0, flatShading: true }); // Ungu (zigzag)
const enemyMatGunner = new THREE.MeshLambertMaterial({ color: 0x2e7d32, flatShading: true }); // Hijau (penembak)
const enemyMatHeavy = new THREE.MeshLambertMaterial({ color: 0xd84315, flatShading: true }); // Oranye/Bata (tank)
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Sensor mata bercahaya

// Peluru musuh (bola energi merah)
const eBulletGeo = new THREE.SphereGeometry(0.35, 6, 6);
const eBulletMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });

export function spawnEnemy(scene, enemies, type = 'scout', bounds, spawnZ, customX = null, customY = null, customZ = 0) {
  const g = new THREE.Group();
  let m = enemyMatScout;
  let hp = 1;
  let r = 1.0;

  if (type === 'gunner') {
    m = enemyMatGunner;
    hp = 2;
    r = 1.2;
  } else if (type === 'heavy') {
    m = enemyMatHeavy;
    hp = 4;
    r = 1.6;
  }

  const body = new THREE.Mesh(enemyBodyGeo, m);
  body.castShadow = true;
  g.add(body);

  const wings = new THREE.Mesh(enemyWingGeo, m);
  wings.position.set(0, 0, 0.2);
  wings.castShadow = true;
  g.add(wings);

  const eye = new THREE.Mesh(enemyEyeGeo, eyeMat);
  eye.position.set(0, 0.2, 0.8);
  g.add(eye);

  if (type === 'heavy') {
    g.scale.setScalar(1.4);
    r *= 1.4;
  }

  const x = customX !== null ? customX : rand(-bounds.x + 2, bounds.x - 2);
  const y = customY !== null ? customY : rand(bounds.yMin + 1, bounds.yMax - 0.5);
  const z = spawnZ + customZ;

  g.position.set(x, y, z);
  g.userData = {
    type,
    hp,
    maxHp: hp,
    r,
    baseX: x,
    baseY: y,
    shootTimer: rand(1.0, 2.5),
    timeAlive: 0
  };

  addShadow(scene, g, r * 1.1);
  scene.add(g);
  enemies.push(g);
  return g;
}

export function spawnEnemyBullet(scene, enemyBullets, pos) {
  soundShoot(false);
  const b = new THREE.Mesh(eBulletGeo, eBulletMat);
  b.position.copy(pos);
  b.userData = { speed: 55, r: 0.4 };
  scene.add(b);
  enemyBullets.push(b);
}

export function updateEnemyAI(en, dt, scene, enemyBullets) {
  en.userData.timeAlive += dt;
  const u = en.userData;

  if (u.type === 'scout') {
    en.position.x = u.baseX + Math.sin(u.timeAlive * 5) * 3.5;
    en.rotation.z = Math.cos(u.timeAlive * 5) * 0.4;
  } else if (u.type === 'gunner') {
    en.position.y = u.baseY + Math.sin(u.timeAlive * 2) * 1.2;
    u.shootTimer -= dt;
    if (u.shootTimer <= 0 && en.position.z < -10 && en.position.z > -160) {
      spawnEnemyBullet(scene, enemyBullets, en.position);
      u.shootTimer = rand(1.8, 2.8);
    }
  } else if (u.type === 'heavy') {
    en.rotation.y += dt * 1.5;
  }
}

/* ================= WAVE FORMATIONS ================= */

// Formasi V Scouts
export function spawnScoutSquad(scene, enemies, bounds, spawnZ, count = 4) {
  const baseX = rand(-bounds.x + 4, bounds.x - 4);
  const baseY = rand(4, bounds.yMax - 1);
  
  // Lead
  spawnEnemy(scene, enemies, 'scout', bounds, spawnZ, baseX, baseY, 0);
  // Wings left & right
  if (count >= 2) spawnEnemy(scene, enemies, 'scout', bounds, spawnZ, baseX - 3.2, baseY + 1.2, -8);
  if (count >= 3) spawnEnemy(scene, enemies, 'scout', bounds, spawnZ, baseX + 3.2, baseY + 1.2, -8);
  if (count >= 4) spawnEnemy(scene, enemies, 'scout', bounds, spawnZ, baseX - 6.0, baseY + 2.2, -16);
  if (count >= 5) spawnEnemy(scene, enemies, 'scout', bounds, spawnZ, baseX + 6.0, baseY + 2.2, -16);
}

// Formasi Pincer Gunner
export function spawnGunnerPincer(scene, enemies, bounds, spawnZ) {
  const baseY = rand(4, bounds.yMax - 1);
  spawnEnemy(scene, enemies, 'gunner', bounds, spawnZ, -bounds.x + 3, baseY, 0);
  spawnEnemy(scene, enemies, 'gunner', bounds, spawnZ, bounds.x - 3, baseY, -4);
}

// Formasi Heavy Convoy (Heavy diapit 2 pendamping)
export function spawnHeavyConvoy(scene, enemies, bounds, spawnZ) {
  const baseX = rand(-bounds.x + 4, bounds.x - 4);
  const baseY = rand(4, bounds.yMax - 2);
  spawnEnemy(scene, enemies, 'heavy', bounds, spawnZ, baseX, baseY, 0);
  spawnEnemy(scene, enemies, 'scout', bounds, spawnZ, baseX - 4.5, baseY, -6);
  spawnEnemy(scene, enemies, 'gunner', bounds, spawnZ, baseX + 4.5, baseY, -6);
}
