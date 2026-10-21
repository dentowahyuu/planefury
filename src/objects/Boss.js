import * as THREE from 'three';
import { mat, rand } from '../config.js';
import { addShadow, updateShadow, kill } from './Shadow.js';
import { soundExplode, soundHit, soundShoot } from '../audio.js';
import { spawnEnemyBullet } from './Enemies.js';
import { burst } from './Particles.js';
import { updateBossHP, hideBossHUD, toast } from '../ui.js';

// Pre-cached Boss Materials
const bossHullMat = mat(0x424242, { flatShading: true }); // Dark armor steel
const bossPlateMat = mat(0x8d6e63, { flatShading: true }); // Bronze steampunk metal
const bossGoldMat = mat(0xd4af37, { emissive: 0x553300, flatShading: true });
const bossGlassMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
const bossRedBeaconMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
const bossEngineMat = mat(0x212121);
const bossBladeMat = mat(0x3e2723);

export function createBoss(scene, maxHp = 50) {
  const boss = new THREE.Group();

  // 1. Badan Utama Zeppelin (Elongated capsule / cylinder)
  const hullGeo = new THREE.CylinderGeometry(2.2, 1.8, 12, 10);
  hullGeo.rotateX(Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, bossHullMat);
  hull.castShadow = true;
  boss.add(hull);

  // Nose Cone (Moncong depan menghadap +Z ke arah pemain)
  const noseGeo = new THREE.ConeGeometry(2.2, 3.2, 10);
  noseGeo.rotateX(Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, bossPlateMat);
  nose.position.z = 7.6;
  boss.add(nose);

  // Tail Cone (Belakang)
  const tailGeo = new THREE.ConeGeometry(1.8, 2.5, 10);
  tailGeo.rotateX(-Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, bossPlateMat);
  tail.position.z = -7.25;
  boss.add(tail);

  // Armor Rings / Stripes
  for (const z of [-3, 0, 3]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.28, 0.14, 6, 12), bossGoldMat);
    ring.position.z = z;
    boss.add(ring);
  }

  // 2. Sayap / Sirip Stabilizer Ekor (Fins)
  const finGeo = new THREE.BoxGeometry(0.15, 4.8, 2.4);
  const hFinGeo = new THREE.BoxGeometry(4.8, 0.15, 2.4);
  const vFin = new THREE.Mesh(finGeo, bossPlateMat);
  vFin.position.z = -6.5;
  boss.add(vFin);
  const hFin = new THREE.Mesh(hFinGeo, bossPlateMat);
  hFin.position.z = -6.5;
  boss.add(hFin);

  // 3. Jembatan Komando / Kokpit Pengawas (Command Deck)
  const bridgeGeo = new THREE.BoxGeometry(1.8, 0.9, 3.2);
  const bridge = new THREE.Mesh(bridgeGeo, bossPlateMat);
  bridge.position.set(0, 2.2, 2.5);
  boss.add(bridge);

  const windowGeo = new THREE.BoxGeometry(1.5, 0.35, 0.1);
  const windowMesh = new THREE.Mesh(windowGeo, bossGlassMat);
  windowMesh.position.set(0, 2.3, 4.15);
  boss.add(windowMesh);

  // 4. Dua Gondola Mesin Kiri & Kanan dengan Baling-baling Putar
  const propellers = [];
  for (const s of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.6, 8), bossEngineMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(s * 2.8, -1.0, -1.0);
    boss.add(pod);

    // Strut penyangga
    const strut = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.3), bossPlateMat);
    strut.position.set(s * 2.0, -0.6, -1.0);
    boss.add(strut);

    // Baling-baling mesin
    const propGroup = new THREE.Group();
    propGroup.position.set(s * 2.8, -1.0, -2.4);
    for (let i = 0; i < 2; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 0.05), bossBladeMat);
      blade.rotation.z = i * Math.PI / 2;
      propGroup.add(blade);
    }
    boss.add(propGroup);
    propellers.push(propGroup);
  }

  // 5. Dua Meriam Turret Plasma Kiri & Kanan
  const turrets = [];
  for (const s of [-1, 1]) {
    const tBase = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), bossPlateMat);
    tBase.position.set(s * 2.2, 0.2, 3.5);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.4, 6), bossEngineMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.7;
    tBase.add(barrel);
    boss.add(tBase);
    turrets.push(tBase);
  }

  // Posisi awal jauh di horizon
  boss.position.set(0, 7.0, -170);
  boss.userData = {
    isBoss: true,
    hp: maxHp,
    maxHp: maxHp,
    r: 3.5, // Bounding sphere radius
    combatZ: -48,
    state: 'entering', // 'entering' | 'fighting' | 'dying'
    shootTimer: 1.8,
    burstCount: 0,
    deathTimer: 2.2,
    timeAlive: 0
  };

  addShadow(scene, boss, 3.8);
  scene.add(boss);

  return { boss, propellers, turrets };
}

export function updateBoss(bossObj, dt, scene, planePos, enemyBullets, onDefeated) {
  const { boss, propellers, turrets } = bossObj;
  const u = boss.userData;
  u.timeAlive += dt;

  // Putar baling-baling mesin
  for (const p of propellers) {
    p.rotation.z += dt * 30;
  }

  // Turret mengarah ke posisi pesawat pemain
  for (const t of turrets) {
    t.rotation.y = Math.sin(u.timeAlive * 2) * 0.2 + (planePos.x - boss.position.x) * 0.03;
    t.rotation.x = (planePos.y - boss.position.y) * 0.04;
  }

  // Fase 1: Memasuki arena pertarungan
  if (u.state === 'entering') {
    boss.position.z += 30 * dt;
    boss.position.y = 7.0 + Math.sin(u.timeAlive * 1.5) * 0.8;
    updateShadow(boss);
    if (boss.position.z >= u.combatZ) {
      boss.position.z = u.combatZ;
      u.state = 'fighting';
      toast('⚔️ GOLIATH COMBAT START!');
    }
    return;
  }

  // Fase 2: Bertarung sengit (Maneuver menyamping + tembakan salvo)
  if (u.state === 'fighting') {
    // Gerakan sinusoidal lambat tapi megah
    boss.position.x = Math.sin(u.timeAlive * 0.7) * 7.5;
    boss.position.y = 6.8 + Math.sin(u.timeAlive * 1.8) * 1.2;
    boss.rotation.z = -Math.cos(u.timeAlive * 0.7) * 0.08;
    boss.rotation.y = Math.cos(u.timeAlive * 0.7) * 0.06;
    updateShadow(boss);

    // Siklus tembakan meriam
    u.shootTimer -= dt;
    if (u.shootTimer <= 0) {
      const isEnraged = u.hp <= u.maxHp * 0.5;

      if (isEnraged) {
        // Mode mengamuk: 3-way spread plasma shot
        soundShoot(false);
        for (const angle of [-0.25, 0, 0.25]) {
          const pos = new THREE.Vector3(boss.position.x + angle * 12, boss.position.y - 0.5, boss.position.z + 4);
          spawnEnemyBullet(scene, enemyBullets, pos);
        }
        burst(scene, new THREE.Vector3(boss.position.x, boss.position.y + 1, boss.position.z), 0x555555, 6); // Asap mesin
        u.shootTimer = 1.3;
      } else {
        // Mode normal: salvo bergantian dari 2 turret
        for (const t of turrets) {
          const tWorld = new THREE.Vector3();
          t.getWorldPosition(tWorld);
          spawnEnemyBullet(scene, enemyBullets, tWorld);
        }
        u.shootTimer = 2.0;
      }
    }
  }

  // Fase 3: Ledakan beruntun saat hancur
  if (u.state === 'dying') {
    u.deathTimer -= dt;
    boss.position.y -= dt * 2.2;
    boss.position.z += dt * 4;
    boss.rotation.z += dt * 0.3;
    boss.rotation.x += dt * 0.2;
    updateShadow(boss);

    // Ledakan berantai di sepanjang badan zeppelin
    if (Math.random() < 0.4) {
      soundExplode();
      const rx = rand(-2.5, 2.5), ry = rand(-1.5, 1.5), rz = rand(-6, 6);
      burst(scene, new THREE.Vector3(boss.position.x + rx, boss.position.y + ry, boss.position.z + rz), 0xff5a4a, 16);
      burst(scene, new THREE.Vector3(boss.position.x + rx, boss.position.y + ry, boss.position.z + rz), 0xffea00, 10);
    }

    if (u.deathTimer <= 0) {
      // Ledakan pamungkas raksasa!
      soundExplode();
      burst(scene, boss.position, 0xff3d00, 40);
      burst(scene, boss.position, 0xffd700, 30);
      burst(scene, boss.position, 0xffffff, 20);

      const deathPos = boss.position.clone();
      hideBossHUD();
      kill(scene, boss);
      if (onDefeated) onDefeated(deathPos);
    }
  }
}
