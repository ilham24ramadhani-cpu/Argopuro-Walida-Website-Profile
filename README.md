# Argopuro Walida — Website Profile

Situs publik company profile + peta polygon kebun (Flask).

## Struktur

- `templates/` — HTML (Jinja2)
- `static/` — CSS, logo, foto carousel
- `script/` — JavaScript (carousel, nav, peta)
- `app.py` — server + API GET `/api/polygon`
- `content.py` — teks profil perusahaan

## Lokal

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # isi MONGODB_URI, DB_NAME, SECRET_KEY
python app.py
```

Buka http://127.0.0.1:8001

## Railway

Builder: **Nixpacks** (bukan Dockerfile). Di dashboard service → Settings → Build pastikan Builder = Nixpacks.

Variables yang wajib:

- `MONGODB_URI`
- `DB_NAME` (contoh: `DB_Walida`)
- `SECRET_KEY`
- `PORT` diisi otomatis oleh Railway

Start command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
