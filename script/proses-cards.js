/* Kartu konten proses pengolahan (GET /api/polygon-proses) + modal "Selengkapnya" */
(function (global) {
  const U = global.WalidaUtils;
  const I = global.AWI18n;
  const esc = U.escapeHtml;
  let cache = null;

  function load() {
    if (!cache) {
      cache = global.AWApi.prosesList()
        .then((data) => (Array.isArray(data) ? data : []))
        .catch((err) => {
          cache = null;
          throw err;
        });
    }
    return cache;
  }

  function notes(item) {
    return String((item && item.possibleNotes) || '')
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function chipsHtml(item) {
    const list = notes(item);
    if (!list.length) return '';
    return `<div class="note-chips">${list.map((n) => `<span class="note-chip">${esc(n)}</span>`).join('')}</div>`;
  }

  function imageHtml(item, cls) {
    const url = U.secureUrl(item && item.imageFullUrl);
    const ph = `<div class="${cls} proses-img--empty" aria-hidden="true"><span>☕</span></div>`;
    if (!url) return ph;
    return `<div class="${cls}"><img src="${esc(url)}" alt="${esc(item.namaProses || '')}" loading="lazy" onerror="this.parentElement.classList.add('proses-img--empty');this.parentElement.innerHTML='<span>☕</span>'" /></div>`;
  }

  function altitudeBadge(item) {
    if (item.altitude == null || item.altitude === '') return '';
    return `<span class="proses-alt">${esc(U.formatMdpl(item.altitude))}</span>`;
  }

  /* Kartu ringkas: deskripsi 3 baris + tombol Selengkapnya (data-proses-more = index) */
  function cardHtml(item, index) {
    return `
      <article class="proses-card">
        ${imageHtml(item, 'proses-img')}
        <div class="proses-card-body">
          <div class="proses-card-head">
            <h3>${esc(item.namaProses || '—')}</h3>
            ${altitudeBadge(item)}
          </div>
          ${item.varietas ? `<p class="proses-var"><span>${esc(I.t('process.varietas'))}:</span> ${esc(item.varietas)}</p>` : ''}
          ${chipsHtml(item)}
          ${item.proses ? `<p class="proses-desc clamp-3">${esc(item.proses)}</p>
          <button type="button" class="link-btn" data-proses-more="${index}">${esc(I.t('process.readMore'))}</button>` : ''}
        </div>
      </article>`;
  }

  /* Tampilan lengkap (traceability / modal) */
  function fullHtml(item) {
    return `
      <div class="proses-full">
        ${imageHtml(item, 'proses-img proses-img--wide')}
        <div class="proses-card-head">
          <h3>${esc(item.namaProses || '—')}</h3>
          ${altitudeBadge(item)}
        </div>
        ${item.varietas ? `<p class="proses-var"><span>${esc(I.t('process.varietas'))}:</span> ${esc(item.varietas)}</p>` : ''}
        ${chipsHtml(item)}
        ${item.proses ? `<p class="proses-desc pre-line">${esc(item.proses)}</p>` : ''}
      </div>`;
  }

  function ensureModal() {
    let el = document.getElementById('proses-modal');
    if (el) return el;
    el = document.createElement('div');
    el.className = 'modal fade';
    el.id = 'proses-modal';
    el.tabIndex = -1;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="modal-dialog modal-dialog-scrollable modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title h5"></h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body"></div>
        </div>
      </div>`;
    document.body.appendChild(el);
    return el;
  }

  function openModal(item) {
    const el = ensureModal();
    el.querySelector('.modal-title').textContent = item.namaProses || '';
    el.querySelector('.btn-close').setAttribute('aria-label', I.t('common.close'));
    el.querySelector('.modal-body').innerHTML = fullHtml(item);
    global.bootstrap.Modal.getOrCreateInstance(el).show();
  }

  /* Hubungkan tombol Selengkapnya di dalam root ke daftar item yang dirender */
  function bindMore(root, items) {
    root.querySelectorAll('[data-proses-more]').forEach((btn) => {
      const item = items[Number(btn.dataset.prosesMore)];
      if (item) btn.addEventListener('click', () => openModal(item));
    });
  }

  /* Konten proses untuk satu petak: namaProses sama (case-insensitive) dengan proses petak,
     yang varietas & altitude-nya sama dengan petak didahulukan */
  function forPolygon(polygon, list) {
    const names = U.processNames(polygon).map((p) => p.toLowerCase());
    const mdpl = Number(polygon && polygon.mdpl);
    const varietas = String((polygon && polygon.varietas) || '').trim().toLowerCase();
    const score = (p) =>
      (Number(p.altitude) === mdpl ? 1 : 0) +
      (String(p.varietas || '').trim().toLowerCase() === varietas ? 1 : 0);
    return (list || [])
      .filter((p) => names.includes(String(p.namaProses || '').trim().toLowerCase()))
      .sort((a, b) => score(b) - score(a));
  }

  global.AWProses = { load, cardHtml, fullHtml, bindMore, openModal, forPolygon, notes };
})(window);
