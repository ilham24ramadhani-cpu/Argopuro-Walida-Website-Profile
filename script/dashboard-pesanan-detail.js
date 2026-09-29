/* /dashboard/pesanan/<id>: detail pesanan + kartu traceability (kebun, petani, proses) */
document.addEventListener('DOMContentLoaded', () => {
  const U = window.WalidaUtils;
  const I = window.AWI18n;
  const esc = U.escapeHtml;
  const root = document.getElementById('order-detail');
  const holder = document.getElementById('trace-map-holder');
  const mapPane = document.getElementById('trace-map-pane');
  const id = root.dataset.id;
  let data = null;
  let error = '';
  let notFound = false;
  let map = null;

  const row = (key, value) => `<div><dt>${esc(I.t(key))}</dt><dd>${value}</dd></div>`;
  const txt = (v) => esc(v === undefined || v === null || v === '' ? '—' : v);

  function processNames(list) {
    return (Array.isArray(list) ? list : [])
      .map((p) => (typeof p === 'string' ? p : p && p.prosesPengolahan))
      .filter(Boolean);
  }

  function timelineHtml(status) {
    if (status === 'Dibatalkan') {
      return `<ol class="timeline">
          <li class="done"><span></span>${esc(I.t('order.timeline.placed'))}</li>
          <li class="cancelled"><span></span>${esc(I.statusLabel('order', 'Dibatalkan'))}</li>
        </ol>`;
    }
    const steps = [I.t('order.timeline.placed'), I.statusLabel('order', 'Ordering'), I.statusLabel('order', 'Complete')];
    const doneUntil = status === 'Complete' ? 3 : 1;
    return `<ol class="timeline">${steps
      .map((s, i) => {
        const cls = i < doneUntil ? 'done' : i === doneUntil ? 'current' : '';
        return `<li class="${cls}"><span></span>${esc(s)}</li>`;
      })
      .join('')}</ol>`;
  }

  function orderCard(o) {
    const subtotal = U.formatRp(Number(o.jumlahPesananKg) * Number(o.hargaPerKg));
    return `
      <article class="dash-card">
        <div class="card-head">
          <h2>${esc(I.t('order.detailTitle'))}</h2>
          <div>${U.badgeHtml('order', o.statusPemesanan)} ${U.badgeHtml('payment', o.statusPembayaran)}</div>
        </div>
        ${timelineHtml(o.statusPemesanan)}
        <dl class="kv">
          ${row('order.id', txt(o.idPembelian))}
          ${row('order.date', txt(I.formatDate(o.tanggalPemesanan)))}
          ${row('order.product', txt(o.tipeProduk))}
          ${row('polygon.varietas', txt(o.varietas))}
          ${row('booking.process', txt(o.prosesPengolahan))}
          ${row('checkout.polygon', txt([o.namaPolygon, o.idPolygon].filter(Boolean).join(' · ')))}
          ${row('order.qtyKg', txt(U.formatNumber(o.jumlahPesananKg)))}
          ${row('polygon.hargaPerKg', txt(U.formatRp(o.hargaPerKg)))}
          ${row('booking.subtotal', txt(subtotal))}
          ${row('order.tax', txt(U.formatRp(o.biayaPajak || 0)))}
          ${row('order.shipping', txt(U.formatRp(o.biayaPengiriman || 0)))}
        </dl>
        <div class="total-band"><span>${esc(I.t('order.total'))}</span><strong>${esc(U.formatRp(o.totalHarga))}</strong></div>
        <h3 class="sub-title">${esc(I.t('invoice.buyer'))}</h3>
        <dl class="kv">
          ${row('checkout.name', txt(o.namaPembeli))}
          ${row('checkout.contact', txt(o.kontakPembeli))}
          ${row('checkout.address', `<span class="pre-line">${txt(o.alamatPembeli)}</span>`)}
          ${o.catatanPemesanan ? row('checkout.note', `<span class="pre-line">${txt(o.catatanPemesanan)}</span>`) : ''}
        </dl>
        ${
          o.statusPembayaran !== 'Lunas' && o.keteranganPembayaran
            ? `<h3 class="sub-title">${esc(I.t('invoice.paymentInfo'))}</h3><p class="payment-box pre-line">${esc(o.keteranganPembayaran)}</p>`
            : ''
        }
      </article>`;
  }

  function polygonSection(p) {
    if (!p) return `<section class="trace-section"><h3>${esc(I.t('trace.farm'))}</h3><p class="status-box">${esc(I.t('trace.farmGone'))}</p></section>`;
    const c = U.centerOf(p);
    const kml = U.secureUrl(p.kmlFullUrl);
    return `
      <section class="trace-section">
        <h3>${esc(I.t('trace.farm'))}</h3>
        <div data-map-slot></div>
        <p class="print-only trace-coords-print">${c ? `${esc(I.t('trace.center'))}: ${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}` : ''}</p>
        <dl class="kv">
          ${row('polygon.idPolygon', txt(p.idPolygon))}
          ${row('polygon.namaKml', txt(p.namaKml))}
          ${row('polygon.mdpl', txt(U.formatMdpl(p.mdpl)))}
          ${row('polygon.luas', txt(U.formatHa(U.landAreaHa(p))))}
          ${row('trace.center', c ? `<code>${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}</code>` : '—')}
        </dl>
        <div class="actions no-print">
          ${c ? `<a class="btn btn-ghost" href="${esc(U.mapsUrl(c))}" target="_blank" rel="noopener">${esc(I.t('trace.openMaps'))}</a>` : ''}
          ${kml ? `<a class="btn btn-ghost" href="${esc(kml)}" download>${esc(I.t('trace.downloadKml'))}</a>` : ''}
        </div>
      </section>`;
  }

  function petaniSection(pt) {
    if (!pt) return `<section class="trace-section"><h3>${esc(I.t('trace.farmer'))}</h3><p class="status-box">${esc(I.t('trace.farmerGone'))}</p></section>`;
    const proses = processNames(pt.prosesPengolahan);
    return `
      <section class="trace-section">
        <h3>${esc(I.t('trace.farmer'))}</h3>
        <div class="petani-block petani-block--flat">
          ${U.avatarHtml(U.secureUrl(pt.fotoFullUrl), pt.nama || '?', 'petani-avatar petani-avatar--lg')}
          <div class="petani-block-text">
            <strong>${txt(pt.nama)}</strong>
            <span class="petani-id">${txt(pt.idPetani)}</span>
          </div>
        </div>
        <dl class="kv">
          ${row('polygon.varietas', txt(pt.varietas))}
          ${row('polygon.mdpl', txt(U.formatMdpl(pt.mdpl)))}
          ${row('trace.farmerLand', txt(U.formatHa(pt.luasHektar)))}
          ${pt.jumlahPolygon != null ? row('trace.polygonCount', txt(U.formatNumber(pt.jumlahPolygon, 0))) : ''}
          ${row('trace.farmerProcesses', proses.length ? `<span class="chip-list">${proses.map((x) => `<span class="proses-chip">${esc(x)}</span>`).join('')}</span>` : '—')}
        </dl>
      </section>`;
  }

  function uniqueProses(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : []).filter((p) => {
      if (!p) return false;
      const key = p.idProses != null ? `id:${p.idProses}` : [p.namaProses, p.varietas, p.altitude].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function prosesSection(list, fallbackName) {
    const items = uniqueProses(list);
    if (!items.length) {
      return `<section class="trace-section"><h3>${esc(I.t('trace.process'))}</h3>
        <p><strong>${txt(fallbackName)}</strong></p></section>`;
    }
    const [main, ...others] = items;
    return `
      <section class="trace-section">
        <h3>${esc(I.t('trace.process'))}</h3>
        ${window.AWProses.fullHtml(main)}
        ${
          others.length
            ? `<h4 class="sub-title">${esc(I.t('trace.otherVariants'))}</h4>
               <div class="proses-grid proses-grid--compact">${others.map((p, i) => window.AWProses.cardHtml(p, i)).join('')}</div>`
            : ''
        }
      </section>`;
  }

  function sentence(o, tr) {
    const p = tr.polygon;
    const pt = tr.petani;
    const params = {
      varietas: o.varietas || (p && p.varietas) || '—',
      proses: o.prosesPengolahan || '—',
      kebun: (p && (p.namaKml || p.idPolygon)) || o.namaPolygon || o.idPolygon || '—',
      petani: (pt && pt.nama) || (p && p.petani) || '',
      mdpl: (p && p.mdpl) || (pt && pt.mdpl) || '',
    };
    if (params.petani && params.mdpl) return I.t('trace.sentence', params);
    return I.t('trace.sentenceShort', params);
  }

  function render() {
    if (map) holder.appendChild(mapPane);
    if (error || notFound) {
      root.innerHTML = `
        <div class="empty-state">
          <p>${esc(notFound ? I.t('order.notFound') : error)}</p>
          <a class="btn" href="/dashboard/pesanan">${esc(I.t('order.backToOrders'))}</a>
        </div>`;
      return;
    }
    if (!data) return;
    const o = data.order || {};
    const tr = data.traceability || {};
    root.innerHTML = `
      <div class="dash-title-row no-print">
        <a class="link-btn" href="/dashboard/pesanan">← ${esc(I.t('order.backToOrders'))}</a>
        <div class="export-actions">
          <a class="btn btn-ghost btn-sm-pill" href="/invoice/${encodeURIComponent(o.idPembelian || id)}">${esc(I.t('order.viewInvoice'))}</a>
          <button type="button" class="btn btn-sm-pill" data-print>${esc(I.t('order.print'))}</button>
        </div>
      </div>
      <h1 class="dash-title">${esc(I.t('order.detailHeading', { id: o.idPembelian || id }))}</h1>
      <p class="trace-sentence">${esc(sentence(o, tr))}</p>
      <div class="detail-grid">
        ${orderCard(o)}
        <article class="dash-card trace-card">
          <div class="card-head"><h2>${esc(I.t('trace.title'))}</h2></div>
          <p class="form-hint">${esc(I.t('trace.lede'))}</p>
          ${polygonSection(tr.polygon)}
          ${petaniSection(tr.petani)}
          ${prosesSection(tr.prosesPengolahan, o.prosesPengolahan)}
        </article>
      </div>`;
    root.querySelector('[data-print]').addEventListener('click', () => window.print());
    const others = uniqueProses(tr.prosesPengolahan).slice(1);
    window.AWProses.bindMore(root, others);
    mountMap(tr.polygon);
  }

  function mountMap(polygon) {
    const slot = root.querySelector('[data-map-slot]');
    if (!slot || !polygon) return;
    slot.appendChild(mapPane);
    if (map) {
      map.map && map.map.resize();
      return;
    }
    map = window.PolygonMap.create('trace-map', [polygon], { selectedId: polygon.idPolygon, fitMaxZoom: 17 });
    window.PolygonMap.bindControls(map, mapPane.querySelector('[data-map-toolbar]'));
  }

  document.addEventListener('aw:langchange', render);

  (async function load() {
    try {
      data = await window.AWApi.order(id);
    } catch (err) {
      if (err.status === 404) notFound = true;
      else error = I.apiError(err.message);
    }
    render();
  })();
});
