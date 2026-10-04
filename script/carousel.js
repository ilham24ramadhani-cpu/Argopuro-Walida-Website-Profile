/* Carousel beranda. Slide diambil dari Konten Home admin (GET /api/public/konten-home);
   jika kosong / API gagal, slide bawaan di home.html tetap dipakai. */
(function () {
  const INTERVAL_MS = 5500;
  const LOAD_TIMEOUT_MS = 4000;
  const SAFE_LINK = /^(\/|#|https?:\/\/|mailto:|tel:)/i;

  function el(tag, attrs, text) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) node.setAttribute(k, v);
    });
    if (text !== undefined) node.textContent = text;
    return node;
  }

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
    box.appendChild(el('h1', null, item.judul || ''));
    if (item.deskripsi) {
      box.appendChild(el('p', { class: 'lede hero-intro hero-desc' }, item.deskripsi));
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
            b.label,
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
    if (slides.length < 2) return;

    const dots = Array.from(root.querySelectorAll('[data-carousel-dot]'));
    let index = 0;
    let timer = null;
    let swapTimer = null;

    function show(i) {
      const prev = index;
      index = (i + slides.length) % slides.length;
      slides.forEach((s, n) => s.classList.toggle('on', n === index));
      dots.forEach((d, n) => d.classList.toggle('on', n === index));
      if (!items || !content || prev === index) return;
      clearTimeout(swapTimer);
      content.classList.add('swap');
      swapTimer = setTimeout(() => {
        renderContent(content, items[index]);
        content.classList.remove('swap');
      }, 250);
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
  }

  async function loadItems() {
    if (!window.AWApi || !window.AW_API_BASE) {
      console.warn('WALIDA_API belum diatur, memakai slide bawaan.');
      return null;
    }
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${LOAD_TIMEOUT_MS} ms`)), LOAD_TIMEOUT_MS),
    );
    try {
      const rows = await Promise.race([window.AWApi.kontenHome(), timeout]);
      const items = (Array.isArray(rows) ? rows : []).filter((r) => r && r.imageFullUrl && r.judul);
      if (!items.length) console.warn('Konten home kosong, memakai slide bawaan.');
      return items.length ? items : null;
    } catch (err) {
      console.warn('Konten home tidak bisa dimuat, memakai slide bawaan.', err);
      return null;
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const root = document.getElementById('hero-carousel');
    if (!root) return;
    const items = await loadItems();
    if (items) renderSlides(root.querySelector('.hero-slides'), items);
    start(root, items);
    root.classList.remove('hero-loading');
  });
})();
