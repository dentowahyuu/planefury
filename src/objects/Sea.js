import * as THREE from 'three';

const SEA_W = 160, SEA_L = 320, SEG_X = 28, SEG_Z = 56;
const seaDeep = new THREE.Color(0x0f5c93);
const seaShallow = new THREE.Color(0x3fb3d8);
const seaFoam = new THREE.Color(0xeaf8ff);
const seaTmp = new THREE.Color();

export function createSea(scene) {
  const geo = new THREE.PlaneGeometry(SEA_W, SEA_L, SEG_X, SEG_Z);
  geo.rotateX(-Math.PI / 2);
  const seaBase = geo.attributes.position.array.slice();
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));

  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.position.set(0, -2, -100);
  mesh.receiveShadow = true;
  scene.add(mesh);

  return { mesh, seaBase };
}

export function updateSea(seaObj, dist) {
  const geo = seaObj.mesh.geometry;
  const seaBase = seaObj.seaBase;
  const p = geo.attributes.position;
  const col = geo.attributes.color;

  for (let i = 0; i < p.count; i++) {
    const x = seaBase[i * 3];
    const z = seaBase[i * 3 + 2] - dist;
    const h = Math.sin(x * 0.15 + z * 0.12) * 0.7 + Math.cos(z * 0.2 + x * 0.05) * 0.5;
    p.setY(i, h);
    const k = (h + 1.2) / 2.4;
    seaTmp.copy(seaDeep).lerp(seaShallow, k);
    if (k > 0.82) {
      seaTmp.lerp(seaFoam, (k - 0.82) / 0.18 * 0.7);
    }
    col.setXYZ(i, seaTmp.r, seaTmp.g, seaTmp.b);
  }
  p.needsUpdate = true;
  col.needsUpdate = true;
}
