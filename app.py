"""Argopuro Walida — website publik (Flask + Jinja2)."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from flask import (
    Flask,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    send_from_directory,
    session,
    url_for,
)

from config import Config
from content import COMPANY, INVOICE_LETTERHEAD, KETERANGAN_PEMBAYARAN
from services import helpers as H
from services import walida_api

BASE_DIR = Path(__file__).resolve().parent


def create_app(config_class=Config):
    app = Flask(
        __name__,
        template_folder='Templates',
        static_folder='static',
        static_url_path='/static',
    )
    app.config.from_object(config_class)

    @app.context_processor
    def inject_globals():
        return {
            'company': COMPANY,
            'walida_api': app.config.get('WALIDA_API') or '',
            'year': datetime.now().year,
        }

    @app.route('/script/<path:filename>')
    def script_files(filename):
        return send_from_directory(BASE_DIR / 'script', filename)

    # ——— Halaman konten ———

    @app.get('/')
    def home():
        return render_template('home.html', map_mode=False)

    @app.get('/tentang')
    def tentang():
        return render_template('tentang.html')

    @app.get('/proses')
    def proses():
        return render_template('proses.html')

    @app.get('/kontak')
    def kontak():
        k = COMPANY.get('kontak') or {}
        sosial = k.get('sosial') or {}
        fields = []
        if k.get('alamat'):
            fields.append(('Alamat', k['alamat'], None))
        if k.get('telepon'):
            fields.append(('Telepon', k['telepon'], f"tel:{k['telepon']}"))
        if k.get('email'):
            fields.append(('Email', k['email'], f"mailto:{k['email']}"))
        for label, key in (
            ('Instagram', 'instagram'),
            ('Facebook', 'facebook'),
            ('YouTube', 'youtube'),
        ):
            if sosial.get(key):
                fields.append((label, sosial[key], sosial[key]))
        return render_template('kontak.html', contact_fields=fields)

    @app.get('/peta')
    def peta():
        return render_template('peta.html', map_mode=True)

    # ——— Petak & booking ———

    @app.get('/lahan/<id_polygon>')
    def lahan(id_polygon):
        error = ''
        item = None
        try:
            item = walida_api.fetch_polygon(id_polygon)
        except walida_api.WalidaApiError as exc:
            error = str(exc)
        api_base = app.config.get('WALIDA_API') or ''
        ctx = {}
        if item:
            ctx = {
                'item': item,
                'nama': H.display_name(item),
                'petani': H.petani_nama(item) or '—',
                'foto_url': H.petani_foto_url(item, api_base),
                'inisial': H.petani_inisial(item),
                'proses_list': H.process_names(item),
                'stock': H.available_stock(item),
                'sold_out': H.is_sold_out(item),
                'luas': H.land_area_ha(item),
                'can_book': H.can_book(item),
                'pembeli': item.get('pembeliBooking')
                if isinstance(item.get('pembeliBooking'), list)
                else [],
                'format_kg': H.format_kg,
                'format_meter': H.format_meter,
                'format_ha': H.format_ha,
            }
        return render_template('lahan.html', error=error, **ctx)

    @app.route('/lahan/<id_polygon>/booking', methods=['GET', 'POST'])
    def booking(id_polygon):
        error = ''
        item = None
        try:
            item = walida_api.fetch_polygon(id_polygon)
        except walida_api.WalidaApiError as exc:
            error = str(exc)
            return render_template('booking.html', error=error, item=None)

        proses_list = H.process_names(item)
        stock = H.available_stock(item)
        form_error = ''
        qty = request.form.get('jumlahPesananKg', '')
        proses_val = request.form.get('prosesPengolahan', '')

        if request.method == 'POST':
            try:
                qty_num = float(qty)
            except (TypeError, ValueError):
                qty_num = 0
            if not proses_val:
                form_error = 'Pilih proses pengolahan.'
            elif proses_val not in proses_list:
                form_error = 'Proses pengolahan tidak valid untuk petak ini.'
            elif qty_num <= 0:
                form_error = 'Jumlah GB harus lebih dari 0.'
            elif stock is not None and qty_num > stock:
                form_error = f'Jumlah melebihi stok tersedia ({H.format_kg(stock)}).'
            else:
                try:
                    harga = float(item.get('hargaPerKg'))
                except (TypeError, ValueError):
                    harga = 0
                if harga <= 0:
                    form_error = 'Harga per kg belum diisi admin.'
                else:
                    session['booking_draft'] = {
                        'idPolygon': item.get('idPolygon'),
                        'namaPolygon': H.display_name(item),
                        'jumlahPesananKg': qty_num,
                        'prosesPengolahan': proses_val,
                        'varietas': item.get('varietas') or '',
                        'hargaPerKg': harga,
                        'productPrice': qty_num * harga,
                        'jenisKopi': item.get('jenisKopi') or '',
                    }
                    return redirect(
                        url_for('checkout', id_polygon=item.get('idPolygon'))
                    )

        return render_template(
            'booking.html',
            error='',
            item=item,
            nama=H.display_name(item),
            petani=H.petani_nama(item),
            proses_list=proses_list,
            stock=stock,
            form_error=form_error,
            qty=qty,
            proses_val=proses_val,
            format_kg=H.format_kg,
        )

    @app.route('/lahan/<id_polygon>/checkout', methods=['GET', 'POST'])
    def checkout(id_polygon):
        draft = session.get('booking_draft')
        if not draft or draft.get('idPolygon') != id_polygon:
            flash('Data booking tidak ditemukan. Mulai ulang dari halaman petak.', 'error')
            return redirect(url_for('lahan', id_polygon=id_polygon))

        item = None
        try:
            item = walida_api.fetch_polygon(id_polygon)
        except walida_api.WalidaApiError:
            pass

        form_error = ''
        nama_pembeli = request.form.get('namaPembeli', '')
        kontak_pembeli = request.form.get('kontakPembeli', '')
        alamat_pembeli = request.form.get('alamatPembeli', '')
        catatan = request.form.get('catatanPemesanan', '')

        if request.method == 'POST':
            if not (
                nama_pembeli.strip()
                and kontak_pembeli.strip()
                and alamat_pembeli.strip()
            ):
                form_error = 'Nama, kontak, dan alamat pembeli wajib diisi.'
            else:
                body = {
                    'idPolygon': draft['idPolygon'],
                    'jumlahPesananKg': draft['jumlahPesananKg'],
                    'prosesPengolahan': draft['prosesPengolahan'],
                    'namaPembeli': nama_pembeli.strip(),
                    'kontakPembeli': kontak_pembeli.strip(),
                    'alamatPembeli': alamat_pembeli.strip(),
                    'tipePemesanan': 'E-commerce',
                    'tipeProduk': 'Green Beans',
                    'biayaPengiriman': 0,
                    'biayaPajak': 0,
                    'tipePajak': 'penjumlahan',
                }
                if draft.get('varietas'):
                    body['varietas'] = draft['varietas']
                jenis = draft.get('jenisKopi') or (item or {}).get('jenisKopi')
                if jenis:
                    body['jenisKopi'] = jenis
                if catatan.strip():
                    body['catatanPemesanan'] = catatan.strip()
                try:
                    res = walida_api.create_booking(body)
                    session.pop('booking_draft', None)
                    session['last_invoice'] = res
                    payload = H.normalize_invoice_payload(res) or {}
                    inv = payload.get('invoice') or {}
                    id_pembelian = inv.get('idPembelian') or res.get('idPembelian') or 'baru'
                    return redirect(url_for('invoice', id_pembelian=id_pembelian))
                except walida_api.WalidaApiError as exc:
                    form_error = str(exc)

        return render_template(
            'checkout.html',
            draft=draft,
            item=item,
            petani=H.petani_nama(item) if item else '',
            form_error=form_error,
            nama_pembeli=nama_pembeli,
            kontak_pembeli=kontak_pembeli,
            alamat_pembeli=alamat_pembeli,
            catatan=catatan,
            pembayaran=KETERANGAN_PEMBAYARAN,
            format_kg=H.format_kg,
            display_name=H.display_name,
        )

    @app.get('/invoice/<id_pembelian>')
    def invoice(id_pembelian):
        error = ''
        raw = H.normalize_invoice_payload(session.get('last_invoice'))
        inv_obj = (raw or {}).get('invoice') if raw else None
        if not inv_obj or (
            inv_obj.get('idPembelian')
            and inv_obj.get('idPembelian') != id_pembelian
            and id_pembelian != 'baru'
        ):
            try:
                fetched = walida_api.fetch_booking_invoice(id_pembelian)
                raw = H.normalize_invoice_payload(fetched)
                inv_obj = (raw or {}).get('invoice')
            except walida_api.WalidaApiError as exc:
                if not inv_obj:
                    error = str(exc)

        normalized = H.normalize_booking_invoice(inv_obj) if inv_obj else None
        return render_template(
            'invoice.html',
            error=error,
            inv=normalized,
            id_pembelian=id_pembelian,
            letterhead=INVOICE_LETTERHEAD,
            pembayaran_default=KETERANGAN_PEMBAYARAN,
            format_invoice_date=H.format_invoice_date,
            format_number=H.format_number,
            payment_badge_style=H.payment_badge_style,
            order_badge_style=H.order_badge_style,
            now_iso=datetime.now().isoformat(),
        )

    # ——— Proxy API untuk JS (peta) ———

    @app.get('/api/polygons')
    def api_polygons():
        try:
            data = walida_api.fetch_polygons()
            return jsonify(data)
        except walida_api.WalidaApiError as exc:
            return jsonify({'error': str(exc)}), exc.status or 502

    @app.get('/api/polygons/<id_polygon>')
    def api_polygon(id_polygon):
        try:
            data = walida_api.fetch_polygon(id_polygon)
            return jsonify(data)
        except walida_api.WalidaApiError as exc:
            return jsonify({'error': str(exc)}), exc.status or 502

    return app


app = create_app()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(__import__('os').environ.get('PORT', 8000)), debug=True)
