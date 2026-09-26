import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')


def _walida_api_origin() -> str:
    """Origin admin API. Terima WALIDA_API atau VITE_WALIDA_API (legacy Railway)."""
    return (
        os.environ.get('WALIDA_API')
        or os.environ.get('VITE_WALIDA_API')
        or ''
    ).rstrip('/')


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-argopuro-walida-change-me'
    # Origin sistem admin Walida (tanpa slash di akhir). Data polygon & booking lewat API ini.
    WALIDA_API = _walida_api_origin()
    # Opsional: MongoDB di situs publik TIDAK dipakai untuk CRUD polygon/booking.
    # Terima juga nama variabel lama dari Railway (MONGODB_URI / DB_NAME).
    MONGO_URI = os.environ.get('MONGO_URI') or os.environ.get('MONGODB_URI') or ''
    MONGO_DB = (
        os.environ.get('MONGO_DB')
        or os.environ.get('DB_NAME')
        or 'walida'
    )
    JWT_SECRET = os.environ.get('JWT_SECRET') or SECRET_KEY
    JWT_ALGORITHM = 'HS256'
    JWT_EXPIRE_HOURS = int(os.environ.get('JWT_EXPIRE_HOURS') or '24')
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    TEMPLATES_AUTO_RELOAD = True
