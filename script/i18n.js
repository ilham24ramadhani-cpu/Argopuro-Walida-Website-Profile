/* Bahasa Indonesia / English. Kamus: static/i18n/{id,en}.json (dimuat via /script/i18n-dict.js) */
(function (global) {
  const KEY = 'awLang';
  const LANGS = ['id', 'en'];
  const LOCALES = { id: 'id-ID', en: 'en-US' };
  const dicts = global.AW_I18N_DICT || {};

  // Pesan error dari API (bahasa Indonesia) → key kamus
  const API_ERRORS = [
    [/username sudah (dipakai|digunakan|terdaftar)/i, 'errors.usernameTaken'],
    [/username atau password salah/i, 'errors.badCredentials'],
    [/password lama salah/i, 'errors.oldPasswordWrong'],
    [/stok.*(tidak cukup|melebihi|habis)|melebihi.*stok/i, 'errors.stockInsufficient'],
    [/token.*(tidak valid|kedaluwarsa|expired|invalid)|sesi.*berakhir|unauthori[sz]ed|wajib login|login diperlukan/i, 'errors.tokenInvalid'],
  ];

  function detectLang() {
    try {
      const saved = global.localStorage.getItem(KEY);
      if (LANGS.includes(saved)) return saved;
    } catch (_) {
      /* storage tidak tersedia */
    }
    const nav = (global.navigator && (global.navigator.language || '')) || '';
    return /^id|^in\b/i.test(nav) ? 'id' : 'en';
  }

  let current = detectLang();
  document.documentElement.lang = current;

  function lookup(dict, key) {
    if (!dict) return undefined;
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    const parts = key.split('.');
    let node = dict;
    for (let i = 0; i < parts.length; i += 1) {
      if (node == null || typeof node !== 'object') return undefined;
      // Segmen terakhir boleh mengandung titik/spasi (mis. "payment.status.Belum Lunas")
      const rest = parts.slice(i).join('.');
      if (Object.prototype.hasOwnProperty.call(node, rest) && typeof node[rest] !== 'object') {
        return node[rest];
      }
      node = node[parts[i]];
    }
    return node;
  }

  function t(key, params) {
    let s = lookup(dicts[current], key);
    if (typeof s !== 'string') s = lookup(dicts.id, key);
    if (typeof s !== 'string') return key;
    if (params) {
      s = s.replace(/\{(\w+)\}/g, (m, name) =>
        params[name] === undefined || params[name] === null ? '' : String(params[name]),
      );
    }
    return s;
  }

  function has(key) {
    return typeof lookup(dicts[current], key) === 'string' || typeof lookup(dicts.id, key) === 'string';
  }

  function locale() {
    return LOCALES[current];
  }

  function apply(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    [
      ['i18nPlaceholder', 'placeholder'],
      ['i18nTitle', 'title'],
      ['i18nAriaLabel', 'aria-label'],
    ].forEach(([prop, attr]) => {
      const sel = `[data-${prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}]`;
      scope.querySelectorAll(sel).forEach((el) => el.setAttribute(attr, t(el.dataset[prop])));
    });
    if (!root || root === document) {
      const meta = document.querySelector('meta[name="aw-title"]');
      if (meta && meta.content) {
        const brand = document.querySelector('meta[name="aw-brand"]');
        const page = t(meta.content);
        document.title = brand && brand.content ? `${page} — ${brand.content}` : page;
      }
    }
  }

  function setLang(lang) {
    if (!LANGS.includes(lang) || lang === current) return;
    current = lang;
    try {
      global.localStorage.setItem(KEY, lang);
    } catch (_) {
      /* storage tidak tersedia */
    }
    document.documentElement.lang = lang;
    apply(document);
    document.dispatchEvent(new CustomEvent('aw:langchange', { detail: { lang } }));
  }

  function toNumber(n) {
    if (n === null || n === undefined || n === '') return null;
    const v = Number(n);
    return Number.isNaN(v) ? null : v;
  }

  function formatNumber(n, opts) {
    const v = toNumber(n);
    if (v === null) return '—';
    return new Intl.NumberFormat(locale(), { maximumFractionDigits: 2, ...(opts || {}) }).format(v);
  }

  function formatCurrency(n) {
    const v = toNumber(n);
    if (v === null) return '—';
    return new Intl.NumberFormat(locale(), {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v);
  }

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const s = String(value);
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    // ISO tanpa zona dari admin (mis. 2026-09-25T18:56:30.161000) dianggap waktu lokal
    const d = new Date(s.replace(/(\.\d{3})\d+/, '$1'));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function formatDate(value, opts) {
    const d = parseDate(value);
    if (!d) return value ? String(value) : '—';
    return new Intl.DateTimeFormat(locale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(opts || {}),
    }).format(d);
  }

  function apiError(message) {
    const msg = String(message || '').trim();
    if (!msg) return t('errors.generic');
    const hit = API_ERRORS.find(([re]) => re.test(msg));
    return hit ? t(hit[1]) : msg;
  }

  function statusLabel(kind, value) {
    const key = `${kind}.status.${value}`;
    return value && has(key) ? t(key) : value || '—';
  }

  global.AWI18n = {
    lang: () => current,
    locale,
    setLang,
    t,
    has,
    apply,
    formatNumber,
    formatCurrency,
    formatDate,
    parseDate,
    apiError,
    statusLabel,
  };

  function init() {
    apply(document);
    document.querySelectorAll('[data-set-lang]').forEach((btn) => {
      btn.addEventListener('click', () => setLang(btn.dataset.setLang));
    });
    syncSwitchers();
    document.addEventListener('aw:langchange', syncSwitchers);
  }

  function syncSwitchers() {
    document.querySelectorAll('[data-set-lang]').forEach((btn) => {
      const on = btn.dataset.setLang === current;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
