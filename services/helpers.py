"""Helper format & field petani / polygon."""

from __future__ import annotations


def farm_id(item: dict | None):
    if not item:
        return None
    return item.get('idPolygon') or item.get('id')


def display_name(item: dict | None) -> str:
    if not item:
        return 'Polygon'
    nama = (item.get('namaKml') or '').strip()
    return nama or item.get('idPolygon') or f"Polygon {item.get('id') or ''}"


def petani_nama(item: dict | None) -> str:
    if not item:
        return ''
    return (item.get('petani') or item.get('pemasok') or '').strip()


def petani_foto_url(item: dict | None, api_base: str = '') -> str:
    if not item:
        return ''
    full = item.get('fotoPetaniFullUrl')
    if full:
        return full
    path = item.get('fotoPetaniUrl') or ''
    if not path:
        return ''
    if isinstance(path, str) and path.startswith('http'):
        return path
    base = (api_base or '').rstrip('/')
    return f'{base}{path}' if base else path


def petani_inisial(item: dict | None) -> str:
    nama = petani_nama(item)
    if not nama:
        return '?'
    parts = [p for p in nama.split() if p]
    if len(parts) >= 2:
        return f'{parts[0][0]}{parts[1][0]}'.upper()
    return nama[:2].upper()


def land_area_ha(item: dict | None):
    if not item or item.get('luasHektar') in (None, ''):
        return None
    try:
        return float(item['luasHektar'])
    except (TypeError, ValueError):
        return None


def is_sold_out(item: dict | None) -> bool:
    if not item:
        return False
    if item.get('statusBooking') == 'habis':
        return True
    if item.get('potentialGbTersedia') is not None:
        try:
            return float(item['potentialGbTersedia']) <= 0
        except (TypeError, ValueError):
            return False
    return False


def process_names(item: dict | None) -> list[str]:
    raw = item.get('prosesPengolahan') if item else None
    if not isinstance(raw, list):
        return []
    out = []
    for p in raw:
        if isinstance(p, str) and p.strip():
            out.append(p.strip())
        elif isinstance(p, dict) and p.get('prosesPengolahan'):
            out.append(str(p['prosesPengolahan']).strip())
    return out


def available_stock(item: dict | None):
    if not item:
        return None
    if item.get('potentialGbTersedia') not in (None, ''):
        try:
            return float(item['potentialGbTersedia'])
        except (TypeError, ValueError):
            return None
    if item.get('potentialGb') is not None:
        try:
            return float(item['potentialGb'])
        except (TypeError, ValueError):
            return None
    return None


def can_book(item: dict | None) -> bool:
    if not item or is_sold_out(item):
        return False
    stock = available_stock(item)
    if stock is None or stock <= 0:
        return False
    try:
        harga = float(item.get('hargaPerKg'))
    except (TypeError, ValueError):
        return False
    return harga > 0


def format_number(value, fraction_digits=2) -> str:
    if value is None or value == '':
        return '—'
    try:
        n = float(value)
    except (TypeError, ValueError):
        return '—'
    if fraction_digits == 0:
        return f'{n:,.0f}'.replace(',', '.')
    formatted = f'{n:,.{fraction_digits}f}'
    # id-ID style: . thousands, , decimal
    parts = formatted.split('.')
    if len(parts) == 2 and fraction_digits > 0:
        int_part = parts[0].replace(',', '.')
        # last segment after comma-grouping confusion — use locale-ish manual
        return f'{n:,.{fraction_digits}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return formatted.replace(',', '.')


def format_kg(value) -> str:
    if value is None or value == '':
        return '—'
    return f'{format_number(value)} kg'


def format_meter(value) -> str:
    if value is None or value == '':
        return '—'
    return f'{format_number(value, 0)} m'


def format_ha(value) -> str:
    if value is None or value == '':
        return '—'
    try:
        n = float(value)
    except (TypeError, ValueError):
        return '—'
    digits = 4 if abs(n) < 1 else 2
    return f'{format_number(n, digits)} Ha'


def format_rp(value) -> str:
    if value is None or value == '':
        return '—'
    try:
        n = float(value)
    except (TypeError, ValueError):
        return '—'
    return f"Rp {n:,.0f}".replace(',', '.')


def normalize_invoice_payload(payload):
    if not payload:
        return None
    if isinstance(payload, dict) and payload.get('invoice'):
        return payload
    if isinstance(payload, dict) and (
        payload.get('idPembelian') or payload.get('pembeli') or payload.get('pesanan')
    ):
        return {'invoice': payload}
    return payload


def normalize_booking_invoice(invoice: dict | None):
    if not invoice:
        return None
    pembeli = invoice.get('pembeli') or {}
    pesanan = invoice.get('pesanan') or {}
    try:
        berat = float(pesanan.get('jumlahPesananKg') or 0)
    except (TypeError, ValueError):
        berat = 0.0
    try:
        harga = float(pesanan.get('hargaPerKg') or 0)
    except (TypeError, ValueError):
        harga = 0.0
    subtotal = round(berat * harga, 2)
    total = pesanan.get('totalHarga')
    try:
        total_harga = float(total) if total not in (None, '') else subtotal
    except (TypeError, ValueError):
        total_harga = subtotal
    petak_parts = [
        x
        for x in (pesanan.get('namaPolygon'), pesanan.get('idPolygon'))
        if x and str(x).strip()
    ]
    return {
        'idPembelian': invoice.get('idPembelian') or '—',
        'tanggalPemesanan': invoice.get('tanggalPemesanan') or '',
        'statusPembayaran': invoice.get('statusPembayaran') or 'Belum Lunas',
        'statusPemesanan': invoice.get('statusPemesanan') or 'Ordering',
        'keteranganPembayaran': invoice.get('keteranganPembayaran') or '',
        'pembeli': {
            'namaPembeli': pembeli.get('namaPembeli') or '—',
            'kontakPembeli': pembeli.get('kontakPembeli') or '—',
            'alamatPembeli': pembeli.get('alamatPembeli') or '—',
        },
        'pesanan': {
            'idPolygon': pesanan.get('idPolygon') or '',
            'namaPolygon': pesanan.get('namaPolygon') or '',
            'petakLabel': ' · '.join(petak_parts) or pesanan.get('idPolygon') or '—',
            'prosesPengolahan': pesanan.get('prosesPengolahan') or '—',
            'jumlahPesananKg': berat,
            'hargaPerKg': harga,
            'subtotal': subtotal,
            'totalHarga': total_harga,
            'tipeProduk': pesanan.get('tipeProduk') or 'Green Beans',
            'varietas': pesanan.get('varietas') or '—',
            'biayaPajak': float(pesanan.get('biayaPajak') or 0),
            'biayaPengiriman': float(pesanan.get('biayaPengiriman') or 0),
            'tipePajak': pesanan.get('tipePajak') or 'penjumlahan',
        },
    }


def payment_badge_style(status: str) -> dict:
    s = (status or 'Belum Lunas').strip()
    if s == 'Lunas':
        return {'bg': '#198754', 'color': '#fff'}
    if s == 'Belum Lunas':
        return {'bg': '#FFC107', 'color': '#212529'}
    if s == 'Pembayaran Bertahap':
        return {'bg': '#0DCAF0', 'color': '#212529'}
    return {'bg': '#6C757D', 'color': '#fff'}


def order_badge_style(status: str) -> dict:
    s = (status or 'Ordering').strip()
    if s == 'Ordering':
        return {'bg': '#FFC107', 'color': '#212529'}
    if s == 'Complete':
        return {'bg': '#198754', 'color': '#fff'}
    return {'bg': '#6C757D', 'color': '#fff'}


def format_invoice_date(date_string) -> str:
    if not date_string:
        return '—'
    from datetime import datetime

    try:
        if hasattr(date_string, 'strftime'):
            return date_string.strftime('%d %B %Y')
        text = str(date_string)
        try:
            d = datetime.fromisoformat(text.replace('Z', '+00:00'))
            return d.strftime('%d %B %Y')
        except ValueError:
            pass
        import re

        m = re.match(r'^(\d{4})-(\d{2})-(\d{2})', text)
        if m:
            d = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            return d.strftime('%d %B %Y')
        return text
    except Exception:
        return str(date_string)
