import * as THREE from 'three';
import { SKY_TOP, SKY_MID, SKY_HORIZON, rand } from '../config.js';

export function createSky(scene) {
  const hex = c => '#' + c.toString(16).padStart(6, '0');
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, hex(SKY_TOP));
  grd.addColorStop(0.5, hex(SKY_MID));
  grd.addColorStop(1, hex(SKY_HORIZON));
  g.fillStyle = grd;
  g.fillRect(0, 0, 2, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(350, 16, 16),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false })
  );
  scene.add(dome);

  // Matahari: sprite dengan radial gradient
  const s = document.createElement('canvas');
  s.width = s.height = 256;
  const sg = s.getContext('2d');
  const rg = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, 'rgba(255,255,240,1)');
  rg.addColorStop(0.18, 'rgba(255,244,200,1)');
  rg.addColorStop(0.35, 'rgba(255,214,140,.45)');
  rg.addColorStop(1, 'rgba(255,200,120,0)');
  sg.fillStyle = rg;
  sg.fillRect(0, 0, 256, 256);

  const st = new THREE.CanvasTexture(s);
  st.colorSpace = THREE.SRGBColorSpace;
  const sunSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: st, fog: false, depthWrite: false, transparent: true })
  );
  sunSprite.scale.set(110, 110, 1);
  sunSprite.position.set(60, 55, -300);
  scene.add(sunSprite);

  // Awan low-poly
  const clouds = [];
  const cloudGeo = new THREE.IcosahedronGeometry(1, 1);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xdfe8f2, emissive: 0x7f8fa8, flatShading: true });

  for (let i = 0; i < 28; i++) {
    const cg = new THREE.Group();
    const n = 4 + Math.floor(Math.random() * 4);
    for (let j = 0; j < n; j++) {
      const b = new THREE.Mesh(cloudGeo, cloudMat);
      const sz = rand(1.6, 3.2) * (1 - Math.abs(j - n / 2) / n * 0.7);
      b.position.set((j - n / 2) * 2.2, rand(-0.3, 0.5) + sz * 0.2, rand(-1, 1));
      b.scale.set(sz * 1.3, sz * 0.85, sz);
      cg.add(b);
    }
    cg.position.set(rand(-90, 90), rand(14, 32), rand(-230, -20));
    cg.userData.spin = rand(-0.1, 0.1);
    scene.add(cg);
    clouds.push(cg);
  }

  return { dome, sunSprite, clouds };
}

export function updateClouds(clouds, speed, dt) {
  for (const c of clouds) {
    c.position.z += speed * dt * 0.5;
    c.rotation.y += c.userData.spin * dt;
    if (c.position.z > 30) {
      c.position.z = -230;
      c.position.x = rand(-90, 90);
    }
  }
}
