import * as THREE from 'three';
import { SHADOW_Y } from '../config.js';

const shadowGeo = new THREE.CircleGeometry(1, 16);
shadowGeo.rotateX(-Math.PI / 2);

const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x0a2a44,
  transparent: true,
  opacity: 0.28,
  depthTest: false
});

export function addShadow(scene, obj, size) {
  const s = new THREE.Mesh(shadowGeo, shadowMat);
  s.scale.setScalar(size);
  s.renderOrder = 1;
  s.position.set(obj.position.x, SHADOW_Y, obj.position.z);
  obj.userData.shadow = s;
  scene.add(s);
  return s;
}

export function updateShadow(obj) {
  if (obj.userData.shadow) {
    obj.userData.shadow.position.set(obj.position.x, SHADOW_Y, obj.position.z);
  }
}

export function kill(scene, obj) {
  scene.remove(obj);
  if (obj.userData.shadow) {
    scene.remove(obj.userData.shadow);
    obj.userData.shadow = null;
  }
}
