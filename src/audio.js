let audioCtx = null;
let masterGain = null;
let sfxGain = null;
let bgmGain = null;

let isMuted = (localStorage.getItem('planefury_sound_muted') || localStorage.getItem('aviator_sound_muted')) === 'true';
let lastShootSoundTime = 0;

// BGM Scheduler state
let bgmMode = 'off'; // 'normal' | 'boss' | 'off'
let bgmIntervalId = null;
let currentStep = 0;
let nextNoteTime = 0;

// Musical note frequencies (Hz)
const NOTES = {
  D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, Bb2: 116.54, C3: 130.81,
  D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, C4: 261.63,
  D4: 293.66, F4: 349.23, G4: 392.00, A4: 440.00, C5: 523.25
};

// 16-step patterns (1 bar = 16 sixteenth notes)
const NORMAL_BASS = [
  NOTES.D2, null, NOTES.D2, null,
  NOTES.F2, null, NOTES.D2, null,
  NOTES.G2, null, NOTES.A2, null,
  NOTES.C3, null, NOTES.A2, NOTES.G2
];

const NORMAL_LEAD = [
  NOTES.D4, null, NOTES.F4, null,
  NOTES.A4, null, NOTES.G4, null,
  NOTES.F4, NOTES.G4, NOTES.A4, null,
  NOTES.C5, null, NOTES.A4, null
];

const BOSS_BASS = [
  NOTES.D2, NOTES.D2, NOTES.D2, null,
  NOTES.Bb2, NOTES.Bb2, NOTES.A2, null,
  NOTES.D2, NOTES.D2, NOTES.D2, null,
  NOTES.G2, NOTES.F2, NOTES.E2, null
];

const BOSS_LEAD = [
  NOTES.A4, null, NOTES.D4, null,
  NOTES.F4, null, NOTES.E4, null,
  NOTES.Bb2 * 4, null, NOTES.A4, null,
  NOTES.G4, NOTES.F4, NOTES.E4, NOTES.D4
];

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(isMuted ? 0 : 1, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.setValueAtTime(1, audioCtx.currentTime);
    sfxGain.connect(masterGain);

    bgmGain = audioCtx.createGain();
    bgmGain.gain.setValueAtTime(0.22, audioCtx.currentTime);
    bgmGain.connect(masterGain);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function getIsMuted() {
  return isMuted;
}

export function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem('planefury_sound_muted', isMuted);
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(isMuted ? 0 : 1, audioCtx.currentTime);
  }
  return isMuted;
}

export function playTone(freqStart, freqEnd, type, duration, vol = 0.15) {
  if (!audioCtx || audioCtx.state !== 'running' || isMuted) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), now + duration);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(sfxGain || audioCtx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch (e) {}
}

export function soundShoot(isRapid = false) {
  const now = performance.now();
  const interval = isRapid ? 55 : 130;
  if (now - lastShootSoundTime < interval) return;
  lastShootSoundTime = now;
  if (isRapid) {
    playTone(950, 250, 'sawtooth', 0.04, 0.035);
  } else {
    playTone(850, 150, 'sawtooth', 0.06, 0.04);
  }
}

export function soundExplode() {
  playTone(220, 30, 'square', 0.35, 0.25);
}

export function soundHit() {
  playTone(180, 60, 'sawtooth', 0.15, 0.2);
}

export function soundCoin() {
  playTone(987.77, 1318.51, 'sine', 0.15, 0.18);
}

export function soundHeart() {
  playTone(523.25, 1046.50, 'triangle', 0.3, 0.22);
}

export function soundPowerUp() {
  playTone(440, 880, 'sine', 0.25, 0.22);
}

export function soundShieldPop() {
  playTone(350, 100, 'sine', 0.2, 0.25);
}

export function soundBossWarning() {
  if (!audioCtx || isMuted) return;
  // Two-tone rising alarm
  playTone(440, 660, 'sawtooth', 0.25, 0.2);
  setTimeout(() => playTone(550, 880, 'sawtooth', 0.35, 0.25), 260);
}

/* ================= PROCEDURAL RETRO BGM ================= */

function scheduleNote(freq, type, time, duration, vol) {
  if (!audioCtx || !freq || isMuted) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(bgmGain || audioCtx.destination);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  } catch (e) {}
}

function scheduleHiHat(time) {
  if (!audioCtx || isMuted) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.03);

    gain.gain.setValueAtTime(0.03, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);

    osc.connect(gain);
    gain.connect(bgmGain || audioCtx.destination);

    osc.start(time);
    osc.stop(time + 0.04);
  } catch (e) {}
}

function bgmScheduler() {
  if (!audioCtx || bgmMode === 'off') return;
  const bpm = bgmMode === 'boss' ? 134 : 124;
  const stepTime = (60 / bpm) / 4; // 16th note

  while (nextNoteTime < audioCtx.currentTime + 0.12) {
    const bassSeq = bgmMode === 'boss' ? BOSS_BASS : NORMAL_BASS;
    const leadSeq = bgmMode === 'boss' ? BOSS_LEAD : NORMAL_LEAD;

    const bassFreq = bassSeq[currentStep % bassSeq.length];
    const leadFreq = leadSeq[currentStep % leadSeq.length];

    // Bassline note
    if (bassFreq) {
      scheduleNote(bassFreq, 'sawtooth', nextNoteTime, stepTime * 0.9, 0.055);
    }

    // Melodic lead note (on select offbeats)
    if (leadFreq && currentStep % 2 === 0) {
      scheduleNote(leadFreq, 'triangle', nextNoteTime, stepTime * 1.6, 0.035);
    }

    // Rhythmic hihat / percussion click
    if (currentStep % 2 === 0 || currentStep % 4 === 2) {
      scheduleHiHat(nextNoteTime);
    }

    nextNoteTime += stepTime;
    currentStep = (currentStep + 1) % 16;
  }
}

export function startBGM(mode = 'normal') {
  initAudio();
  setBGMMode(mode);
}

export function setBGMMode(mode) {
  if (bgmMode === mode) return;
  bgmMode = mode;
  if (bgmMode === 'off') {
    if (bgmIntervalId) {
      clearInterval(bgmIntervalId);
      bgmIntervalId = null;
    }
  } else {
    if (!bgmIntervalId && audioCtx) {
      nextNoteTime = audioCtx.currentTime + 0.05;
      currentStep = 0;
      bgmIntervalId = setInterval(bgmScheduler, 40);
    }
  }
}

export function stopBGM() {
  setBGMMode('off');
}
