/* Sesi customer (token 7 hari dari API admin) di localStorage */
(function (global) {
  const TOKEN_KEY = 'awCustomerToken';
  const CUSTOMER_KEY = 'awCustomer';
  const PENDING_KEY = 'awPendingBooking';

  function read(store, key) {
    try {
      return global[store].getItem(key);
    } catch (_) {
      return null;
    }
  }

  function write(store, key, value) {
    try {
      if (value === null) global[store].removeItem(key);
      else global[store].setItem(key, value);
    } catch (_) {
      /* storage tidak tersedia */
    }
  }

  function emit() {
    document.dispatchEvent(new CustomEvent('aw:authchange', { detail: { customer: getCustomer() } }));
  }

  function getToken() {
    return read('localStorage', TOKEN_KEY) || '';
  }

  function getCustomer() {
    try {
      return JSON.parse(read('localStorage', CUSTOMER_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function setSession(res) {
    if (!res) return;
    if (res.token) write('localStorage', TOKEN_KEY, res.token);
    if (res.customer) write('localStorage', CUSTOMER_KEY, JSON.stringify(res.customer));
    emit();
  }

  function clear() {
    write('localStorage', TOKEN_KEY, null);
    write('localStorage', CUSTOMER_KEY, null);
    emit();
  }

  function logout() {
    global.AWAuth.loggingOut = true;
    clear();
    global.location.href = '/';
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function currentPath() {
    return global.location.pathname + global.location.search + global.location.hash;
  }

  function loginUrl(next, page) {
    return `/${page || 'login'}?next=${encodeURIComponent(next || currentPath())}`;
  }

  function requireLogin(next) {
    if (isLoggedIn()) return true;
    global.location.replace(loginUrl(next));
    return false;
  }

  // Hanya path relatif di situs ini (cegah open redirect ke domain lain)
  function safeNext(value, fallback) {
    const v = String(value || '');
    return v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : fallback || '/dashboard';
  }

  function savePendingBooking(data) {
    write('sessionStorage', PENDING_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  }

  function peekPendingBooking() {
    try {
      return JSON.parse(read('sessionStorage', PENDING_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function clearPendingBooking() {
    write('sessionStorage', PENDING_KEY, null);
  }

  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }

  function fotoUrl(customer) {
    let url = (customer && customer.fotoFullUrl) || '';
    if (url.startsWith('http://') && global.location.protocol === 'https:') {
      url = `https://${url.slice(7)}`;
    }
    return url;
  }

  async function refresh() {
    if (!isLoggedIn() || !global.AWApi) return;
    try {
      const customer = await global.AWApi.request('/api/public/customer/me', { auth: true, handle401: false });
      if (customer) setSession({ customer: customer.customer || customer });
    } catch (err) {
      if (err.status === 401) clear();
    }
  }

  global.AWAuth = {
    getToken,
    getCustomer,
    setSession,
    clear,
    logout,
    loggingOut: false,
    isLoggedIn,
    requireLogin,
    loginUrl,
    safeNext,
    refresh,
    initials,
    fotoUrl,
    savePendingBooking,
    peekPendingBooking,
    clearPendingBooking,
  };

  // Masuk/keluar di tab lain
  global.addEventListener('storage', (e) => {
    if (e.key === TOKEN_KEY || e.key === CUSTOMER_KEY || e.key === null) emit();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})(window);
