"""Helper untuk template server."""

from __future__ import annotations

import re
from urllib.parse import quote


def wa_link(number: str | None, text: str = '') -> str:
    """Link click-to-chat wa.me. Nomor lokal 08xx diubah ke 628xx."""
    digits = re.sub(r'\D', '', number or '')
    if not digits:
        return ''
    if digits.startswith('0'):
        digits = '62' + digits[1:]
    url = f'https://wa.me/{digits}'
    text = ' '.join((text or '').split())
    return f'{url}?text={quote(text)}' if text else url
