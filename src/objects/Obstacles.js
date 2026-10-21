import * as THREE from 'three';
import { mat, rand } from '../config.js';
import { addShadow } from './Shadow.js';

// Pre-cached geometries & materials
const rockGeo = new THREE.IcosahedronGeometry(1, 0);
const mineGeo = new THREE.OctahedronGeometry(1, 0);
const spikeGeo = new THREE.ConeGeometry(0.25, 1, 5);

const rockColors = [0xb03a2e, 0x9c2f27, 0xc4472f];
const mineCoreMat = mat(0xd62828, { emissive: 0x7a0000 });
const spikeMat = mat(0x3a0a0a);
const rockMats = rockColors.map(c => mat(c));

const coinGeo = new THREE.TorusGeometry(0.5, 0.16, 6, 12);
const coinMat = new THREE.MeshLambertMaterial({ color: 0xffc933, emissive: 0xcc8800, flatShading: true });
const coinFaceGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.1, 12);
coinFaceGeo.rotateX(Math.PI / 2);
const coinFaceMat = new THREE.MeshLambertMaterial({ color: 0xffe066, emissive: 0xaa7700, flatShading: true });

const heartGeo = (function () {
  const s = new THREE.Shape();
  s.moveTo(0, -0.6);
  s.bezierCurveTo(-0.2, -0.35, -0.8, -0.1, -0.8, 0.3);
  s.bezierCurveTo(-0.8, 0.7, -0.2, 0.8, 0, 0.45);
  s.bezierCurveTo(0.2, 0.8, 0.8, 0.7, 0.8, 0.3);
  s.bezierCurveTo(0.8, -0.1, 0.2, -0.35, 0, -0.6);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 1 });
  g.center();
  return g;
})();
const heartMat = new THREE.MeshLambertMaterial({ color: 0xff3d6e, emissive: 0xb01846, flatShading: true });

export function spawnObstacle(scene, obstacles, bounds, spawnZ) {
  const g = new THREE.Group();
  const kind = Math.random() < 0.5 ? 'mine' : 'rock';
  let r;

  if (kind === 'mine') {
    r = 1.1;
    const core = new THREE.Mesh(mineGeo, mineCoreMat);
    core.scale.setScalar(r);
    core.castShadow = true;
    g.add(core);
    g.userData.glow = mineCoreMat;
    g.userData.phase = rand(0, 6);

    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(spikeGeo, spikeMat);
      const d = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]][i];
      s.position.set(d[0] * r, d[1] * r, d[2] * r);
      s.lookAt(s.position.clone().multiplyScalar(2));
      s.rotateX(Math.PI / 2);
      g.add(s);
    }
    g.userData.spin = rand(1, 2);
  } else {
    r = rand(1.2, 2);
    const mCol = rockMats[Math.floor(Math.random() * rockMats.length)];
    const m = new THREE.Mesh(rockGeo, mCol);
    m.scale.set(r, r * rand(0.7, 1.1), r);
    m.castShadow = true;
    g.add(m);

    const chunk = new THREE.Mesh(rockGeo, mCol);
    chunk.scale.setScalar(r * 0.45);
    chunk.position.set(r * 0.6, r * 0.4, 0);
    chunk.castShadow = true;
    g.add(chunk);
    g.userData.spin = rand(0.3, 0.8);
  }

  g.userData.r = r * 0.85;
  g.position.set(rand(-bounds.x, bounds.x), rand(bounds.yMin + 0.5, bounds.yMax), spawnZ);
  addShadow(scene, g, r * 1.1);
  scene.add(g);
  obstacles.push(g);
}

export function spawnCoinLine(scene, coins, bounds, spawnZ) {
  const x = rand(-bounds.x + 2, bounds.x - 2);
  const y = rand(2, bounds.yMax - 1);
  const n = 5;
  const dx = rand(-0.6, 0.6);
  const dy = rand(-0.4, 0.4);

  for (let i = 0; i < n; i++) {
    const c = new THREE.Mesh(coinGeo, coinMat);
    c.position.set(x + dx * i, THREE.MathUtils.clamp(y + dy * i, 1, bounds.yMax), spawnZ - i * 4);
    c.userData.r = 0.9;
    c.add(new THREE.Mesh(coinFaceGeo, coinFaceMat));
    addShadow(scene, c, 0.7);
    scene.add(c);
    coins.push(c);
  }
}

export function spawnHeart(scene, hearts, bounds, spawnZ) {
  const h = new THREE.Mesh(heartGeo, heartMat);
  h.scale.setScalar(1.5);
  h.position.set(rand(-bounds.x + 2, bounds.x - 2), rand(2, bounds.yMax - 1), spawnZ);
  h.userData.r = 1.0;
  addShadow(scene, h, 1.2);
  scene.add(h);
  hearts.push(h);
}
