# Argopuro Walida — Website Publik

Company profile + peta polygon kebun + booking e-commerce lahan.

Proyek **terpisah** dari sistem admin Walida. Website ini hanya:

- **Membaca** polygon: `GET {WALIDA_API}/api/polygon`
- **Menulis** booking: `POST {WALIDA_API}/api/booking`

Tidak ada URI MongoDB di kode. Login admin / CRUD polygon tidak ada di situs publik.

## Stack

- Backend: **Flask** + **Gunicorn**
- Data petak/booking: HTTP ke sistem admin (`WALIDA_API`)
- Database: MongoDB hanya di sistem admin (opsional `pymongo` jika `MONGO_URI` di-set)
- Frontend: **Jinja2** (`Templates/`) + **JavaScript** biasa (`script/`)
- CSS: Bootstrap di `static/bootstrap/` + `static/css/site.css`
- Auth pendukung: **Flask session** (draft booking) + **PyJWT** (utilitas token)

## Struktur folder

| Folder | Isi |
| --- | --- |
| `Templates/` | File HTML (Jinja2) |
| `static/` | Bootstrap, CSS, logo, carousel |
| `script/` | Semua file JavaScript |
| `content/` | Teks company / invoice / pembayaran |
| `services/` | Klien API admin, helper, JWT, DB opsional |

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

Jika peta kosong dengan pesan “WALIDA_API belum diatur”, isi origin layanan admin
(contoh `https://argopuro-walida-new-production.up.railway.app`) lalu **Redeploy**.

## Halaman

- `/` Beranda
- `/tentang` Tentang
- `/proses` Proses kopi
- `/kontak` Kontak
- `/peta` Peta kebun (filter MDPL & proses, Petani + foto, Book)
- `/lahan/<id>` Data petak
- `/lahan/<id>/booking` Form jumlah GB
- `/lahan/<id>/checkout` Data pembeli + submit
- `/invoice/<id>` Invoice (harga tampil di sini)

## Catatan

Body `POST /api/booking` tidak diubah. Harga tidak ditampilkan di detail polygon; muncul di invoice.
