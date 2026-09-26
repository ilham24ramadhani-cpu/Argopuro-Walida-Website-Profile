"""JWT helpers (PyJWT) — untuk token sesi opsional, bukan login admin."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
from flask import current_app


def create_token(payload: dict, hours: int | None = None) -> str:
    hours = hours if hours is not None else current_app.config['JWT_EXPIRE_HOURS']
    data = dict(payload)
    data['exp'] = datetime.now(timezone.utc) + timedelta(hours=hours)
    data['iat'] = datetime.now(timezone.utc)
    return jwt.encode(
        data,
        current_app.config['JWT_SECRET'],
        algorithm=current_app.config['JWT_ALGORITHM'],
    )


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(
            token,
            current_app.config['JWT_SECRET'],
            algorithms=[current_app.config['JWT_ALGORITHM']],
        )
    except jwt.PyJWTError:
        return None
