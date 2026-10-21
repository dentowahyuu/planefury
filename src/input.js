import * as THREE from 'three';

export const target = { x: 0, y: 5 };
export const keys = {};

export function initInput(bounds, onStart) {
  function setTarget(cx, cy, isTouch = false) {
    target.x = ((cx / window.innerWidth) * 2 - 1) * bounds.x;
    // Pada layar sentuh / mobile: beri sedikit offset ke atas agar jempol pemain tidak menghalangi pesawat
    const touchOffsetY = isTouch ? 45 : 0;
    target.y = THREE.MathUtils.lerp(bounds.yMax, bounds.yMin, (cy - touchOffsetY) / window.innerHeight);
  }

  window.addEventListener('mousemove', e => setTarget(e.clientX, e.clientY, false));
  window.addEventListener('touchmove', e => {
    if (e.touches.length > 0) setTarget(e.touches[0].clientX, e.touches[0].clientY, true);
  }, { passive: true });
  window.addEventListener('touchstart', e => {
    if (e.touches.length > 0) setTarget(e.touches[0].clientX, e.touches[0].clientY, true);
  }, { passive: true });

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if ((e.code === 'Space' || e.code === 'Enter') && onStart) {
      onStart();
    }
  });

  window.addEventListener('keyup', e => {
    keys[e.code] = false;
  });
}

export function updateKeyboardInput(bounds, dt) {
  const kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  const ky = (keys.ArrowUp || keys.KeyW ? 1 : 0) - (keys.ArrowDown || keys.KeyS ? 1 : 0);
  if (kx || ky) {
    target.x = THREE.MathUtils.clamp(target.x + kx * dt * 18, -bounds.x, bounds.x);
    target.y = THREE.MathUtils.clamp(target.y + ky * dt * 14, bounds.yMin, bounds.yMax);
  }
}
