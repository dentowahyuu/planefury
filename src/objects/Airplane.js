import * as THREE from 'three';
import { mat, rand } from '../config.js';

export function createAirplane(scene, camera) {
  const plane = new THREE.Group();
  let propeller;

  const red = mat(0xf25346),
        white = mat(0xf5f0e0),
        brown = mat(0x59332e),
        dark = mat(0x23190f),
        gold = mat(0xe8b53a),
        skin = mat(0xf0c8a0),
        scarf = mat(0x3b8fc4),
        glass = mat(0x9fd8f0, { transparent: true, opacity: 0.6 });

  const add = (geo, m, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    plane.add(o);
    return o;
  };

  // badan (menghadap -z)
  const body = add(new THREE.CylinderGeometry(0.6, 0.4, 3.4, 8), red);
  body.rotation.x = Math.PI / 2;
  const stripe = add(new THREE.CylinderGeometry(0.62, 0.55, 0.5, 8), white, 0, 0, 0.5);
  stripe.rotation.x = Math.PI / 2;
  const cowl = add(new THREE.CylinderGeometry(0.5, 0.66, 0.7, 8), gold, 0, 0, -1.9);
  cowl.rotation.x = Math.PI / 2;
  const spinner = add(new THREE.ConeGeometry(0.28, 0.5, 8), dark, 0, 0, -2.45);
  spinner.rotation.x = -Math.PI / 2;

  // kokpit + pilot
  add(new THREE.SphereGeometry(0.34, 8, 6), skin, 0, 0.78, -0.1);
  add(new THREE.BoxGeometry(0.52, 0.14, 0.12), dark, 0, 0.82, -0.38);
  add(new THREE.TorusGeometry(0.3, 0.09, 5, 8), scarf, 0, 0.55, -0.05).rotation.x = Math.PI / 2;
  add(new THREE.SphereGeometry(0.5, 8, 6), glass, 0, 0.62, -0.1).scale.set(1, 0.75, 1.5);

  // sayap bawah + atas
  add(new THREE.BoxGeometry(5, 0.12, 1.1), red, 0, -0.1, -0.2);
  add(new THREE.BoxGeometry(5, 0.12, 1.1), white, 0, 0.7, -0.2).scale.set(0.85, 1, 0.8);
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.5, 0.13, 1.12), white, s * 2.25, -0.1, -0.2);
    add(new THREE.BoxGeometry(0.4, 0.13, 0.9), red, s * 2.0, 0.7, -0.2);
    add(new THREE.BoxGeometry(0.08, 0.8, 0.08), brown, s * 1.8, 0.3, -0.2);
    add(new THREE.BoxGeometry(0.08, 0.8, 0.08), brown, s * 1.5, 0.3, 0.1);
  }

  // ekor
  add(new THREE.BoxGeometry(1.8, 0.1, 0.7), red, 0, 0.1, 1.6);
  add(new THREE.BoxGeometry(0.1, 0.9, 0.7), red, 0, 0.5, 1.6);
  add(new THREE.BoxGeometry(0.1, 0.35, 0.5), white, 0, 0.78, 1.65);

  // baling-baling
  propeller = new THREE.Group();
  propeller.position.set(0, 0, -2.7);
  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 0.06), brown);
    blade.rotation.z = i * Math.PI / 2;
    propeller.add(blade);
  }
  plane.add(propeller);

  // roda + penyangga
  for (const s of [-1, 1]) {
    const w = add(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 10), dark, s * 0.65, -0.95, -0.8);
    w.rotation.z = Math.PI / 2;
    add(new THREE.BoxGeometry(0.07, 0.7, 0.07), dark, s * 0.6, -0.55, -0.8);
  }

  // Perisai (Shield) visual bubble di pesawat
  const shieldGeo = new THREE.SphereGeometry(3.0, 16, 12);
  const shieldMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.35, wireframe: true });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.visible = false;
  plane.add(shieldMesh);

  scene.add(plane);

  // Jejak asap (trail pool)
  const TRAIL_N = 26;
  const trail = [];
  const trailGeo = new THREE.IcosahedronGeometry(0.25, 0);
  for (let i = 0; i < TRAIL_N; i++) {
    const m = new THREE.Mesh(
      trailGeo,
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
    );
    m.userData.life = 0;
    scene.add(m);
    trail.push(m);
  }

  // Garis kecepatan (speed lines)
  const LINE_N = 36;
  const lines = [];
  const lineGeo = new THREE.BoxGeometry(0.05, 0.05, 1);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false, fog: false });

  function resetLine(l, far) {
    const a = rand(0, Math.PI * 2), r = rand(6, 18);
    l.position.set(camera.position.x + Math.cos(a) * r * 1.5, camera.position.y - 1 + Math.sin(a) * r * 0.7, far ? rand(-110, 10) : -110);
    l.scale.z = rand(2, 5);
  }

  for (let i = 0; i < LINE_N; i++) {
    const l = new THREE.Mesh(lineGeo, lineMat);
    resetLine(l, true);
    l.visible = false;
    scene.add(l);
    lines.push(l);
  }

  let trailIdx = 0;
  let trailTimer = 0;

  function emitTrail() {
    const m = trail[trailIdx = (trailIdx + 1) % TRAIL_N];
    m.position.set(plane.position.x + rand(-0.1, 0.1), plane.position.y + 0.05, plane.position.z + 2.2);
    m.userData.life = 1;
    m.scale.setScalar(1);
  }

  return {
    plane,
    propeller,
    shieldMesh,
    trail,
    lines,
    emitTrail,
    resetLine,
    getTrailTimer: () => trailTimer,
    setTrailTimer: v => { trailTimer = v; }
  };
}

export function updateAirplaneMovement(airplane, target, dt, t) {
  const { plane, propeller } = airplane;
  propeller.rotation.z += dt * 40;

  const px = plane.position.x;
  const py = plane.position.y;
  plane.position.x += (target.x - px) * Math.min(1, dt * 7);
  plane.position.y += (target.y - py) * Math.min(1, dt * 7);
  plane.rotation.z = (target.x - px) * -0.12 + Math.sin(t * 3) * 0.03;
  plane.rotation.x = (target.y - py) * 0.1;
  plane.rotation.y = (px - target.x) * 0.04;
}

export function updateTrailAndLines(airplane, camera, isPlaying, dt, speed) {
  const { plane, trail, lines, emitTrail, resetLine } = airplane;

  if (isPlaying && plane.visible) {
    let tt = airplane.getTrailTimer() - dt;
    if (tt <= 0) {
      emitTrail();
      tt = 0.035;
    }
    airplane.setTrailTimer(tt);
  }

  for (const m of trail) {
    const u = m.userData;
    if (u.life <= 0) {
      m.material.opacity = 0;
      continue;
    }
    u.life -= dt * 1.6;
    m.position.z += speed * dt;
    m.position.y += dt * 0.6;
    m.scale.setScalar(0.6 + (1 - u.life) * 1.6);
    m.material.opacity = Math.max(u.life, 0) * 0.28;
  }

  for (const l of lines) {
    l.visible = isPlaying;
    l.position.z += speed * 1.6 * dt;
    if (l.position.z > 15) resetLine(l, false);
  }
}
