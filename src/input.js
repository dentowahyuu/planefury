import * as THREE from 'three';

export const target = { x: 0, y: 5 };
export const keys = {};

// Joystick internal state
let joystickBase = null;
let joystickKnob = null;
let joystickIcon = null;
let joystickActive = false;
let touchId = null;
const basePos = { x: 85, y: 0 };
const stickVector = { x: 0, y: 0 };
const MAX_RADIUS = 50;
let lastTouchTime = 0;
let isGamePlaying = false;

function getDefaultRestingPos() {
  // Posisikan default tepat di tengah bawah layar (symmetrical & natural untuk kedua jempol)
  const restingX = window.innerWidth * 0.5;
  const bottomOffset = window.innerHeight < 500 ? 75 : Math.min(105, Math.max(80, window.innerHeight * 0.14));
  const restingY = window.innerHeight - bottomOffset;
  return { x: restingX, y: restingY };
}

function resetJoystickToResting(animated = true) {
  if (!joystickBase || !joystickKnob) return;
  const def = getDefaultRestingPos();
  basePos.x = def.x;
  basePos.y = def.y;

  joystickBase.style.left = `${def.x}px`;
  joystickBase.style.top = `${def.y}px`;
  joystickKnob.style.transform = 'translate(0px, 0px)';
  if (joystickIcon) joystickIcon.style.transform = 'rotate(0deg)';
  
  joystickBase.classList.remove('active');
  if (isGamePlaying) {
    joystickBase.classList.add('visible');
    joystickBase.style.opacity = '0.45';
  } else {
    joystickBase.classList.remove('visible');
    joystickBase.style.opacity = '0';
  }
}

function updateStickFromTouch(cx, cy) {
  const dx = cx - basePos.x;
  const dy = cy - basePos.y;
  const dist = Math.hypot(dx, dy);

  const clampedDist = Math.min(dist, MAX_RADIUS);
  const angle = Math.atan2(dy, dx);

  const knobX = Math.cos(angle) * clampedDist;
  const knobY = Math.sin(angle) * clampedDist;

  joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

  // Rotate arrow icon toward steering direction
  if (joystickIcon && dist > 6) {
    joystickIcon.style.transform = `rotate(${angle + Math.PI / 2}rad)`;
  }

  // Deadzone 5px
  if (dist < 5) {
    stickVector.x = 0;
    stickVector.y = 0;
  } else {
    // Non-linear power curve for precision micro-dodging & fast sweeps
    const strength = Math.min(1, (dist - 5) / (MAX_RADIUS - 5));
    const curved = Math.pow(strength, 1.15);
    stickVector.x = Math.cos(angle) * curved;
    // Invert Y: dragging finger up (negative dy) climbs up (+Y)
    stickVector.y = -Math.sin(angle) * curved;
  }
}

function endJoystick() {
  joystickActive = false;
  touchId = null;
  stickVector.x = 0;
  stickVector.y = 0;
  resetJoystickToResting();
}

export function setJoystickVisible(playing) {
  isGamePlaying = playing;
  resetJoystickToResting();
}

export function initInput(bounds, onStart) {
  joystickBase = document.getElementById('joystick-base');
  joystickKnob = document.getElementById('joystick-knob');
  joystickIcon = document.getElementById('joystick-icon');

  function setTargetMouse(cx, cy) {
    target.x = ((cx / window.innerWidth) * 2 - 1) * bounds.x;
    target.y = THREE.MathUtils.lerp(bounds.yMax, bounds.yMin, cy / window.innerHeight);
  }

  // Mouse move on PC
  window.addEventListener('mousemove', e => {
    // Guard: ignore synthetic mousemove events triggered by touch devices
    if (Date.now() - lastTouchTime < 1000) return;
    setTargetMouse(e.clientX, e.clientY);
  });

  // Touch controls on Mobile / Touch Screen
  window.addEventListener('touchstart', e => {
    lastTouchTime = Date.now();
    if (e.touches.length === 0) return;

    // Ignore touches on UI buttons (mute, pause, overlay buttons)
    const targetEl = e.target;
    if (targetEl.closest && (targetEl.closest('.hud-btn') || targetEl.closest('#btn') || targetEl.closest('#btn-resume'))) {
      return;
    }

    if (!isGamePlaying) {
      if (onStart) onStart();
      return;
    }

    // Touch during gameplay: activate Joystick
    const t = e.touches[0];
    touchId = t.identifier;
    joystickActive = true;

    // If touch is near resting position (within 90px), use resting center
    // Otherwise, dynamically float the joystick base to the touch location!
    const def = getDefaultRestingPos();
    const distToDefault = Math.hypot(t.clientX - def.x, t.clientY - def.y);

    if (distToDefault < 90) {
      basePos.x = def.x;
      basePos.y = def.y;
    } else {
      // Keep base cleanly within screen boundaries
      basePos.x = THREE.MathUtils.clamp(t.clientX, 65, window.innerWidth - 65);
      basePos.y = THREE.MathUtils.clamp(t.clientY, 85, window.innerHeight - 65);
    }

    if (joystickBase) {
      joystickBase.style.left = `${basePos.x}px`;
      joystickBase.style.top = `${basePos.y}px`;
      joystickBase.classList.add('visible', 'active');
      joystickBase.style.opacity = '0.92';
    }

    updateStickFromTouch(t.clientX, t.clientY);
  }, { passive: false });

  window.addEventListener('touchmove', e => {
    lastTouchTime = Date.now();
    if (!joystickActive || touchId === null) return;

    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      if (t.identifier === touchId) {
        updateStickFromTouch(t.clientX, t.clientY);
        break;
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', e => {
    if (touchId !== null) {
      let found = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchId) {
          found = true;
          break;
        }
      }
      if (!found) endJoystick();
    }
  });

  window.addEventListener('touchcancel', () => endJoystick());

  // Window resize: re-align resting position
  window.addEventListener('resize', () => {
    if (!joystickActive) resetJoystickToResting();
  });

  // Keyboard controls
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if ((e.code === 'Space' || e.code === 'Enter') && onStart) {
      onStart();
    }
  });

  window.addEventListener('keyup', e => {
    keys[e.code] = false;
  });

  // Initial resting placement
  resetJoystickToResting();
}

export function updateKeyboardInput(bounds, dt) {
  // 1. Keyboard WASD / Arrows
  const kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  const ky = (keys.ArrowUp || keys.KeyW ? 1 : 0) - (keys.ArrowDown || keys.KeyS ? 1 : 0);
  if (kx || ky) {
    target.x = THREE.MathUtils.clamp(target.x + kx * dt * 22, -bounds.x, bounds.x);
    target.y = THREE.MathUtils.clamp(target.y + ky * dt * 16, bounds.yMin, bounds.yMax);
  }

  // 2. Mobile Virtual Joystick
  if (joystickActive && (stickVector.x !== 0 || stickVector.y !== 0)) {
    const speedX = 22;
    const speedY = 16;
    target.x = THREE.MathUtils.clamp(target.x + stickVector.x * speedX * dt, -bounds.x, bounds.x);
    target.y = THREE.MathUtils.clamp(target.y + stickVector.y * speedY * dt, bounds.yMin, bounds.yMax);
  }
}
