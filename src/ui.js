export const $ = id => document.getElementById(id);

let toastTimer = null;
let bannerTimer = null;

export function renderLives(lives, popIdx = -1, isPlaying = true) {
  $('lives').innerHTML = [0, 1, 2].map(i =>
    `<span class="heart${i >= lives ? ' lost' : ''}${i === popIdx ? ' pop' : ''}">♥</span>`).join('');
  $('vignette').classList.toggle('on', lives === 1 && isPlaying);
}

export function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.className = 'show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, 1200);
}

export function updatePowerupHUD(hasShield, tripleTimer, magnetTimer, rapidTimer, shieldMesh) {
  $('tag-shield').style.display = hasShield ? 'flex' : 'none';
  if (shieldMesh) shieldMesh.visible = hasShield;

  if (tripleTimer > 0) {
    $('tag-triple').style.display = 'flex';
    $('triple-time').textContent = Math.ceil(tripleTimer);
  } else {
    $('tag-triple').style.display = 'none';
  }

  if (magnetTimer > 0) {
    $('tag-magnet').style.display = 'flex';
    $('magnet-time').textContent = Math.ceil(magnetTimer);
  } else {
    $('tag-magnet').style.display = 'none';
  }

  if (rapidTimer > 0) {
    $('tag-rapid').style.display = 'flex';
    $('rapid-time').textContent = Math.ceil(rapidTimer);
  } else {
    $('tag-rapid').style.display = 'none';
  }
}

/* ================= WAVE & BOSS UI ================= */

export function updateWaveHUD(text) {
  const el = $('wave-hud');
  if (el) el.textContent = text;
}

export function showWaveBanner(title, subtitle = '', isBoss = false, duration = 2400) {
  const banner = $('wave-banner');
  const t = $('wb-title');
  const s = $('wb-sub');
  if (!banner || !t || !s) return;

  t.textContent = title;
  s.textContent = subtitle;
  banner.className = isBoss ? 'show boss' : 'show';

  clearTimeout(bannerTimer);
  if (duration > 0) {
    bannerTimer = setTimeout(() => {
      banner.className = '';
    }, duration);
  }
}

export function hideWaveBanner() {
  const banner = $('wave-banner');
  if (banner) banner.className = '';
  clearTimeout(bannerTimer);
}

export function showBossHUD(name = '⚠️ GOLIATH DREADNOUGHT ⚠️') {
  const hud = $('boss-hud');
  const lbl = $('boss-label');
  if (lbl) lbl.textContent = name;
  if (hud) hud.style.display = 'flex';
  updateBossHP(1, 1);
}

export function updateBossHP(hp, maxHp) {
  const fill = $('boss-bar-fill');
  if (fill) {
    const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    fill.style.width = pct + '%';
  }
}

export function hideBossHUD() {
  const hud = $('boss-hud');
  if (hud) hud.style.display = 'none';
}

export function togglePauseUI(isPaused) {
  const p = $('pause-overlay');
  if (p) p.classList.toggle('hidden', !isPaused);
}

export function updateSoundButton(isMuted) {
  const btn = $('btn-sound');
  if (btn) {
    btn.textContent = isMuted ? '🔇' : '🔊';
    btn.title = isMuted ? 'Suara (Muted) - Klik untuk aktifkan' : 'Suara (Aktif) - Klik untuk senyapkan';
  }
}
