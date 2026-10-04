/* Carousel beranda. Slide diambil dari Konten Home admin (GET /api/public/konten-home);
   jika kosong / API gagal, slide bawaan di home.html tetap dipakai.
   Teks admin ditulis dalam bahasa Indonesia; untuk bahasa lain diterjemahkan otomatis
   (MyMemory) dan di-cache di localStorage. Jika terjemahan gagal, teks asli yang tampil. */
(function () {
  const INTERVAL_MS = 5500;
  const LOAD_TIMEOUT_MS = 4000;
  const TRANSLATE_TIMEOUT_MS = 3000;
  const TRANSLATE_URL = 'https://api.mymemory.translated.net/get';
  const TRANSLATE_MAX_BYTES = 480;
  const SOURCE_LANG = 'id';
  const CACHE_KEY = 'awKontenHomeTr';
  const SAFE_LINK = /^(\/|#|https?:\/\/|mailto:|tel:)/i;

  function el(tag, attrs, text) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) node.setAttribute(k, v);
    });
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}: timeout ${ms} ms`)), ms)),
    ]);
  }

  function lang() {
    return (window.AWI18n && window.AWI18n.lang()) || SOURCE_LANG;
  }

  /* ——— Terjemahan otomatis ——— */

  const cache = (() => {
    try {
      return JSON.parse(window.localStorage.getItem(CACHE_KEY)) || {};
    } catch (_) {
      return {};
    }
  })();

  function saveCache() {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (_) {
      /* storage penuh / tidak tersedia */
    }
  }

  const cacheKey = (target, text) => `${target}\u0000${text}`;
  const byteLength = (text) => new TextEncoder().encode(text).length;

  async function fetchTranslation(text, target) {
    const url = `${TRANSLATE_URL}?langpair=${SOURCE_LANG}|${target}&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    const out = data && data.responseData && data.responseData.translatedText;
    if (!res.ok || Number(data.responseStatus) !== 200 || data.quotaFinished || !out || /MYMEMORY WARNING/i.test(out)) {
      throw new Error((data && data.responseDetails) || `HTTP ${res.status}`);
    }
    return out;
  }

  /* Batas panjang teks per request; teks panjang diterjemahkan per baris. */
  async function translateText(text, target) {
    if (byteLength(text) <= TRANSLATE_MAX_BYTES) return fetchTranslation(text, target);
    const lines = await Promise.all(
      text.split('\n').map((line) =>
        line.trim() && byteLength(line) <= TRANSLATE_MAX_BYTES ? fetchTranslation(line, target) : line,
      ),
    );
    return lines.join('\n');
  }

  async function translateItems(items, target) {
    if (!items || target === SOURCE_LANG) return;
    const texts = new Set();
    items.forEach((item) => {
      [item.judul, item.deskripsi, ...(item.buttons || []).map((b) => b && b.label)].forEach((t) => {
        if (t && t.trim() && !(cacheKey(target, t) in cache)) texts.add(t);
      });
    });
    if (!texts.size) return;
    const results = await Promise.allSettled(
      [...texts].map(async (t) => {
        cache[cacheKey(target, t)] = await translateText(t, target);
      }),
    );
    saveCache();
    const failed = results.find((r) => r.status === 'rejected');
    if (failed) console.warn('Sebagian konten home tidak bisa diterjemahkan, memakai teks asli.', failed.reason);
  }

  function tr(text) {
    const target = lang();
    if (!text || target === SOURCE_LANG) return text;
    return cache[cacheKey(target, text)] || text;
  }

  /* ——— Render ——— */

  function isExternal(link) {
    if (!/^(https?:)?\/\//i.test(link)) return false;
    try {
      return new URL(link, window.location.href).host !== window.location.host;
    } catch (_) {
      return true;
    }
  }

  function renderContent(box, item) {
    box.replaceChildren();
    box.appendChild(el('h1', null, tr(item.judul || '')));
    if (item.deskripsi) {
      box.appendChild(el('p', { class: 'lede hero-intro hero-desc' }, tr(item.deskripsi)));
    }
    const buttons = (item.buttons || []).filter((b) => b && b.label && SAFE_LINK.test(b.link || ''));
    if (buttons.length) {
      const actions = el('div', { class: 'actions' });
      buttons.forEach((b, i) => {
        const external = isExternal(b.link);
        actions.appendChild(
          el(
            'a',
            {
              class: i === 0 ? 'btn' : 'btn btn-ghost',
              href: b.link,
              target: external ? '_blank' : null,
              rel: external ? 'noopener' : null,
            },
            tr(b.label),
          ),
        );
      });
      box.appendChild(actions);
    }
  }

  function renderSlides(slidesWrap, items) {
    slidesWrap.replaceChildren(
      ...items.map((item, i) => {
        const fig = el('figure', { class: i === 0 ? 'hero-slide on' : 'hero-slide', 'data-slide': i });
        fig.appendChild(
          el('img', {
            src: item.imageFullUrl,
            alt: item.judul || '',
            loading: i === 0 ? 'eager' : 'lazy',
          }),
        );
        return fig;
      }),
    );
  }

  function buildControls(root, count) {
    root.querySelectorAll('.carousel-nav, .carousel-dots').forEach((n) => n.remove());
    if (count < 2) return;
    root.appendChild(
      el('button', { type: 'button', class: 'carousel-nav prev', 'data-carousel-dir': '-1', 'data-i18n-aria-label': 'home.prevPhoto' }, '‹'),
    );
    root.appendChild(
      el('button', { type: 'button', class: 'carousel-nav next', 'data-carousel-dir': '1', 'data-i18n-aria-label': 'home.nextPhoto' }, '›'),
    );
    const dots = el('div', { class: 'carousel-dots', role: 'tablist', 'data-i18n-aria-label': 'home.choosePhoto' });
    for (let i = 0; i < count; i++) {
      dots.appendChild(
        el('button', { type: 'button', role: 'tab', class: i === 0 ? 'on' : '', 'aria-label': `Foto ${i + 1}`, 'data-carousel-dot': i }),
      );
    }
    root.appendChild(dots);
    if (window.AWI18n) window.AWI18n.apply(root);
  }

  function start(root, items) {
    const slides = Array.from(root.querySelectorAll('.hero-slide'));
    const content = document.getElementById('hero-content');
    buildControls(root, slides.length);
    if (items && content) renderContent(content, items[0]);

    let index = 0;
    let swapTimer = null;

    function swapContent() {
      if (!items || !content) return;
      clearTimeout(swapTimer);
      content.classList.add('swap');
      swapTimer = setTimeout(() => {
        renderContent(content, items[index]);
        content.classList.remove('swap');
      }, 250);
    }

    const api = { refresh: swapContent };
    if (slides.length < 2) return api;

    const dots = Array.from(root.querySelectorAll('[data-carousel-dot]'));
    let timer = null;

    function show(i) {
      const prev = index;
      index = (i + slides.length) % slides.length;
      slides.forEach((s, n) => s.classList.toggle('on', n === index));
      dots.forEach((d, n) => d.classList.toggle('on', n === index));
      if (prev !== index) swapContent();
    }

    function restart() {
      clearInterval(timer);
      timer = setInterval(() => show(index + 1), INTERVAL_MS);
    }

    root.querySelectorAll('[data-carousel-dir]').forEach((btn) => {
      btn.addEventListener('click', () => {
        show(index + Number(btn.getAttribute('data-carousel-dir')));
        restart();
      });
    });
    dots.forEach((btn) => {
      btn.addEventListener('click', () => {
        show(Number(btn.getAttribute('data-carousel-dot')));
        restart();
      });
    });

    let touchX = null;
    root.addEventListener('touchstart', (e) => {
      touchX = e.touches[0].clientX;
    }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) < 50) return;
      show(index + (dx < 0 ? 1 : -1));
      restart();
    });

    restart();
    return api;
  }

  async function loadItems() {
    if (!window.AWApi || !window.AW_API_BASE) {
      console.warn('WALIDA_API belum diatur, memakai slide bawaan.');
      return null;
    }
    try {
      const rows = await withTimeout(window.AWApi.kontenHome(), LOAD_TIMEOUT_MS, 'Konten home');
      const items = (Array.isArray(rows) ? rows : []).filter((r) => r && r.imageFullUrl && r.judul);
      if (!items.length) console.warn('Konten home kosong, memakai slide bawaan.');
      return items.length ? items : null;
    } catch (err) {
      console.warn('Konten home tidak bisa dimuat, memakai slide bawaan.', err);
      return null;
    }
  }

  async function ensureTranslated(items) {
    try {
      await withTimeout(translateItems(items, lang()), TRANSLATE_TIMEOUT_MS, 'Terjemahan konten home');
    } catch (err) {
      console.warn('Terjemahan konten home gagal, memakai teks asli.', err);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const root = document.getElementById('hero-carousel');
    if (!root) return;
    const items = await loadItems();
    if (items) {
      renderSlides(root.querySelector('.hero-slides'), items);
      await ensureTranslated(items);
    }
    const carousel = start(root, items);
    root.classList.remove('hero-loading');

    if (!items) return;
    document.addEventListener('aw:langchange', async () => {
      await ensureTranslated(items);
      carousel.refresh();
    });
  });
})();
