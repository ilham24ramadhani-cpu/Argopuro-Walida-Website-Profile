/* Helper bersama untuk data polygon / petani (format mengikuti bahasa aktif via AWI18n) */
(function (global) {
  const COLOR_DEFAULT = '#00665D';
  const I = () => global.AWI18n;

  function farmId(item) {
    return item && (item.idPolygon || item.id);
  }

  function displayName(item) {
    if (!item) return 'Polygon';
    const nama = (item.namaKml || '').trim();
    return nama || item.idPolygon || `Polygon ${item.id ?? ''}`;
  }

  function petaniNama(item) {
    return ((item && (item.petani || item.pemasok)) || '').trim();
  }

  // namaKml berasal dari file KML dan tidak ikut berubah saat nama petani diedit di admin.
  // Dipakai hanya jika memuat nama petani (mis. "DAMARKANDANG ORANGE" untuk petani DAMARKANDANG).
  function farmTitle(item) {
    const petani = petaniNama(item);
    const kml = ((item && item.namaKml) || '').trim();
    if (!petani) return displayName(item);
    if (kml && kml.toLowerCase().includes(petani.toLowerCase())) return kml;
    return petani;
  }

  // Halaman publik HTTPS: paksa https agar tidak diblokir mixed-content
  function secureUrl(url) {
    const s = url ? String(url) : '';
    if (s.startsWith('http://') && global.location && global.location.protocol === 'https:') {
      return `https://${s.slice('http://'.length)}`;
    }
    return s;
  }

  function petaniFotoUrl(item) {
    if (!item) return '';
    if (item.fotoPetaniFullUrl) return secureUrl(item.fotoPetaniFullUrl);
    const path = item.fotoPetaniUrl;
    if (!path) return '';
    if (String(path).startsWith('http')) return secureUrl(path);
    return secureUrl(`${global.AW_API_BASE || ''}${path}`);
  }

  function initials(nama) {
    const parts = String(nama || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }

  function petaniInisial(item) {
    return initials(petaniNama(item));
  }

  function isSoldOut(item) {
    if (!item) return false;
    if (item.statusBooking === 'habis') return true;
    if (item.potentialGbTersedia != null && item.potentialGbTersedia !== '') {
      return Number(item.potentialGbTersedia) <= 0;
    }
    return false;
  }

  function availableStock(item) {
    if (!item) return null;
    if (item.potentialGbTersedia != null && item.potentialGbTersedia !== '') {
      return Number(item.potentialGbTersedia);
    }
    if (item.potentialGb != null && item.potentialGb !== '') return Number(item.potentialGb);
    return null;
  }

  function canBook(item) {
    if (!item || isSoldOut(item)) return false;
    const stock = availableStock(item);
    return stock != null && stock > 0 && Number(item.hargaPerKg) > 0;
  }

  function processNames(item) {
    const list = Array.isArray(item && item.prosesPengolahan) ? item.prosesPengolahan : [];
    return list
      .map((p) => (typeof p === 'string' ? p : p && p.prosesPengolahan))
      .filter(Boolean)
      .map((p) => String(p).trim());
  }

  function polygonColor(item) {
    return (item && item.warnaPolygon) || COLOR_DEFAULT;
  }

  function landAreaHa(item) {
    if (item && item.luasHektar != null && item.luasHektar !== '') {
      const n = Number(item.luasHektar);
      if (!Number.isNaN(n)) return n;
    }
    return null;
  }

  /* Titik tengah petak: rata-rata titik ring polygon pertama → { lat, lng } */
  function centerOf(item) {
    const geometry = Array.isArray(item && item.geometry) ? item.geometry : [];
    const g = geometry.find((x) => x && x.type === 'Polygon') || geometry.find((x) => x && x.type === 'Point');
    if (!g) return null;
    let pts = g.coordinates;
    if (g.type === 'Point') pts = [pts];
    else if (Array.isArray(pts && pts[0] && pts[0][0])) pts = pts[0];
    pts = (pts || []).filter((p) => Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number');
    if (pts.length > 1) {
      const a = pts[0];
      const b = pts[pts.length - 1];
      if (a[0] === b[0] && a[1] === b[1]) pts = pts.slice(0, -1);
    }
    if (!pts.length) return null;
    const sum = pts.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
    return { lng: sum[0] / pts.length, lat: sum[1] / pts.length };
  }

  function formatNumber(value, fractionDigits = 2) {
    return I().formatNumber(value, { maximumFractionDigits: fractionDigits });
  }

  function formatKg(value) {
    const s = formatNumber(value);
    return s === '—' ? s : `${s} kg`;
  }

  function formatMdpl(value) {
    const s = formatNumber(value, 0);
    return s === '—' ? s : `${s} MDPL`;
  }

  function formatHa(value) {
    const s = I().formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return s === '—' ? s : `${s} ha`;
  }

  function formatRp(value) {
    return I().formatCurrency(value);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* Avatar bulat: foto dengan fallback inisial jika URL kosong / gagal dimuat */
  function avatarHtml(url, nama, cls) {
    const ini = escapeHtml(initials(nama));
    const img = url
      ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(nama || '')}" loading="lazy" onerror="this.remove()" />`
      : '';
    return `<span class="${cls}"><span class="avatar-fallback" aria-hidden="true">${ini}</span>${img}</span>`;
  }

  function badgeHtml(kind, value) {
    const cls = String(value || 'none').toLowerCase().replace(/\s+/g, '-');
    return `<span class="aw-badge aw-badge--${kind}-${escapeHtml(cls)}">${escapeHtml(I().statusLabel(kind, value))}</span>`;
  }

  function mapsUrl(center) {
    return center ? `https://www.google.com/maps?q=${center.lat.toFixed(6)},${center.lng.toFixed(6)}` : '';
  }

  global.WalidaUtils = {
    COLOR_DEFAULT,
    farmId,
    displayName,
    farmTitle,
    petaniNama,
    petaniFotoUrl,
    petaniInisial,
    initials,
    secureUrl,
    isSoldOut,
    availableStock,
    canBook,
    processNames,
    polygonColor,
    landAreaHa,
    centerOf,
    formatNumber,
    formatKg,
    formatMdpl,
    formatHa,
    formatRp,
    escapeHtml,
    avatarHtml,
    badgeHtml,
    mapsUrl,
  };
})(window);
