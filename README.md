# Argopuro Walida — Website Publik

Company profile + peta polygon kebun + booking green bean + dashboard customer.

Proyek **terpisah** dari sistem admin Walida. Flask hanya merender kerangka halaman;
**semua data diambil browser langsung dari API admin** (CORS aktif di admin):

- Polygon, petani, proses pengolahan: `GET /api/polygon`, `/api/polygon/<id>`, `/api/petani/<id>`, `/api/polygon-proses`
- Akun customer: `POST /api/public/customer/signup`, `/login`, `GET/PUT /api/public/customer/me`
- Booking (wajib login): `POST /api/booking`, invoice `GET /api/booking/<idPembelian>`
- Pesanan saya: `GET /api/public/customer/orders`, `/orders/<id>` (+ traceability)

Tidak ada URI MongoDB / akses database dari situs ini.

## Stack

- Backend: **Flask** + **Gunicorn** (hanya template + file statis)
- Frontend: **Jinja2** (`Templates/`) + **JavaScript biasa** (`script/`) — tanpa framework, bundler, atau npm
- CSS: Bootstrap (`static/bootstrap/`) + `static/css/site.css` + `static/css/dashboard.css`
- Peta: **MapLibre GL 4.7.1** (CDN unpkg) — OSM / Esri satelit, terrain 3D dari DEM terrarium
- Export Excel: **SheetJS** (CDN, hanya di halaman Pesanan Saya)
- Bahasa: Indonesia / English (`static/i18n/id.json`, `en.json`)

## Struktur folder

| Folder | Isi |
| --- | --- |
| `Templates/` | Kerangka halaman (Jinja2) |
| `script/` | Semua JavaScript (lihat di bawah) |
| `static/` | Bootstrap, CSS, kamus i18n, logo, carousel |
| `content/` | Teks company / invoice / pembayaran |
| `services/` | Helper (`wa_link`), DB opsional |

File JavaScript inti (dimuat di `<head>` pada semua halaman):

| File | Isi |
| --- | --- |
| `i18n.js` | `AWI18n` — bahasa aktif, `t()`, format angka/Rupiah/tanggal, atribut `data-i18n*` |
| `api.js` | `window.AW_API_BASE` (satu-satunya konstanta base URL) + `AWApi` |
| `auth.js` | `AWAuth` — token customer (localStorage `awCustomerToken`, `awCustomer`), booking tertunda |
| `utils.js` | `WalidaUtils` — format tampilan polygon/petani, badge, avatar |

Base URL API diambil dari env `WALIDA_API` dan disuntikkan lewat `<meta name="aw-api-base">`.

## Lokal

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# isi WALIDA_API = origin sistem admin

python app.py
# atau: gunicorn wsgi:app --bind 0.0.0.0:5000
```

Buka http://127.0.0.1:5000

## Production (Railway)

Set variables: `WALIDA_API` (atau `VITE_WALIDA_API`), `SECRET_KEY`, `PORT`.  
Start: `gunicorn wsgi:app --bind 0.0.0.0:$PORT`

Jika muncul pesan “WALIDA_API belum diatur”, isi origin layanan admin
(contoh `https://argopuro-walida-new-production.up.railway.app`) lalu **Redeploy**.

## Halaman

- `/` Beranda · `/tentang` Tentang · `/kontak` Kontak
- `/proses-pengolahan` Proses pengolahan (kartu dari API, filter ketinggian & varietas)
- `/peta` Peta kebun 2D/3D (filter, detail petak, petani, proses)
- `/lahan/<id>` Detail petak
- `/lahan/<id>/booking` → `/lahan/<id>/checkout` → `/invoice/<id>` (wajib login)
- `/login`, `/signup`
- `/dashboard` Profil · `/dashboard/pesanan` Pesanan Saya (filter, rekap, export CSV/Excel) ·
  `/dashboard/pesanan/<id>` Detail + traceability

## Catatan

- Body `POST /api/booking` tidak berubah; request hanya dikirim bila ada token (tanpa token → ke halaman login).
- Token kedaluwarsa (401) → sesi dihapus, isian booking disimpan di sessionStorage, lalu diarahkan ke login dan dikembalikan ke form.
- Nilai status (`Ordering`, `Complete`, `Belum Lunas`, …) dikirim ke API apa adanya; terjemahan hanya untuk tampilan.
