const API_BASE = (import.meta.env.VITE_WALIDA_API || '').replace(/\/$/, '');

const MISSING_API_MSG =
  'VITE_WALIDA_API belum diatur. Set variabel ini ke origin sistem admin Walida (contoh https://admin-anda.up.railway.app), lalu rebuild/redeploy. Di Railway: Variables → VITE_WALIDA_API → Redeploy.';

export function getApiBase() {
  return API_BASE;
}

async function parseJson(res) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || `Respons bukan JSON (${res.status})` };
  }
  return data;
}

/**
 * Baca daftar polygon dari sistem admin.
 * Hanya GET — tidak ada CRUD polygon dari website publik.
 */
export async function fetchPolygons() {
  if (!API_BASE) {
    throw new Error(MISSING_API_MSG);
  }
  const res = await fetch(`${API_BASE}/api/polygon`);
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (data && (data.error || data.message)) ||
        `Gagal memuat polygon (${res.status}).`,
    );
  }
  if (!Array.isArray(data)) {
    throw new Error('Respons API polygon tidak berbentuk daftar.');
  }
  return data;
}

export async function fetchPolygon(id) {
  if (!API_BASE) {
    throw new Error(MISSING_API_MSG);
  }
  const res = await fetch(`${API_BASE}/api/polygon/${encodeURIComponent(id)}`);
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (data && (data.error || data.message)) ||
        `Gagal memuat petak (${res.status}).`,
    );
  }
  return data;
}

/**
 * Buat booking e-commerce lahan.
 * Satu-satunya endpoint tulis yang diizinkan dari website publik.
 */
export async function createBooking(body) {
  if (!API_BASE) {
    throw new Error(MISSING_API_MSG);
  }
  const res = await fetch(`${API_BASE}/api/booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `Booking gagal (${res.status}). Endpoint /api/booking mungkin belum siap di sistem admin.`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Lihat ulang invoice (opsional). */
export async function fetchBookingInvoice(idPembelian) {
  if (!API_BASE) {
    throw new Error(MISSING_API_MSG);
  }
  const res = await fetch(
    `${API_BASE}/api/booking/${encodeURIComponent(idPembelian)}`,
  );
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      (data && (data.error || data.message)) ||
        `Invoice tidak ditemukan (${res.status}).`,
    );
  }
  return data;
}
