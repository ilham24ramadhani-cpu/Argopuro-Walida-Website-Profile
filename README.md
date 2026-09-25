# Argopuro Walida — Website Publik

Company profile + peta polygon kebun + booking e-commerce lahan.

Proyek **terpisah** dari sistem admin Walida. Website ini hanya:

- **Membaca** polygon: `GET {VITE_WALIDA_API}/api/polygon`
- **Menulis** booking: `POST {VITE_WALIDA_API}/api/booking`

Tidak ada URI MongoDB, login admin, atau CRUD polygon di frontend.

## Stack

Vite + React + React Router + Leaflet (OpenStreetMap)

## Lokal

```bash
cp .env.example .env
# isi VITE_WALIDA_API = origin sistem admin, contoh http://127.0.0.1:8080

npm install
npm run dev
```

Buka http://127.0.0.1:5173

Pastikan sistem admin Walida berjalan dan CORS mengizinkan origin website.

## Build & production

```bash
npm run build
npm start
```

`npm start` memakai `serve` untuk folder `dist` (port dari `PORT` atau 4173).

## Konten

| File | Isi |
| --- | --- |
| `src/content/company.js` | Nama, tagline, tentang, proses, kontak |
| `src/content/payment.js` | Teks Bank Jatim untuk invoice |
| `public/logo.png` | Logo |
| `public/carousel/` | Foto beranda |

Field kontak kosong **tidak ditampilkan** dan tidak dikarang.

## Halaman

- `/` Beranda
- `/tentang` Tentang
- `/proses` Proses kopi
- `/peta` Peta kebun + panel petak + tombol Check
- `/lahan/:idPolygon` Data petak (e-commerce lahan)
- `/lahan/:idPolygon/booking` Form jumlah GB
- `/lahan/:idPolygon/checkout` Data pembeli + submit
- `/invoice/:idPembelian` Invoice

## Catatan booking

Jika `POST /api/booking` belum ada di admin, checkout menampilkan pesan error yang jelas. Website **tidak** menyimpan pesanan palsu ke localStorage sebagai sumber kebenaran.
