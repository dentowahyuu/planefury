# Dokumentasi Progress: Aviator Runner

Terakhir diperbarui: 2026-10-20

Rencana arsitektur dan roadmap lengkap ada di [project.md](project.md). File ini mencatat progress implementasi, analisis bug, dan kondisi terkini.

---

## Status Saat Ini

**Seluruh Tahap 1 s/d 8 dari roadmap telah selesai diimplementasikan secara penuh.**

| Tahap | Status | Catatan |
|---|---|---|
| 1. Prototype dasar (scene, laut, langit, pesawat, kontrol) | Selesai | Biplane procedural, laut gelombang dinamis, kontrol mouse/touch/WASD |
| 2. Core loop (rintangan, koin, tabrakan, skor, game over, restart) | Selesai | Bounding box/sphere collision, scoring, high score di `localStorage` |
| 3. Mekanik shooter (peluru, musuh bergelombang) | Selesai | Auto-fire peluru ganda, 3 tipe musuh (Scout, Gunner, Heavy), destructible obstacles |
| 4. Suara (Web Audio Synth) | Selesai | SFX tembakan laser, ledakan, hit, koin chime, pickup heart + **Procedural Retro BGM** |
| 5. Power-up dan variasi musuh | Selesai | Perisai (shield), tembakan ganda/tripel, magnet koin, rapid fire ("ngucur/beredet") |
| 6. Tuning gameplay & Wave System | Selesai | Wave system bertingkat, formasi skuad musuh (V-formation, Pincer, Heavy escort), pause game (`Esc`/`P`) |
| 7. Polish & Boss Battle | Selesai | Boss Goliath Dreadnought (HP bar, twin turrets, multi-phase attack), HUD banner gelombang, sound toggle |
| 8. Migrasi ke Vite / Modular | Selesai | Arsitektur modular ES Modules bersih di `src/`, Three.js lokal offline, build Vite optimal |

---

## Cara Menjalankan

### Mode Pengembangan (Dev Server):
```powershell
npm run dev
```
Buka di browser: `http://localhost:5173`. Dilengkapi *Hot Module Replacement (HMR)* otomatis setiap kali Anda mengedit file di folder `src/`.

### Build untuk Produksi:
```powershell
npm run build
npm run preview
```
Hasil build yang optimal dan diminifikasi akan tersimpan di dalam folder `dist/`.

### Deployment ke Vercel (Mobile Ready):
Proyek ini dibangun menggunakan bundler Vite standar, sehingga **otomatis terdeteksi oleh Vercel (Zero Configuration)**:
1. Push repository ini ke GitHub / GitLab.
2. Buka dashboard [Vercel](https://vercel.com/) dan pilih **Add New Project**.
3. Import repository `game-threejs`.
4. Vercel akan otomatis mengisi:
   - **Framework Preset**: `Vite`
   - **Build Command**: `vite build`
   - **Output Directory**: `dist`
5. Klik **Deploy**! Game akan langsung live dan bisa dimainkan di HP via link Vercel.

> **Catatan Cadangan**: File prototype tunggal lama tetap diarsipkan dengan aman di file [index.prototype.html](index.prototype.html).

---

## Fitur yang Sudah Aktif

### 1. Aset Procedural (100% via Kode)
- **Pesawat Biplane**: Kokpit, pilot berkacamata & syal, kanopi kaca transparan, spinner kerucut, baling-baling putar 2 bilah, roda dan penyangga pendaratan, garis sayap merah-putih.
- **Laut Dinamis**: Plane geometry dengan vertex wave sin/cos, vertex color gradasi biru dalam ke toska dangkal, dan foam putih di puncak ombak.
- **Langit & Atmosfer**: Kubah langit 3 gradasi warna, matahari radial gradient bersinar, gumpalan awan low-poly icosahedron melayang perlahan.
- **Rintangan**: Ranjau oktahedron berduri berkedip merah, dan batu asteroid melayang bercabang. Keduanya bisa diledakkan peluru.
- **Musuh (Platypus-inspired)**:
  - **Scout (Ungu)**: 1 HP, manuver zigzag menyamping.
  - **Gunner (Hijau)**: 2 HP, mengapung stabil sambil menembakkan peluru energi merah.
  - **Heavy (Oranye Bata)**: 4 HP, pesawat tempur berat lambat pemakan peluru.
- **Pickups**:
  - **Koin Emas**: Silinder berputar dengan rim emas, memberi skor bonus.
  - **Hati (Nyawa Tambahan)**: Muncul maksimal 2x per permainan, hanya aktif ketika nyawa tersisa 1 (delay acak 12â€“20 detik).

- **Power-Ups (Platypus-inspired)**: Muncul sebagai drop dari musuh yang hancur (28% chance) berbentuk kubus futuristik dengan cincin berputar & bayangan laut:
  - **Shield (Cyan)**: Gelembung perisai kawat cyan yang melindungi pesawat dari 1x tabrakan/tembakan tanpa mengurangi nyawa.
  - **Triple Shot (Kuning/Oranye)**: Merubah tembakan menjadi 3 peluru menyebar sekaligus selama 10 detik.
  - **Coin Magnet (Ungu)**: Menarik semua koin emas di radius sekitar langsung menuju ke pesawat selama 10 detik.
  - **Rapid Fire / Gatling Stream (Merah Terang 🔥)**: Mode tembakan cepat "ngucur / beredet" (~18 peluru/detik dengan kecepatan proyektil 210) selama 10 detik. Jika aktif bersamaan dengan *Triple Shot*, menghasilkan semburan badai 3-stream peluru yang membersihkan layar. Tetap 100% bebas lag & freeze berkat pre-allocated bullet pool (120 unit) dan audio synth dynamic throttling.

### 2. Audio Procedural (Web Audio API)
Tanpa file audio eksternal (`.mp3`/`.wav`). Semua disintesis real-time menggunakan `OscillatorNode` & `GainNode`:
- `soundShoot()`: Tembakan laser frekuensi menurun.
- `soundExplode()`: Ledakan gelombang persegi frekuensi rendah (*sub-bass rumble*).
- `soundHit()`: Dentuman impact saat tertabrak/menerima damage.
- `soundCoin()`: Arpeggio dua nada ceria (B5 -> E6).
- `soundHeart()`: Nada naik harmoni segitiga (C5 -> C6).

- `soundPowerUp()`: Efek suara harmonik saat mengambil item power-up.
- `soundShieldPop()`: Efek suara gelembung pecah saat perisai menyerap damage.

### 3. Efek & Visual Gameplay
- Jejak asap di belakang ekor pesawat (smoke trail).
- Garis kecepatan (speed lines) di sekitar kamera saat melaju kencang.
- Bayangan lingkaran (shadow blob) di atas permukaan laut untuk setiap objek di udara guna memudahkan membaca kedalaman (depth perception).
- POV kamera mengikuti pesawat secara sejajar sumbu Z (menghilangkan ilusi paralaks miring).
- Hitbox pesawat berbasis kotak (sayap lebar, badan ramping) untuk tabrakan yang adil.

---

## Analisis & Riwayat Perbaikan Bug (Post-Mortem)

### 1. Layar Kosong saat Pertama Dimuat (v0.1)
- **Penyebab**: Variabel `shake` bernilai `undefined`, menghasilkan `NaN` saat perhitungan posisi kamera.
- **Solusi**: Inisialisasi default semua variabel state angka ke `0`.

### 2. Laut Bergetar saat Mengambil Koin (v0.5.1 & v0.5.2)
- **Penyebab**: Variabel `dist` (jarak dunia yang menggerakkan ombak laut) ditambah mendadak sebesar `+25` saat menyentuh koin, membuat laut meloncat 25 unit dalam 1 frame.
- **Solusi**: Memisahkan skor bonus koin ke variabel `bonus`. Ombak laut bergerak stabil berdasarkan jarak tempuh riil.

### 3. Freeze Random Saat Bermain (v0.6.1 - v0.6.5)
- **Gejala**: Game tiba-tiba membeku total secara acak beberapa detik setelah bermain.
- **Penyebab Utama 1 (Fatal Crash Loop - v0.6.5)**:
  Pada fungsi `update()`, variabel kecepatan dunia `const sp` dideklarasikan di baris bawah loop (`const sp = ...`). Namun pada blok di atasnya saat musuh tipe *Gunner* menembakkan peluru (`enemyBullets`), kode memanggil `eb.position.z += (sp + eb.userData.speed) * dt;`.
  Dalam JavaScript ES6, mengakses variabel `const` sebelum deklarasinya memicu **`Uncaught ReferenceError: Cannot access 'sp' before initialization`** (Temporal Dead Zone). Karena terjadi di dalam `renderer.setAnimationLoop`, error ini langsung menghentikan game loop secara permanen (*hard freeze*).
- **Penyebab Pendukung 2 (Shader Recompilation Stall - v0.6.4)**:
  Setiap spawn rintangan ranjau dan batu memanggil `mat()` yang membuat `new THREE.MeshLambertMaterial()` baru. WebGL terpaksa melakukan kompilasi shader baru secara sinkron di tengah frame.
- **Penyebab Pendukung 3 (DOM Layout Thrashing - v0.6.2)**:
  Pemanggilan `void t.offsetWidth` pada fungsi `toast()` memicu synchronous reflow browser.
- **Solusi yang Diterapkan**:
  - Variabel `sp` dideklarasikan di baris paling atas fungsi `update(dt)`.
  - Material rintangan di-cache dan dishare secara permanen (`mineCoreMat`, `spikeMat`, `rockMats`).
  - Menghapus layout thrashing DOM.
  - Menerapkan Object Pooling untuk mesh peluru pemain (`bulletPool`).
  - Mematikan shadow map hardware bawaan Three.js yang merender depth pass 1024x1024 ganda, menggantikannya penuh dengan procedural shadow blob laut.

### 4. Hadiah Drop Boss Mengikuti Gerak Pesawat / Macet di Layar (v1.1.1)
- **Gejala**: Saat Boss Goliath hancur, koin emas dan power-up drop tampak tidak bergerak mengikuti aliran dunia dan justru bergerak menempel/mengikuti pergerakan kamera pesawat.
- **Penyebab**:
  Pada fungsi `updateBoss()` di `Boss.js`, pemanggilan `spawnCoinLine(scene, [], ...)` dan `spawnPowerUp(scene, [], ...)` meneruskan *dummy array* kosong (`[]`).
  Akibatnya, objek 3D tersebut ditambahkan ke `scene`, tetapi **tidak terdaftar** ke dalam array `coins` dan `powerups` di `main.js`. Karena tidak ada di dalam array tersebut:
  1. Objek tidak pernah dimajukan koordinat Z-nya oleh game loop (`o.position.z += sp * dt`).
  2. Objek tidak pernah dicek kolisinya dengan pesawat (`hitsPlane`), sehingga tidak bisa diambil dan tidak bisa despawn.
  3. Karena kamera bergerak mengikuti pesawat secara dinamis, objek statis di depan kamera tersebut tampak "menempel" di layar mengikuti gerak pesawat.
- **Solusi**:
  Memindahkan inisialisasi drop ke callback `onDefeated(bossPos)` di `main.js` yang langsung mendaftarkannya ke dalam array aktif `coins` dan `powerups`. Koin dan power-up kini melaju alami ke arah pemain, memiliki animasi rotasi & bayangan laut, serta dapat dikoleksi dengan sempurna.

---

## Fitur Unggulan v1.1 (Baru Ditambahkan)

### 1. Sistem Gelombang & Formasi Skuad (Wave System)
- **Formasi Taktis**:
  - **Wave 1 (Scout Recon)**: 4 pesawat Scout ungu dalam formasi V manuver zigzag.
  - **Wave 2 (Gunner Ambush)**: 2 penembak Gunner hijau menjepit dari sisi kiri & kanan (*pincer*).
  - **Wave 3 (Heavy Convoy)**: 1 kapal tempur Heavy oranye dikawal Scout & Gunner.
- **Transisi & Breather Window**:
  - Banner sinematik di tengah layar: `WAVE 1: SCOUT RECON SQUAD`.
  - Hadiah saat seluruh skuad wave tuntas dibasmi: `WAVE CLEAR! +150 BONUS` diiringi jeda 3.5 detik (breather) berisi jalur koin emas untuk pemulihan dan power-up.
- **Sistem Pause**:
  - Tombol **Pause (`⏸`)** di HUD kanan atas atau tombol keyboard `P` / `Esc`.
  - Modal jeda estetik dengan tombol *Lanjutkan*.

### 2. Pertarungan Boss Raksasa: "Goliath Dreadnought"
- **Kemunculan**: Muncul setiap kelipatan **Wave 4** dengan sirine peringatan `⚠️ WARNING! GOLIATH DREADNOUGHT APPROACHING ⚠️`.
- **Model 3D Procedural**:
  - Zeppelin tempur lapis baja raksasa dengan moncong perunggu, 4 sirip stabilizer ekor, jembatan komando berkaca cyan, serta 2 gondola mesin baling-baling putar.
  - 2 Meriam Turret Plasma independen yang berputar dan melacak posisi pesawat pemain secara dinamis.
- **Pola Serangan 2 Fase**:
  - **Fase 1 (HP > 50%)**: Manuver sinusoidal megah sambil meluncurkan salvo tembakan plasma ganda bergantian.
  - **Fase 2 (HP ≤ 50% - Enraged)**: Asap mesin mengepul tebal, laju tembakan meningkat menjadi *3-way fan spread shot* mematikan.
- **Health Bar Boss di HUD**:
  - Bar HP visual gradien merah-oranye beranimasi mulus di bagian atas layar.
- **Runtuhnya Boss (Destruction Sequence)**:
  - Rentetan ledakan berantai di sepanjang badan zeppelin sebelum ledakan pamungkas raksasa.
  - Menjatuhkan hujan koin emas masif + 2 item Power-Up acak + **Bonus 1.000 Skor**!

### 3. Musik Latar Procedural (Retro Synth BGM)
- **100% Web Audio API**: Dihasilkan secara real-time lewat kode tanpa file MP3/WAV eksternal.
- **Dua Tema Musik**:
  - **Flight Theme**: 16-step synthwave bassline D minor (~124 BPM) berpadu melodi arpeggio ceria dan ritme perkusi hi-hat energik.
  - **Boss Theme**: Tempo meningkat (~134 BPM) dengan nada bass staccato tegang dan disonansi darurat.
- **Kontrol Audio HUD**:
  - Tombol **Mute / Unmute (`🔊`/`🔇`)** di sudut HUD (atau tombol keyboard `M`), status mute tersimpan otomatis di `localStorage`.

---

## Changelog Lengkap

- **2026-10-20 (v0.1)**: Prototype awal satu file `index.html` (Tahap 1 & 2).
- **2026-10-20 (v0.1.1)**: Perbaikan inisialisasi variabel `shake` (pencegahan kamera `NaN`).
- **2026-10-20 (v0.2)**: Pickup nyawa hati darurat (maks 2x saat nyawa 1), bayangan lingkaran laut (shadow blobs), POV kamera sejajar sumbu Z, hitbox kotak sayap.
- **2026-10-20 (v0.3 - v0.4)**: Mode debug hitbox sementara dan tuning batas pickup nyawa.
- **2026-10-20 (v0.5)**: Visual overhaul (matahari gradien, vertex color laut dengan busa ombak, model biplane pilot + goggle + kanopi, jejak asap, speed lines, glassmorphism UI).
- **2026-10-20 (v0.5.1 - v0.5.2)**: Perbaikan gelombang laut bergetar akibat manipulasi `dist`, optimasi partikel share material, penghapusan blur DOM filter.
- **2026-10-20 (v0.6)**: Implementasi Tahap 3 & 4. Auto-fire peluru ganda, 3 variasi musuh (Scout, Gunner, Heavy), destructible mines, serta synthesizer efek suara Web Audio API procedural.
- **2026-10-20 (v0.6.1 - v0.6.4)**: Optimasi performa: throttling audio synth, penghapusan normal computation berat pada laut, object pooling peluru pemain, caching material rintangan (mencegah kompilasi shader berulang), penonaktifkan hardware shadow map redundan.
- **2026-10-20 (v0.6.5 - Hard Freeze Fix)**: Memperbaiki bug fatal `ReferenceError: Cannot access 'sp' before initialization` pada pergerakan peluru musuh Gunner yang menyebabkan animasi game loop terhenti permanen.
- **2026-10-20 (v0.7 - Power-Up System)**: Implementasi Tahap 5 (Power-Up). Menambahkan 3 jenis power-up (Shield, Triple Shot 10s, Coin Magnet 10s), indikator HUD countdown timer, sphere bubble shield di pesawat, audio synth untuk pickup & shield break, serta magnet suction physics pada koin emas tanpa alokasi objek/shader baru di runtime (bebas freeze).
- **2026-10-20 (v0.8 - Rapid Fire Stream "Ngucur/Beredet")**: Menambahkan power-up ke-4: Rapid Fire (durasi 10 detik, laju tembak 18 peluru/detik, proyektil berkecepatan 210, HUD tag `🔥 RAPID`). Pre-alokasi `bulletPool` dinaikkan ke 120 mesh untuk menjamin *zero memory allocation* saat semburan peluru deras terjadi. Sintesis audio tembakan disesuaikan dinamis (interval 55ms, nada saw punchy 950Hz -> 250Hz) tanpa membebani Web Audio thread. Peluang drop dari musuh dibagi rata 25% untuk masing-masing dari 4 power-up.
- **2026-10-20 (v1.0 - Modular Vite Migration)**: Sukses migrasi dari 1 file monolitik `index.html` (>1.100 baris) ke arsitektur modular ES Modules bersih dengan bundler Vite dan Three.js lokal (`node_modules/three`). File prototype lama diarsipkan ke `index.prototype.html`. Logika dipecah ke folder `src/` (`main.js`, `config.js`, `audio.js`, `input.js`, `ui.js`, serta subfolder `src/objects/` untuk masing-masing entitas 3D). Hasil build produksi (`npm run build`) tervalidasi 100% mulus dengan 0 error.
- **2026-10-21 (v1.1 - Wave Formations, Boss Goliath, & Procedural Retro BGM)**: Implementasi penuh 3 fitur lanjutan: Sistem Gelombang (Wave 1 V-Scout, Wave 2 Gunner Pincer, Wave 3 Heavy Escort, Wave Clear bonus + breather), Boss Zeppelin Goliath Dreadnought (Health bar di HUD, meriam turret putar yang melacak pemain, fase mengamuk, ledakan rantai, hujan hadiah), serta Procedural Retro Synth BGM (synthwave 16-step bassline & arpeggio, boss battle theme, tombol Mute/Unmute & Pause `P`/`Esc`). Seluruhnya tervalidasi mulus bebas error dan bebas freeze.
