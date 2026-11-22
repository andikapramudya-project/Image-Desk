<h1 align="center">Image Desk</h1>

<p align="center">Pemroses gambar berbasis browser: kompres, ubah ukuran, konversi format, dan beri watermark secara massal.</p>

<p align="center">
  <img alt="Stack" src="https://img.shields.io/badge/HTML%20%C2%B7%20CSS%20%C2%B7%20JavaScript-tanpa%20build-f0db4f?style=flat-square" />
  <img alt="Pemrosesan" src="https://img.shields.io/badge/pemrosesan-di%20browser-2d9d78?style=flat-square" />
  <img alt="Hosting" src="https://img.shields.io/badge/hosting-GitHub%20Pages-555?style=flat-square" />
</p>

<p align="center">
  <a href="#fitur">Fitur</a> ·
  <a href="#menjalankan">Menjalankan</a> ·
  <a href="#cara-penggunaan">Penggunaan</a> ·
  <a href="#struktur">Struktur</a>
</p>

---

## Ringkasan

Image Desk memproses banyak gambar sekaligus langsung di browser. Gambar digambar ulang pada kanvas, sehingga tidak ada berkas yang diunggah ke server. Cocok untuk menyiapkan foto sebelum diunggah ke situs atau dikirim.

## Fitur

- **Konversi format** ke JPG, WebP, atau PNG.
- **Kompresi dengan slider kualitas** (10–100%) beserta pratinjau estimasi ukuran.
- **Ubah ukuran** berdasarkan lebar dan tinggi maksimum, dengan rasio asli dipertahankan dan tanpa memperbesar gambar.
- **Watermark teks** dengan pilihan posisi (empat sudut atau tengah) dan transparansi.
- **Pemrosesan batch** dengan daftar gambar, pengaturan kualitas per gambar, dan unduhan satuan atau sekaligus.
- **Seret dan lepas** berkas ke area unggah.
- **Tema terang dan gelap.**

## Menjalankan

Tidak memerlukan Node.js, dependensi, maupun proses build. Sajikan folder ini melalui server HTTP statis:

```sh
python -m http.server 8080
```

Lalu buka `http://localhost:8080`.

Untuk publikasi, folder root dapat langsung dipakai pada **GitHub Pages**.

## Cara penggunaan

1. Seret gambar ke area unggah atau pilih dari perangkat.
2. Atur format output, kualitas, ukuran, dan watermark pada panel **Pengaturan**.
3. Jalankan pemrosesan, lalu unduh hasil satu per satu atau semuanya.

## Struktur

```text
index.html   Antarmuka
script.js    Logika pemrosesan gambar
styles.css   Gaya dan tema
```

## Catatan

- Seluruh pemrosesan terjadi di perangkat pengguna; berkas tidak dikirim ke server mana pun.
- Aplikasi belum memiliki suite pengujian otomatis. Pemeriksaan sintaks, aset, dan pembukaan halaman di Chrome headless lulus tanpa exception JavaScript (22 November 2026).
