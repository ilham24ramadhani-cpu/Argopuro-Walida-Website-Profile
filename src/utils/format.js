export function formatNumber(value, fractionDigits = 2) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatKg(value) {
  if (value === null || value === undefined || value === '') return '—';
  return `${formatNumber(value)} kg`;
}

export function formatMeter(value) {
  if (value === null || value === undefined || value === '') return '—';
  return `${formatNumber(value, 0)} m`;
}

export function formatHa(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  const digits = Math.abs(n) < 1 ? 4 : 2;
  return `${formatNumber(n, digits)} Ha`;
}

export function displayName(item) {
  if (!item) return 'Polygon';
  const nama = (item.namaKml || '').trim();
  return nama || item.idPolygon || `Polygon ${item.id ?? ''}`;
}

export function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
