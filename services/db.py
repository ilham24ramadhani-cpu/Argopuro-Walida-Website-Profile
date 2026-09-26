"""Koneksi MongoDB opsional via pymongo.

Situs publik Argopuro Walida membaca polygon & menulis booking lewat API admin
(WALIDA_API). Jangan hardcode URI MongoDB. Modul ini hanya tersedia jika
MONGO_URI di-set di environment (integrasi lanjutan).
"""

from __future__ import annotations

from flask import current_app

_client = None


def get_db():
    """Return database handle atau None jika MONGO_URI kosong."""
    global _client
    uri = (current_app.config.get('MONGO_URI') or '').strip()
    if not uri:
        return None
    from pymongo import MongoClient

    if _client is None:
        _client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    return _client[current_app.config.get('MONGO_DB') or 'walida']


def ping() -> bool:
    db = get_db()
    if db is None:
        return False
    db.client.admin.command('ping')
    return True
