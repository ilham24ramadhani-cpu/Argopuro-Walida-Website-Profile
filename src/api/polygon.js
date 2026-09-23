const API = '/api/polygon';

export async function fetchPolygons() {
  let res;
  try {
    res = await fetch(API);
  } catch {
    throw new Error(
      'Tidak bisa memuat data polygon. Jalankan server Flask (python app.py) agar website bisa membaca MongoDB.'
    );
  }
  if (!res.ok) {
    throw new Error(`API polygon gagal (${res.status}). Periksa MONGODB_URI di .env.`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(data?.error || 'Respons API polygon tidak berbentuk daftar.');
  }
  return data;
}

export async function fetchPolygonById(id) {
  let res;
  try {
    res = await fetch(`${API}/${encodeURIComponent(id)}`);
  } catch {
    throw new Error('Tidak bisa memuat detail polygon.');
  }
  if (!res.ok) {
    throw new Error(`Polygon tidak ditemukan (${res.status}).`);
  }
  return res.json();
}
