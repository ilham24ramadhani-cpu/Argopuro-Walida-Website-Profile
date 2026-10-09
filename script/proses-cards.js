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

  /* idProses konten berbentuk "PRS001", di petak berupa angka 1 → bandingkan angkanya */
  function procId(value) {
    const m = String(value ?? '').match(/(\d+)\s*$/);
    return m ? Number(m[1]) : null;
  }

  function normName(value) {
    return String(value || '').trim().toLowerCase();
  }

  /* Proses milik petak yang sama dengan konten (idProses, atau nama jika id tak ada) */
  function matchingProcess(item, polygon) {
    const id = procId(item.idProses);
    const name = normName(item.namaProses);
    const list = Array.isArray(polygon && polygon.prosesPengolahan) ? polygon.prosesPengolahan : [];
    return list.find((p) => {
      if (typeof p === 'string') return normName(p) === name;
      if (!p) return false;
      if (id != null && procId(p.idProses) === id) return true;
      return normName(p.prosesPengolahan) === name;
    });
  }

  function altOf(value) {
    return value == null || value === '' ? null : Number(value);
  }

  /* Petak yang memakai proses ini. Jika ada konten lain untuk proses yang sama
     dengan altitude persis = mdpl petak, petak itu milik konten tersebut. */
  function polygonsFor(item, polygons, contents) {
    if (!item) return [];
    const alt = altOf(item.altitude);
    return (polygons || []).filter((p) => {
      if (!matchingProcess(item, p)) return false;
      const mdpl = altOf(p.mdpl);
      if (mdpl == null || alt === mdpl) return true;
      return !(contents || []).some(
        (c) => c !== item && altOf(c.altitude) === mdpl && matchingProcess(c, p),
      );
    });
  }

  function mapUrl(item, matched) {
    const proc = matched.length ? matchingProcess(item, matched[0]) : null;
    const name = proc ? (typeof proc === 'string' ? proc : proc.prosesPengolahan) : item.namaProses;
    return name ? `/peta?proses=${encodeURIComponent(String(name).trim())}` : '/peta';
  }

  /* Satu chip per petani (petak pertama milik petani tsb. dibuka di peta) */
  function farmersHtml(matched) {
    const byName = new Map();
    matched.forEach((p) => {
      const nama = U.petaniNama(p) || U.farmTitle(p);
      if (!byName.has(nama)) byName.set(nama, p);
    });
    const chips = [...byName.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], I.locale()))
      .map(
        ([nama, p]) => `
          <a class="proses-farmer" href="/peta?polygon=${encodeURIComponent(U.farmId(p))}" title="${esc([U.farmId(p), U.formatMdpl(p.mdpl)].join(' · '))}">
            ${U.avatarHtml(U.petaniFotoUrl(p), nama, 'petani-avatar petani-avatar--xs')}
            <span>${esc(nama)}</span>
          </a>`,
      )
      .join('');
    return `
      <div class="proses-farmers">
        <p class="proses-farmers-title">${esc(I.t('process.farmers'))}</p>
        ${chips ? `<div class="proses-farmer-list">${chips}</div>` : `<p class="proses-farmers-empty">${esc(I.t('process.noFarmers'))}</p>`}
      </div>`;
  }

  /* Kartu ringkas: deskripsi 3 baris + tombol Selengkapnya (data-proses-more = index).
     opts.polygons (+ opts.contents = semua konten proses): tampilkan petani terkait + tombol Cek map poligon */
  function cardHtml(item, index, opts) {
    const polygons = opts && opts.polygons;
    const matched = polygons ? polygonsFor(item, polygons, opts.contents) : [];
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
          ${polygons ? `${farmersHtml(matched)}
          <a class="btn proses-map-btn" href="${esc(mapUrl(item, matched))}">${esc(I.t('process.checkMap'))}</a>` : ''}
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

  global.AWProses = { load, cardHtml, fullHtml, bindMore, openModal, forPolygon, polygonsFor, notes };
})(window);
