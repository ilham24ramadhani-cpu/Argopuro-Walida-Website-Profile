/* Shared helpers for public map / petani UI */
(function (global) {
  const COLOR_AVAILABLE = '#00665D';
  const COLOR_SOLD_OUT = '#C62828';
  const COLOR_SELECTED = '#004d47';

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

  function petaniFotoUrl(item) {
    if (!item) return '';
    if (item.fotoPetaniFullUrl) return item.fotoPetaniFullUrl;
    const path = item.fotoPetaniUrl;
    if (!path) return '';
    if (String(path).startsWith('http')) return path;
    const base = (global.APP && global.APP.walidaApi) || '';
    return base ? `${base.replace(/\/$/, '')}${path}` : path;
  }

  function petaniInisial(item) {
    const nama = petaniNama(item);
    if (!nama) return '?';
    const parts = nama.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return nama.slice(0, 2).toUpperCase();
  }

  function isSoldOut(item) {
    if (!item) return false;
    if (item.statusBooking === 'habis') return true;
    if (item.potentialGbTersedia != null) {
      return Number(item.potentialGbTersedia) <= 0;
    }
    return false;
  }

  function availableStock(item) {
    if (!item) return null;
    if (item.potentialGbTersedia != null && item.potentialGbTersedia !== '') {
      return Number(item.potentialGbTersedia);
    }
    if (item.potentialGb != null) return Number(item.potentialGb);
    return null;
  }

  function processNames(item) {
    const list = Array.isArray(item && item.prosesPengolahan) ? item.prosesPengolahan : [];
    return list
      .map((p) => (typeof p === 'string' ? p : p && p.prosesPengolahan))
      .filter(Boolean);
  }

  function polygonColor(item, selected) {
    if (isSoldOut(item)) return item.warnaPolygon || COLOR_SOLD_OUT;
    if (selected) return COLOR_SELECTED;
    return item.warnaPolygon || COLOR_AVAILABLE;
  }

  function outerRing(coordinates) {
    if (!Array.isArray(coordinates) || !coordinates.length) return null;
    const first = coordinates[0];
    if (Array.isArray(first) && typeof first[0] === 'number') return coordinates;
    if (Array.isArray(first) && Array.isArray(first[0])) return first;
    return null;
  }

  function toLatLngs(coordinates) {
    const coords = outerRing(coordinates);
    if (!coords || coords.length < 3) return null;
    const ring = [];
    for (const pt of coords) {
      if (!Array.isArray(pt) || pt.length < 2) return null;
      const [lng, lat] = pt;
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;
      ring.push([lat, lng]);
    }
    return ring;
  }

  function farmPolygons(item) {
    const geometry = Array.isArray(item && item.geometry) ? item.geometry : [];
    const out = [];
    geometry.forEach((g, index) => {
      if (!g || g.type !== 'Polygon') return;
      const latlngs = toLatLngs(g.coordinates);
      if (!latlngs) return;
      out.push({ key: `${farmId(item) || 'p'}-${index}`, latlngs });
    });
    return out;
  }

  function landAreaHa(item) {
    if (item && item.luasHektar != null && item.luasHektar !== '') {
      const n = Number(item.luasHektar);
      if (!Number.isNaN(n)) return n;
    }
    return null;
  }

  function formatNumber(value, fractionDigits = 2) {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    return n.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits,
    });
  }

  function formatKg(value) {
    if (value === null || value === undefined || value === '') return '—';
    return `${formatNumber(value)} kg`;
  }

  function formatMeter(value) {
    if (value === null || value === undefined || value === '') return '—';
    return `${formatNumber(value, 0)} m`;
  }

  function formatHa(value) {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    const digits = Math.abs(n) < 1 ? 4 : 2;
    return `${formatNumber(n, digits)} Ha`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  global.WalidaUtils = {
    COLOR_AVAILABLE,
    COLOR_SOLD_OUT,
    COLOR_SELECTED,
    farmId,
    displayName,
    petaniNama,
    petaniFotoUrl,
    petaniInisial,
    isSoldOut,
    availableStock,
    processNames,
    polygonColor,
    farmPolygons,
    landAreaHa,
    formatNumber,
    formatKg,
    formatMeter,
    formatHa,
    escapeHtml,
  };
})(window);
