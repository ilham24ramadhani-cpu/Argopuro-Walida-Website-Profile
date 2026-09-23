function outerRing(coordinates) {
  if (!Array.isArray(coordinates) || !coordinates.length) return null;
  const first = coordinates[0];
  if (Array.isArray(first) && typeof first[0] === 'number') return coordinates;
  if (Array.isArray(first) && Array.isArray(first[0])) return first;
  return null;
}

/** KML / API: [lng, lat] → Leaflet: [lat, lng] */
export function toLatLngs(coordinates) {
  const coords = outerRing(coordinates);
  if (!coords || coords.length < 3) return null;
  const ring = coords.map((pt) => {
    if (!Array.isArray(pt) || pt.length < 2) return null;
    const [lng, lat] = pt;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return [lat, lng];
  });
  if (ring.some((p) => !p)) return null;
  return ring;
}

export function farmPolygons(item) {
  const geometry = Array.isArray(item?.geometry) ? item.geometry : [];
  return geometry
    .filter((g) => g && g.type === 'Polygon')
    .map((g, index) => {
      const latlngs = toLatLngs(g.coordinates);
      if (!latlngs) return null;
      return {
        key: `${item.idPolygon || item.id || 'p'}-${index}`,
        name: g.name || '',
        latlngs,
      };
    })
    .filter(Boolean);
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/** Luas cincin polygon WGS84, hasil meter persegi. */
function ringAreaM2(coordinates) {
  const coords = outerRing(coordinates);
  if (!coords || coords.length < 3) return 0;
  const closed =
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1];
  const pts = closed ? coords.slice(0, -1) : coords;
  if (pts.length < 3) return 0;

  const R = 6378137;
  let sum = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [lng1, lat1] = pts[i];
    const [lng2, lat2] = pts[(i + 1) % pts.length];
    sum += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((sum * R * R) / 2);
}

function storedAreaM2(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/** Luas lahan: field area KML (m²) jika ada, jika tidak dihitung dari geometry. Hasil hektar (÷ 10.000). */
export function landAreaHa(item) {
  const fromDoc = storedAreaM2(item?.area ?? item?.luas ?? item?.areaM2 ?? item?.luasM2);
  let m2 = fromDoc;
  if (m2 === null) {
    const geometry = Array.isArray(item?.geometry) ? item.geometry : [];
    m2 = geometry.reduce((total, g) => {
      const gArea = storedAreaM2(g?.area ?? g?.luas);
      if (gArea !== null) return total + gArea;
      if (g?.type === 'Polygon') return total + ringAreaM2(g.coordinates);
      return total;
    }, 0);
  }
  if (!m2) return null;
  return m2 / 10000;
}

export function allBounds(items) {
  const pts = [];
  (items || []).forEach((item) => {
    farmPolygons(item).forEach((poly) => {
      poly.latlngs.forEach((ll) => pts.push(ll));
    });
  });
  return pts.length ? pts : null;
}
