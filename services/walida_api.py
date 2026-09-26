"""Klien HTTP ke sistem admin Walida. Website publik tidak menyimpan URI MongoDB."""

from __future__ import annotations

import requests
from flask import current_app


class WalidaApiError(Exception):
    def __init__(self, message: str, status: int | None = None, data=None):
        super().__init__(message)
        self.status = status
        self.data = data


def _base() -> str:
    base = (current_app.config.get('WALIDA_API') or '').rstrip('/')
    if not base:
        raise WalidaApiError(
            'WALIDA_API belum diatur. Set ke origin sistem admin Walida '
            '(contoh http://127.0.0.1:8080), lalu restart aplikasi.'
        )
    return base


def _parse(res: requests.Response):
    try:
        return res.json() if res.content else None
    except ValueError:
        text = (res.text or '').strip()
        return {'error': text or f'Respons bukan JSON ({res.status_code})'}


def fetch_polygons():
    res = requests.get(f'{_base()}/api/polygon', timeout=30)
    data = _parse(res)
    if not res.ok:
        raise WalidaApiError(
            (data or {}).get('error')
            or (data or {}).get('message')
            or f'Gagal memuat polygon ({res.status_code}).',
            status=res.status_code,
            data=data,
        )
    if not isinstance(data, list):
        raise WalidaApiError('Respons API polygon tidak berbentuk daftar.')
    return data


def fetch_polygon(id_polygon: str):
    res = requests.get(
        f'{_base()}/api/polygon/{requests.utils.quote(str(id_polygon), safe="")}',
        timeout=30,
    )
    data = _parse(res)
    if not res.ok:
        raise WalidaApiError(
            (data or {}).get('error')
            or (data or {}).get('message')
            or f'Gagal memuat petak ({res.status_code}).',
            status=res.status_code,
            data=data,
        )
    return data


def create_booking(body: dict):
    res = requests.post(
        f'{_base()}/api/booking',
        json=body,
        headers={'Content-Type': 'application/json'},
        timeout=45,
    )
    data = _parse(res)
    if not res.ok:
        msg = (
            (data or {}).get('error')
            or (data or {}).get('message')
            or f'Booking gagal ({res.status_code}). Endpoint /api/booking mungkin belum siap di sistem admin.'
        )
        raise WalidaApiError(msg, status=res.status_code, data=data)
    return data


def fetch_booking_invoice(id_pembelian: str):
    res = requests.get(
        f'{_base()}/api/booking/{requests.utils.quote(str(id_pembelian), safe="")}',
        timeout=30,
    )
    data = _parse(res)
    if not res.ok:
        raise WalidaApiError(
            (data or {}).get('error')
            or (data or {}).get('message')
            or f'Invoice tidak ditemukan ({res.status_code}).',
            status=res.status_code,
            data=data,
        )
    return data
