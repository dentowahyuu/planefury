# Project: Aviator Runner (Game Pesawat 3D dengan Three.js)

## 1. Ringkasan

Game browser 3D bergaya endless runner ala "game dino", tapi karakternya pesawat. Dibuat dari nol dengan Three.js, termasuk semua aset (model, tekstur, animasi, suara) yang dihasilkan lewat kode (procedural) tanpa file eksternal.

## 2. Referensi

| Referensi | Yang diambil |
|---|---|
| [The Aviator](https://tympanus.net/Tutorials/TheAviator/) | Gaya visual low-poly, pesawat dikontrol mouse/sentuhan, laut, awan, langit, koin, dan rintangan datang dari depan. Semuanya murni geometri Three.js. |
| Platypus | Mekanik shooter: pesawat menembak, musuh datang bergelombang, jenis musuh beragam, power-up. |

## 3. Keinginan (Requirements)

- Game seperti dino game versi pesawat 3D.
- Dibuat dengan Three.js dari nol.
- Aset (model, animasi, dll.) dibuat sendiri lewat kode.
- Ada tambahan mekanik dari referensi Platypus.
- Stack: ditentukan di bagian 4.

## 4. Keputusan Stack

**Pilihan awal: Vite + JavaScript biasa (atau satu file HTML untuk prototype).**

Alasan:
- Fokus ke game, setup minimal.
- Game loop (`requestAnimationFrame`) berjalan di luar siklus React, jadi framework tidak dibutuhkan.
- Ringan dan mudah di-debug.

**Next.js dipertimbangkan nanti**, hanya jika butuh:
- Login / akun pemain
- Leaderboard dengan database
- Deploy ke Vercel beserta backend

Catatan jika nanti dipindah ke Next.js:
- Three.js harus jalan di client side (`"use client"` atau `dynamic(() => import(...), { ssr: false })`).
- Game loop tetap di luar state React (`useRef` + `useEffect`). Jangan simpan posisi pesawat atau skor per frame di `useState`, karena menyebabkan re-render terus dan lag.
- Kode game dibuat modular supaya bisa dipindah hampir apa adanya.
- React Three Fiber bisa dipakai, tapi Three.js murni lebih mudah dikontrol performanya untuk banyak objek dinamis.

## 5. Aset Procedural

| Aset | Cara membuat |
|---|---|
| Pesawat | Gabungan `BoxGeometry`, `CylinderGeometry`, `SphereGeometry` dalam satu `Group` (badan, sayap, ekor, baling-baling) |
| Awan | Kumpulan box/sphere acak yang berputar pelan |
| Laut / terrain | Silinder besar atau plane dengan vertex digeser gelombang (sin/cos atau noise) |
| Langit | Gradient lewat canvas texture atau `scene.fog` + warna background |
| Musuh & rintangan | Primitif low-poly dengan variasi bentuk dan warna |
| Koin / power-up | Torus, octahedron, atau shape sederhana yang berputar |
| Tekstur | Canvas 2D API atau shader (noise, gradient, pola) |
| Partikel | `Points` atau pool mesh kecil untuk ledakan, asap, dan jejak |
| Audio | Web Audio API (oscillator untuk tembakan, ledakan, koin, mesin), tanpa file mp3 |

## 6. Mekanik Game

### Inti (dari The Aviator / dino game)
- Pesawat mengikuti posisi mouse atau sentuhan (bisa juga keyboard).
- Dunia bergerak ke arah pesawat, kecepatan naik seiring waktu.
- Rintangan datang dari depan, tabrakan mengurangi nyawa atau mengakhiri game.
- Koin untuk skor tambahan.
- Skor berdasarkan jarak tempuh.

### Tambahan (dari Platypus)
- Tembakan pesawat (tombol / auto-fire).
- Musuh bergelombang dengan beberapa tipe (lurus, zig-zag, penembak).
- Ledakan partikel saat musuh hancur.
- Power-up: perisai, tembakan ganda, magnet koin, slow motion.
- Boss sederhana di kelipatan skor tertentu (opsional, tahap akhir).

## 7. Struktur Kode (disarankan)

```
aviator-runner/
├── index.html
├── src/
│   ├── main.js          # init renderer, scene, kamera, loop
│   ├── game.js          # state game, skor, nyawa, difficulty
│   ├── input.js         # mouse, touch, keyboard
│   ├── objects/
│   │   ├── airplane.js
│   │   ├── sea.js
│   │   ├── sky.js
│   │   ├── enemy.js
│   │   ├── coin.js
│   │   └── bullet.js
│   ├── systems/
│   │   ├── spawner.js   # spawn musuh, koin, rintangan
│   │   ├── collision.js
│   │   └── particles.js
│   ├── audio.js         # Web Audio synth
│   └── ui.js            # HUD, menu, game over
└── package.json
```

Prototype awal boleh digabung dalam satu file HTML, lalu dipecah ke struktur di atas saat mulai membesar.

## 8. Performa dan Teknis

- Pakai object pooling untuk peluru, musuh, koin, dan partikel (hindari `new` dan `dispose` terus-menerus).
- Gunakan delta time agar kecepatan konsisten di semua refresh rate.
- Kolisi cukup dengan bounding sphere / box sederhana.
- Batasi `devicePixelRatio` (misalnya maksimal 2) supaya aman di HP.
- Gabungkan geometri statis jika memungkinkan untuk mengurangi draw call.
- Dukung kontrol sentuhan sejak awal.

## 9. Roadmap

1. **Prototype dasar**: scene, laut, langit, pesawat, kontrol mouse/sentuhan.
2. **Core loop**: rintangan, koin, tabrakan, skor, game over, restart.
3. **Mekanik shooter**: peluru, musuh bergelombang, ledakan partikel.
4. **Suara**: efek dari Web Audio API, musik latar sederhana.
5. **Power-up dan variasi musuh**.
6. **Tuning gameplay**: kecepatan, spawn rate, kurva kesulitan.
7. **Polish**: menu, HUD, high score (localStorage), efek visual.
8. **Opsional**: bungkus ke Next.js untuk leaderboard dan akun.

## 10. Risiko dan Catatan

- Tantangan terbesar bukan teknis, tapi **tuning gameplay** (kecepatan, spawn rate, kesulitan) agar terasa enak.
- Gaya visual akan **low-poly / stylized**, bukan realistis.
- Animasi organik yang halus sulit dibuat tanpa skeletal animation; untuk pesawat ini tidak jadi masalah.
- Makin banyak jenis musuh dan efek, makin banyak kode yang perlu di-tuning manual.

## 11. Langkah Berikutnya

- Buat prototype satu file HTML (tahap 1 dan 2) untuk dites langsung di browser.
- Setelah gameplay terasa pas, pindah ke Vite dengan struktur modular.
