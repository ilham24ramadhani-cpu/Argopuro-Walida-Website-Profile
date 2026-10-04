/* Klien API admin Walida. Base URL dari env WALIDA_API (meta aw-api-base di base.html). */
(function (global) {
  const meta = document.querySelector('meta[name="aw-api-base"]');
  global.AW_API_BASE = ((meta && meta.content) || '').replace(/\/+$/, '');

  const TOKEN_KEY = 'awCustomerToken';
  const CUSTOMER_KEY = 'awCustomer';

  function token() {
    try {
      return global.localStorage.getItem(TOKEN_KEY) || '';
    } catch (_) {
      return '';
    }
  }

  function clearSession() {
    try {
      global.localStorage.removeItem(TOKEN_KEY);
      global.localStorage.removeItem(CUSTOMER_KEY);
    } catch (_) {
      /* storage tidak tersedia */
    }
  }

  function loginUrl() {
    const next = global.location.pathname + global.location.search + global.location.hash;
    return `/login?next=${encodeURIComponent(next)}`;
  }

  function apiError(message, status, data) {
    const err = new Error(message);
    err.status = status || 0;
    err.data = data;
    return err;
  }

  /**
   * opts.auth: endpoint 🔒 — header Authorization wajib; 401 → hapus sesi + ke /login.
   * opts.handle401 === false: pemanggil menangani 401 sendiri (mis. booking menyimpan isian form dulu).
   */
  async function request(path, opts) {
    const o = opts || {};
    if (!global.AW_API_BASE) {
      throw apiError('WALIDA_API belum diatur. Set origin sistem admin lalu restart aplikasi.', 0);
    }
    const headers = { Accept: 'application/json' };
    let body;
    if (o.form) {
      body = o.form;
    } else if (o.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(o.body);
    }
    const tok = token();
    if (tok && (o.auth || path.startsWith('/api/public/customer'))) {
      headers.Authorization = `Bearer ${tok}`;
    }

    let res;
    try {
      res = await fetch(global.AW_API_BASE + path, { method: o.method || 'GET', headers, body });
    } catch (_) {
      throw apiError('Sistem admin Walida tidak bisa dihubungi. Periksa koneksi internet.', 0);
    }

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = { error: text.trim() };
      }
    }

    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || res.statusText || `HTTP ${res.status}`;
      if (res.status === 401 && o.auth && o.handle401 !== false) {
        clearSession();
        global.location.href = loginUrl();
      }
      throw apiError(msg, res.status, data);
    }
    return data;
  }

  const enc = encodeURIComponent;

  function query(params) {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.set(k, v);
    });
    const s = q.toString();
    return s ? `?${s}` : '';
  }

  global.AWApi = {
    request,
    loginUrl,
    polygons: () => request('/api/polygon'),
    polygon: (id) => request(`/api/polygon/${enc(id)}`),
    petani: (id) => request(`/api/petani/${enc(id)}`),
    prosesList: () => request('/api/polygon-proses'),
    kontenHome: () => request('/api/public/konten-home'),
    booking(body) {
      if (!token()) return Promise.reject(apiError('Login diperlukan', 401));
      return request('/api/booking', { method: 'POST', body, auth: true, handle401: false });
    },
    invoice: (idPembelian) => request(`/api/booking/${enc(idPembelian)}`),
    signup(payload) {
      return payload instanceof FormData
        ? request('/api/public/customer/signup', { method: 'POST', form: payload })
        : request('/api/public/customer/signup', { method: 'POST', body: payload });
    },
    login: (username, password) =>
      request('/api/public/customer/login', { method: 'POST', body: { username, password } }),
    me: () => request('/api/public/customer/me', { auth: true }),
    // 401 di sini bisa berarti "Password lama salah", jadi ditangani halaman profil
    updateMe: (formData) =>
      request('/api/public/customer/me', { method: 'PUT', form: formData, auth: true, handle401: false }),
    orders: (filters) => request(`/api/public/customer/orders${query(filters)}`, { auth: true }),
    order: (idPembelian) => request(`/api/public/customer/orders/${enc(idPembelian)}`, { auth: true }),
  };
})(window);
