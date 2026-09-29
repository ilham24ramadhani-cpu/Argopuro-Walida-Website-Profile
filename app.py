"""Argopuro Walida — website publik (Flask + Jinja2).

Semua data (polygon, proses, booking, akun customer) diambil browser langsung dari API admin
(WALIDA_API, lihat script/api.js). Route di sini hanya merender template.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from flask import (
    Flask,
    Response,
    redirect,
    render_template,
    send_from_directory,
    url_for,
)

from config import Config
from content import COMPANY, INVOICE_LETTERHEAD, KETERANGAN_PEMBAYARAN
from services import helpers as H

BASE_DIR = Path(__file__).resolve().parent
I18N_DIR = BASE_DIR / 'static' / 'i18n'
LANGS = ('id', 'en')


def create_app(config_class=Config):
    app = Flask(
        __name__,
        template_folder='Templates',
        static_folder='static',
        static_url_path='/static',
    )
    app.config.from_object(config_class)

    def wa_link(text: str = '') -> str:
        return H.wa_link((COMPANY.get('kontak') or {}).get('whatsapp'), text)

    def i18n_version() -> int:
        return int(max((I18N_DIR / f'{lang}.json').stat().st_mtime for lang in LANGS))

    @app.context_processor
    def inject_globals():
        return {
            'company': COMPANY,
            'walida_api': app.config.get('WALIDA_API') or '',
            'year': datetime.now().year,
            'wa_link': wa_link,
        }

    @app.url_defaults
    def i18n_cache_bust(endpoint, values):
        if endpoint == 'i18n_dict':
            values.setdefault('v', i18n_version())

    @app.route('/script/<path:filename>')
    def script_files(filename):
        return send_from_directory(BASE_DIR / 'script', filename)

    @app.get('/i18n-dict.js')
    def i18n_dict():
        dicts = {}
        for lang in LANGS:
            with open(I18N_DIR / f'{lang}.json', encoding='utf-8') as f:
                dicts[lang] = json.load(f)
        body = 'window.AW_I18N_DICT = ' + json.dumps(dicts, ensure_ascii=False) + ';\n'
        res = Response(body, mimetype='application/javascript')
        res.headers['Cache-Control'] = 'public, max-age=86400'
        return res

    # ——— Halaman konten ———

    @app.get('/')
    def home():
        return render_template('home.html', map_mode=False)

    @app.get('/tentang')
    def tentang():
        return render_template('tentang.html')

    @app.get('/proses')
    def proses():
        return redirect(url_for('proses_pengolahan'), code=301)

    @app.get('/proses-pengolahan')
    def proses_pengolahan():
        return render_template('proses_pengolahan.html')

    @app.get('/kontak')
    def kontak():
        k = COMPANY.get('kontak') or {}
        sosial = k.get('sosial') or {}
        fields = []
        if k.get('alamat'):
            fields.append(('contact.address', 'Alamat', k['alamat'], None))
        if k.get('telepon'):
            fields.append(('contact.phone', 'Telepon', k['telepon'], f"tel:{k['telepon']}"))
        if k.get('whatsapp'):
            fields.append(('contact.whatsapp', 'WhatsApp', k['whatsapp'], wa_link()))
        if k.get('email'):
            fields.append(('contact.email', 'Email', k['email'], f"mailto:{k['email']}"))
        for label, key in (
            ('Instagram', 'instagram'),
            ('Facebook', 'facebook'),
            ('YouTube', 'youtube'),
        ):
            if sosial.get(key):
                fields.append(('', label, sosial[key], sosial[key]))
        return render_template('kontak.html', contact_fields=fields)

    @app.get('/peta')
    def peta():
        return render_template('peta.html', map_mode=True)

    # ——— Petak & booking (booking wajib login customer) ———

    @app.get('/lahan/<id_polygon>')
    def lahan(id_polygon):
        return render_template('lahan.html', id_polygon=id_polygon)

    @app.get('/lahan/<id_polygon>/booking')
    def booking(id_polygon):
        return render_template('booking.html', id_polygon=id_polygon, require_login=True)

    @app.get('/lahan/<id_polygon>/checkout')
    def checkout(id_polygon):
        return render_template(
            'checkout.html',
            id_polygon=id_polygon,
            require_login=True,
            pembayaran=KETERANGAN_PEMBAYARAN,
        )

    @app.get('/invoice/<id_pembelian>')
    def invoice(id_pembelian):
        return render_template(
            'invoice.html',
            id_pembelian=id_pembelian,
            require_login=True,
            letterhead=INVOICE_LETTERHEAD,
            pembayaran_default=KETERANGAN_PEMBAYARAN,
        )

    # ——— Akun customer ———

    @app.get('/login')
    def login():
        return render_template('login.html')

    @app.get('/signup')
    def signup():
        return render_template('signup.html')

    @app.get('/dashboard')
    def dashboard():
        return render_template('dashboard_profil.html', require_login=True, dash_tab='profil')

    @app.get('/dashboard/pesanan')
    def dashboard_pesanan():
        return render_template('dashboard_pesanan.html', require_login=True, dash_tab='pesanan')

    @app.get('/dashboard/pesanan/<id_pembelian>')
    def dashboard_pesanan_detail(id_pembelian):
        return render_template(
            'dashboard_pesanan_detail.html',
            require_login=True,
            dash_tab='pesanan',
            id_pembelian=id_pembelian,
        )

    return app


app = create_app()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(__import__('os').environ.get('PORT', 8000)), debug=True)
