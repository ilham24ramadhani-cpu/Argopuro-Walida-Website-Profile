export const COLOR_AVAILABLE = '#00665D';
export const COLOR_SOLD_OUT = '#C62828';
export const COLOR_SELECTED = '#004d47';

export function farmId(item) {
  return item?.idPolygon || item?.id;
}

export function displayName(item) {
  if (!item) return 'Polygon';
  const nama = (item.namaKml || '').trim();
  return nama || item.idPolygon || `Polygon ${item.id ?? ''}`;
}

/** Nama petani (fallback pemasok lama dari API). */
export function petaniNama(item) {
  return (item?.petani || item?.pemasok || '').trim();
}

/** URL absolut foto profil petani, atau '' jika tidak ada. */
export function petaniFotoUrl(item) {
  if (item?.fotoPetaniFullUrl) return item.fotoPetaniFullUrl;
  const path = item?.fotoPetaniUrl;
  if (!path) return '';
  if (typeof path === 'string' && path.startsWith('http')) return path;
  const base = (import.meta.env.VITE_WALIDA_API || '').replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}

/** Inisial untuk placeholder avatar. */
export function petaniInisial(item) {
  const nama = petaniNama(item);
  if (!nama) return '?';
  const parts = nama.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return nama.slice(0, 2).toUpperCase();
}

export function landAreaHa(item) {
  if (item?.luasHektar != null && item.luasHektar !== '') {
    const n = Number(item.luasHektar);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

export function isSoldOut(item) {
  if (!item) return false;
  if (item.statusBooking === 'habis') return true;
  if (item.potentialGbTersedia != null) {
    return Number(item.potentialGbTersedia) <= 0;
  }
  return false;
}

export function polygonColor(item, selected = false) {
  if (isSoldOut(item)) {
    return item.warnaPolygon || COLOR_SOLD_OUT;
  }
  if (selected) return COLOR_SELECTED;
  return item.warnaPolygon || COLOR_AVAILABLE;
}

export function processNames(item) {
  const list = Array.isArray(item?.prosesPengolahan) ? item.prosesPengolahan : [];
  return list
    .map((p) => (typeof p === 'string' ? p : p?.prosesPengolahan))
    .filter(Boolean);
}

function outerRing(coordinates) {
  if (!Array.isArray(coordinates) || !coordinates.length) return null;
  const first = coordinates[0];
  if (Array.isArray(first) && typeof first[0] === 'number') return coordinates;
  if (Array.isArray(first) && Array.isArray(first[0])) return first;
  return null;
}

/** geometry coordinates [lng, lat] → Leaflet [lat, lng] */
export function toLatLngs(coordinates) {
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

export function farmPolygons(item) {
  const geometry = Array.isArray(item?.geometry) ? item.geometry : [];
  const out = [];
  geometry.forEach((g, index) => {
    if (!g || g.type !== 'Polygon') return;
    const latlngs = toLatLngs(g.coordinates);
    if (!latlngs) return;
    out.push({ key: `${farmId(item) || 'p'}-${index}`, latlngs });
  });
  return out;
}

export function availableStock(item) {
  if (item?.potentialGbTersedia != null && item.potentialGbTersedia !== '') {
    return Number(item.potentialGbTersedia);
  }
  if (item?.potentialGb != null) return Number(item.potentialGb);
  return null;
}
