import * as THREE from 'three';
import {
  BOUNDS, SPAWN_Z, DESPAWN_Z, SHADOW_Y, HEART_MAX, HEART_DELAY,
  rand, hitsPlane
} from './config.js';
import {
  initAudio, soundExplode, soundHit, soundCoin, soundHeart, soundPowerUp,
  soundShieldPop, soundBossWarning, startBGM, setBGMMode, stopBGM,
  toggleMute, getIsMuted
} from './audio.js';
import {
  $, renderLives, toast, updatePowerupHUD,
  updateWaveHUD, showWaveBanner, hideWaveBanner,
  showBossHUD, updateBossHP, hideBossHUD,
  togglePauseUI, updateSoundButton
} from './ui.js';
import { target, initInput, updateKeyboardInput } from './input.js';
import { kill, updateShadow } from './objects/Shadow.js';
import { createSea, updateSea } from './objects/Sea.js';
import { createSky, updateClouds } from './objects/Sky.js';
import {
  createAirplane, updateAirplaneMovement, updateTrailAndLines
} from './objects/Airplane.js';
import {
  bulletPool, fireBullet, recycleBullet, clearBullets
} from './objects/Bullet.js';
import {
  spawnObstacle, spawnCoinLine, spawnHeart
} from './objects/Obstacles.js';
import {
  spawnEnemy, updateEnemyAI,
  spawnScoutSquad, spawnGunnerPincer, spawnHeavyConvoy
} from './objects/Enemies.js';
import {
  spawnPowerUp, pickRandomPowerUpType
} from './objects/PowerUps.js';
import {
  burst, updateParticles, clearParticles
} from './objects/Particles.js';
import {
  createBoss, updateBoss
} from './objects/Boss.js';

/* ================= THREE.JS SETUP ================= */
const scene = new THREE.Scene();
const SKY_HORIZON = 0xfbe3b8;
scene.background = new THREE.Color(SKY_HORIZON);
scene.fog = new THREE.Fog(SKY_HORIZON, 70, 230);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 7, 16);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x5a86a8, 0.8));
const sun = new THREE.DirectionalLight(0xfff0d0, 0.95);
sun.position.set(30, 50, 20);
scene.add(sun);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ================= WORLD OBJECTS ================= */
const sky = createSky(scene);
const sea = createSea(scene);
const airplane = createAirplane(scene, camera);
const { plane, propeller, shieldMesh } = airplane;

const obstacles = [];
const coins = [];
const hearts = [];
const enemies = [];
const enemyBullets = [];
const bullets = [];
const powerups = [];

/* ================= GAME STATE ================= */
let state = 'menu';
let isPaused = false;
let speed = 40, dist = 0, bonus = 0, score = 0, coinCount = 0;
let lives = 3, invuln = 0, shake = 0;
let obsTimer = 1, coinTimer = 2, shootCooldown = 0;
let heartTimer = 15, heartsSpawned = 0;
let best = +(localStorage.getItem('planefury_best') || localStorage.getItem('aviator_best')) || 0;

let hasShield = false, tripleTimer = 0, magnetTimer = 0, rapidTimer = 0;

// Wave Manager State
let waveNumber = 1;
let wavePhase = 'announcing'; // 'announcing' | 'spawning' | 'combat' | 'cleared' | 'boss'
let waveTimer = 0;
let activeBossObj = null;

$('best').textContent = best;
updateSoundButton(getIsMuted());

function getWaveSubtitle(w) {
  const titles = [
    'SCOUT RECON SQUAD',
    'GUNNER ARTILLERY AMBUSH',
    'HEAVY ASSAULT ESCORT',
    'COMBINED ARMS SQUADRON'
  ];
  return titles[(w - 1) % titles.length];
}

function startWave(w) {
  if (w % 4 === 0) {
    // Boss Wave! Setiap kelipatan 4
    wavePhase = 'boss';
    updateWaveHUD('BOSS BATTLE');
    showWaveBanner('⚠️ WARNING! ⚠️', 'GOLIATH DREADNOUGHT APPROACHING', true, 2800);
    soundBossWarning();
    setBGMMode('boss');
    showBossHUD('⚠️ GOLIATH DREADNOUGHT ⚠️');
    activeBossObj = createBoss(scene, 40 + w * 12);
  } else {
    // Wave Reguler
    wavePhase = 'announcing';
    waveTimer = 2.4;
    updateWaveHUD('WAVE ' + w);
    showWaveBanner('WAVE ' + w, getWaveSubtitle(w), false, 2200);
    setBGMMode('normal');
  }
}

function clearWorld() {
  [...obstacles, ...coins, ...hearts, ...enemies, ...enemyBullets, ...powerups].forEach(o => kill(scene, o));
  if (activeBossObj) {
    kill(scene, activeBossObj.boss);
    activeBossObj = null;
  }
  clearBullets(scene, bullets);
  clearParticles(scene);
  obstacles.length = coins.length = hearts.length = enemies.length = enemyBullets.length = powerups.length = 0;
  hideBossHUD();
  hideWaveBanner();
}

function syncPowerupHUD() {
  updatePowerupHUD(hasShield, tripleTimer, magnetTimer, rapidTimer, shieldMesh);
}

function setPaused(p) {
  if (state !== 'playing') return;
  isPaused = p;
  togglePauseUI(isPaused);
  if (isPaused) {
    stopBGM();
  } else {
    if (wavePhase === 'boss') setBGMMode('boss');
    else setBGMMode('normal');
  }
}

function start() {
  initAudio();
  startBGM('normal');
  clearWorld();

  speed = 40; dist = 0; bonus = 0; score = 0; coinCount = 0; lives = 3; invuln = 0; shake = 0;
  obsTimer = 1; coinTimer = 2; shootCooldown = 0;
  heartsSpawned = 0; heartTimer = rand(HEART_DELAY[0], HEART_DELAY[1]);
  hasShield = false; tripleTimer = 0; magnetTimer = 0; rapidTimer = 0;
  isPaused = false;
  togglePauseUI(false);
  syncPowerupHUD();

  plane.position.set(0, 5, 0);
  plane.visible = true;
  target.x = 0; target.y = 5;
  state = 'playing';

  waveNumber = 1;
  startWave(waveNumber);

  renderLives(lives, -1, true);
  $('coins').textContent = 0;
  $('score').textContent = 0;
  $('overlay').classList.add('hidden');
}

function gameOver() {
  state = 'over';
  stopBGM();
  hideBossHUD();
  hideWaveBanner();
  renderLives(lives, -1, false);
  soundExplode();
  burst(scene, plane.position, 0xf25346, 30);
  burst(scene, plane.position, 0xffa500, 20);
  plane.visible = false;
  shake = 1;

  if (score > best) {
    best = score;
    localStorage.setItem('planefury_best', best);
    $('best').textContent = best;
  }

  $('title').textContent = 'GAME OVER';
  $('msg').textContent = `Skor ${score}  |  Koin ${coinCount}  |  Wave ${waveNumber}  |  Terbaik ${best}`;
  $('btn').textContent = 'MAIN LAGI';
  setTimeout(() => $('overlay').classList.remove('hidden'), 700);
}

// Inisialisasi Input Listener
initInput(BOUNDS, () => {
  if (state !== 'playing') start();
});
$('overlay').addEventListener('click', () => {
  if (state !== 'playing') start();
});

// Kontrol Pause & Suara
$('btn-pause').addEventListener('click', e => {
  e.stopPropagation();
  setPaused(!isPaused);
});
$('btn-resume').addEventListener('click', () => setPaused(false));

$('btn-sound').addEventListener('click', e => {
  e.stopPropagation();
  const muted = toggleMute();
  updateSoundButton(muted);
});

window.addEventListener('keydown', e => {
  if (e.code === 'KeyP' || e.code === 'Escape') {
    setPaused(!isPaused);
  } else if (e.code === 'KeyM') {
    const muted = toggleMute();
    updateSoundButton(muted);
  }
});

/* ================= MAIN GAME LOOP ================= */
const clock = new THREE.Clock();

function update(dt) {
  if (isPaused) return;

  const t = clock.elapsedTime;
  const sp = state === 'playing' ? speed : (state === 'menu' ? 15 : 0);

  if (state === 'playing') {
    speed += dt * 0.45;
    dist += speed * dt;
    const sc = Math.floor((dist + bonus) / 5);
    if (sc !== score) {
      score = sc;
      $('score').textContent = score;
    }

    // Input keyboard
    updateKeyboardInput(BOUNDS, dt);

    // Gerak pesawat + tilt
    updateAirplaneMovement(airplane, target, dt, t);

    // Spawner rintangan & koin
    obsTimer -= dt;
    coinTimer -= dt;

    if (obsTimer <= 0) {
      spawnObstacle(scene, obstacles, BOUNDS, SPAWN_Z);
      obsTimer = Math.max(0.4, 1.6 - dist / 5000) * rand(0.7, 1.2);
    }
    if (coinTimer <= 0) {
      spawnCoinLine(scene, coins, BOUNDS, SPAWN_Z);
      coinTimer = rand(3, 5);
    }

    /* ===== WAVE MANAGER CYCLE ===== */
    if (wavePhase === 'announcing') {
      waveTimer -= dt;
      if (waveTimer <= 0) {
        wavePhase = 'spawning';
      }
    } else if (wavePhase === 'spawning') {
      const squadType = (waveNumber - 1) % 4;
      if (squadType === 0) {
        spawnScoutSquad(scene, enemies, BOUNDS, SPAWN_Z, 4);
      } else if (squadType === 1) {
        spawnGunnerPincer(scene, enemies, BOUNDS, SPAWN_Z);
        spawnEnemy(scene, enemies, 'scout', BOUNDS, SPAWN_Z, 0, 5, -8);
      } else if (squadType === 2) {
        spawnHeavyConvoy(scene, enemies, BOUNDS, SPAWN_Z);
      } else {
        spawnScoutSquad(scene, enemies, BOUNDS, SPAWN_Z, 5);
        spawnGunnerPincer(scene, enemies, BOUNDS, SPAWN_Z);
      }
      wavePhase = 'combat';
    } else if (wavePhase === 'combat') {
      // Jika seluruh musuh wave habis dihancurkan -> WAVE CLEAR!
      if (enemies.length === 0) {
        wavePhase = 'cleared';
        waveTimer = 3.8;
        bonus += 150;
        toast(`⭐ WAVE ${waveNumber} CLEARED! +150`);
        showWaveBanner(`WAVE ${waveNumber} CLEAR!`, 'BONUS +150  •  GET READY', false, 2500);
        soundHeart();
        spawnCoinLine(scene, coins, BOUNDS, SPAWN_Z);
      }
    } else if (wavePhase === 'cleared') {
      // Breather window sebelum wave berikutnya
      waveTimer -= dt;
      if (waveTimer <= 0) {
        waveNumber++;
        startWave(waveNumber);
      }
    } else if (wavePhase === 'boss') {
      if (activeBossObj) {
        updateBoss(activeBossObj, dt, scene, plane.position, enemyBullets, (bossPos) => {
          bonus += 1000;
          toast('🏆 GOLIATH DEFEATED! +1000');
          showWaveBanner('BOSS DEFEATED!', '+1000 BONUS  •  AIRSPACE SECURED', false, 3200);

          // Hadiah Boss: Masuk ke array coins & powerups dunia nyata!
          const dropZ = Math.min(-35, bossPos.z);
          spawnCoinLine(scene, coins, BOUNDS, dropZ);
          spawnCoinLine(scene, coins, BOUNDS, dropZ - 10);
          spawnPowerUp(scene, powerups, pickRandomPowerUpType(), bossPos.x - 3.5, Math.max(3, bossPos.y), dropZ - 4);
          spawnPowerUp(scene, powerups, pickRandomPowerUpType(), bossPos.x + 3.5, Math.max(3, bossPos.y), dropZ - 4);

          activeBossObj = null;
          wavePhase = 'cleared';
          waveTimer = 4.5;
          setBGMMode('normal');
        });
      }
    }

    // Auto-fire peluru pemain
    shootCooldown -= dt;
    if (shootCooldown <= 0) {
      fireBullet(scene, plane, state === 'playing', tripleTimer, rapidTimer, bullets);
      shootCooldown = rapidTimer > 0 ? 0.055 : 0.18;
    }

    // Update peluru pemain
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.position.z -= b.userData.speed * dt;
      if (b.userData.vx) b.position.x += b.userData.vx * dt;
      b.userData.life -= dt;
      let hit = false;

      // 1. Tabrakan peluru vs Boss
      if (activeBossObj && activeBossObj.boss.userData.state === 'fighting') {
        const boss = activeBossObj.boss;
        if (b.position.distanceTo(boss.position) < boss.userData.r + 0.6) {
          hit = true;
          burst(scene, b.position, 0xffea00, 3);
          soundHit();
          boss.userData.hp--;
          updateBossHP(boss.userData.hp, boss.userData.maxHp);

          if (boss.userData.hp <= 0) {
            boss.userData.state = 'dying';
            toast('💥 GOLIATH DESTROYED!');
          }
        }
      }

      // 2. Tabrakan peluru vs musuh
      if (!hit) {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const en = enemies[j];
          if (b.position.distanceTo(en.position) < en.userData.r + 0.6) {
            hit = true;
            en.userData.hp--;
            burst(scene, b.position, 0xffea00, rapidTimer > 0 ? 2 : 4);

            if (en.userData.hp <= 0) {
              soundExplode();
              burst(scene, en.position, en.userData.type === 'heavy' ? 0xd84315 : (en.userData.type === 'gunner' ? 0x2e7d32 : 0x9c27b0), 24);
              burst(scene, en.position, 0xffea00, 12);
              kill(scene, en);
              enemies.splice(j, 1);
              const reward = en.userData.type === 'heavy' ? 100 : (en.userData.type === 'gunner' ? 50 : 30);
              bonus += reward;
              toast('+' + reward);

              // 28% drop power-up
              if (Math.random() < 0.28) {
                const puType = pickRandomPowerUpType();
                spawnPowerUp(scene, powerups, puType, en.position.x, en.position.y, en.position.z);
              }
            } else {
              soundHit();
              en.position.z -= 1.0;
            }
            break;
          }
        }
      }

      // 3. Tabrakan peluru vs ranjau
      if (!hit) {
        for (let j = obstacles.length - 1; j >= 0; j--) {
          const o = obstacles[j];
          if (b.position.distanceTo(o.position) < o.userData.r + 0.4) {
            hit = true;
            soundExplode();
            burst(scene, o.position, 0xd62828, 16);
            kill(scene, o);
            obstacles.splice(j, 1);
            bonus += 20;
            break;
          }
        }
      }

      if (hit || b.userData.life <= 0 || b.position.z < -260) {
        recycleBullet(scene, b);
        bullets.splice(i, 1);
      }
    }

    // Update peluru musuh
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const eb = enemyBullets[i];
      eb.position.z += (sp + eb.userData.speed) * dt;
      updateShadow(eb);

      if (invuln <= 0 && hitsPlane(plane.position, eb.position, eb.userData.r)) {
        if (hasShield) {
          hasShield = false;
          syncPowerupHUD();
          soundShieldPop();
          burst(scene, plane.position, 0x00e5ff, 20);
          toast('🛡 SHIELD BROKEN');
          invuln = 1.0;
        } else {
          soundHit();
          burst(scene, eb.position, 0xff1744, 14);
          lives--;
          renderLives(lives, -1, true);
          invuln = 1.5;
          shake = 0.6;
          if (lives <= 0) { gameOver(); break; }
        }
        kill(scene, eb);
        enemyBullets.splice(i, 1);
        continue;
      }

      if (eb.position.z > DESPAWN_Z) {
        kill(scene, eb);
        enemyBullets.splice(i, 1);
      }
    }

    // Tabrakan fisik pesawat vs Boss
    if (invuln <= 0 && activeBossObj && activeBossObj.boss.userData.state === 'fighting') {
      if (hitsPlane(plane.position, activeBossObj.boss.position, activeBossObj.boss.userData.r)) {
        if (hasShield) {
          hasShield = false;
          syncPowerupHUD();
          soundShieldPop();
          burst(scene, plane.position, 0x00e5ff, 20);
          toast('🛡 SHIELD BROKEN');
          invuln = 1.0;
        } else {
          soundHit();
          burst(scene, plane.position, 0xffa500, 20);
          lives--;
          renderLives(lives, -1, true);
          invuln = 1.5;
          shake = 0.8;
          if (lives <= 0) { gameOver(); }
        }
      }
    }

    // Pickup nyawa darurat saat HP=1
    if (lives === 1 && hearts.length === 0 && heartsSpawned < HEART_MAX) {
      heartTimer -= dt;
      if (heartTimer <= 0) {
        spawnHeart(scene, hearts, BOUNDS, SPAWN_Z);
        heartsSpawned++;
        heartTimer = rand(HEART_DELAY[0], HEART_DELAY[1]);
      }
    }

    // Kolisi pemain vs objek
    invuln = Math.max(0, invuln - dt);
    plane.visible = invuln <= 0 || Math.floor(t * 15) % 2 === 0;

    // vs Rintangan
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      if (invuln <= 0 && hitsPlane(plane.position, o.position, o.userData.r)) {
        if (hasShield) {
          hasShield = false;
          syncPowerupHUD();
          soundShieldPop();
          burst(scene, plane.position, 0x00e5ff, 20);
          toast('🛡 SHIELD BROKEN');
          invuln = 1.0;
        } else {
          soundHit();
          burst(scene, o.position, 0xd62828);
          lives--;
          renderLives(lives, -1, true);
          invuln = 1.5;
          shake = 0.6;
          if (lives <= 0) { gameOver(); break; }
        }
        kill(scene, o);
        obstacles.splice(i, 1);
      }
    }

    // vs Koin
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      if (hitsPlane(plane.position, c.position, c.userData.r + 0.4)) {
        soundCoin();
        burst(scene, c.position, 0xffc933, 8);
        kill(scene, c);
        coins.splice(i, 1);
        coinCount++;
        bonus += 25;
        $('coins').textContent = coinCount;
      }
    }

    // vs Hati
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i];
      if (hitsPlane(plane.position, h.position, h.userData.r + 0.5)) {
        soundHeart();
        burst(scene, h.position, 0xff3d6e, 16);
        kill(scene, h);
        hearts.splice(i, 1);
        lives = Math.min(lives + 1, 3);
        renderLives(lives, lives - 1, true);
        toast('♥ NYAWA +1');
      }
    }

    // vs Musuh (tabrakan badan)
    for (let i = enemies.length - 1; i >= 0; i--) {
      const en = enemies[i];
      if (invuln <= 0 && hitsPlane(plane.position, en.position, en.userData.r)) {
        if (hasShield) {
          hasShield = false;
          syncPowerupHUD();
          soundShieldPop();
          burst(scene, plane.position, 0x00e5ff, 20);
          toast('🛡 SHIELD BROKEN');
          invuln = 1.0;
        } else {
          soundHit();
          burst(scene, en.position, 0xffa500, 20);
          lives--;
          renderLives(lives, -1, true);
          invuln = 1.5;
          shake = 0.6;
          if (lives <= 0) { gameOver(); break; }
        }
        kill(scene, en);
        enemies.splice(i, 1);
      }
    }

    // vs Power-Up
    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      if (hitsPlane(plane.position, pu.position, pu.userData.r + 0.6)) {
        soundPowerUp();
        const type = pu.userData.type;
        if (type === 'shield') {
          hasShield = true;
          burst(scene, pu.position, 0x00e5ff, 18);
          toast('🛡 SHIELD ACTIVE!');
        } else if (type === 'triple') {
          tripleTimer = 10;
          burst(scene, pu.position, 0xffb300, 18);
          toast('⚡ TRIPLE SHOT 10s!');
        } else if (type === 'magnet') {
          magnetTimer = 10;
          burst(scene, pu.position, 0xd500f9, 18);
          toast('🧲 COIN MAGNET 10s!');
        } else if (type === 'rapid') {
          rapidTimer = 10;
          burst(scene, pu.position, 0xff3d00, 18);
          toast('🔥 RAPID FIRE 10s!');
        }
        syncPowerupHUD();
        kill(scene, pu);
        powerups.splice(i, 1);
      }
    }
  }

  // Gerak dunia laut & awan
  const worldDist = state === 'playing' ? dist : t * 15;
  updateSea(sea, worldDist);
  updateClouds(sky.clouds, sp, dt);

  // Timer power-up aktif
  if (state === 'playing') {
    if (tripleTimer > 0) {
      tripleTimer -= dt;
      if (tripleTimer <= 0) { tripleTimer = 0; syncPowerupHUD(); }
      else if (Math.floor(tripleTimer * 5) % 5 === 0) { $('triple-time').textContent = Math.ceil(tripleTimer); }
    }
    if (magnetTimer > 0) {
      magnetTimer -= dt;
      if (magnetTimer <= 0) { magnetTimer = 0; syncPowerupHUD(); }
      else if (Math.floor(magnetTimer * 5) % 5 === 0) { $('magnet-time').textContent = Math.ceil(magnetTimer); }

      // Tarik koin terdekat
      for (const c of coins) {
        if (c.position.distanceTo(plane.position) < 22) {
          c.position.x += (plane.position.x - c.position.x) * dt * 7;
          c.position.y += (plane.position.y - c.position.y) * dt * 7;
        }
      }
    }
    if (rapidTimer > 0) {
      rapidTimer -= dt;
      if (rapidTimer <= 0) { rapidTimer = 0; syncPowerupHUD(); }
      else if (Math.floor(rapidTimer * 5) % 5 === 0) { $('rapid-time').textContent = Math.ceil(rapidTimer); }
    }
    if (hasShield) {
      shieldMesh.rotation.y += dt * 2;
      shieldMesh.rotation.x += dt * 1;
    }
  }

  // Update posisi & animasi objek rintangan, koin, hati, musuh, power-up
  for (const arr of [obstacles, coins, hearts, enemies, powerups]) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const o = arr[i];
      o.position.z += sp * dt;

      if (arr === powerups) {
        o.rotation.y += dt * 3;
        o.rotation.x += dt * 2;
        o.position.y += Math.sin(t * 4 + i) * dt * 0.4;
      } else if (arr === enemies) {
        updateEnemyAI(o, dt, scene, enemyBullets);
      } else if (arr === obstacles) {
        o.rotation.x += dt * o.userData.spin;
        o.rotation.y += dt * o.userData.spin;
        o.position.y += Math.sin(t * 2 + i) * dt * 0.5;
        if (o.userData.glow) {
          o.userData.glow.emissiveIntensity = 0.6 + Math.sin(t * 6 + o.userData.phase) * 0.5;
        }
      } else {
        o.rotation.y += dt * (arr === hearts ? 3 : 4);
      }

      if (arr === hearts) {
        o.scale.setScalar(1.5 + Math.sin(t * 8) * 0.12);
      }

      updateShadow(o);

      if (o.position.z > DESPAWN_Z) {
        kill(scene, o);
        arr.splice(i, 1);
      }
    }
  }

  // Update partikel
  updateParticles(scene, dt);

  // Update asap & garis kecepatan
  updateTrailAndLines(airplane, camera, state === 'playing', dt, sp);

  // Kamera
  shake = Math.max(0, shake - dt * 2.5);
  const cx = state === 'menu' ? Math.sin(t * 0.5) * 4 : plane.position.x * 0.92;
  const cy = state === 'menu' ? 8 : plane.position.y + 3.2;
  camera.position.x += (cx - camera.position.x) * Math.min(1, dt * 8);
  camera.position.y += (cy - camera.position.y) * Math.min(1, dt * 8);
  const sx = shake > 0 ? rand(-1, 1) * shake * 0.4 : 0;
  const sy = shake > 0 ? rand(-1, 1) * shake * 0.4 : 0;
  camera.position.x += sx;
  camera.position.y += sy;
  camera.lookAt(camera.position.x, camera.position.y - 1.4, -30);

  // Dynamic FOV
  const fovT = state === 'playing' ? 60 + Math.min((speed - 40) * 0.25, 14) : 60;
  if (Math.abs(camera.fov - fovT) > 0.05) {
    camera.fov += (fovT - camera.fov) * Math.min(1, dt * 2);
    camera.updateProjectionMatrix();
  }

  if (state === 'menu') {
    plane.position.y = 5 + Math.sin(t * 2) * 0.5;
    plane.rotation.z = Math.sin(t) * 0.15;
  }
}

renderer.setAnimationLoop(() => {
  update(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
});

plane.position.set(0, 5, 0);
renderLives(lives, -1, false);
