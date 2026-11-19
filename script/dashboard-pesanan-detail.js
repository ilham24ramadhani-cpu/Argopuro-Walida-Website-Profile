/* /dashboard/pesanan/<id>: detail pesanan + kartu traceability (kebun, petani, proses) */
document.addEventListener('DOMContentLoaded', () => {
  const U = window.WalidaUtils;
  const I = window.AWI18n;
  const O = window.AWOrders;
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

  function moneyOrDash(value) {
    return value == null ? '—' : U.formatRp(value);
  }

  function asliCell(k) {
    const n = U.finiteNumber(k.hargaPerKgAsli);
    if (n == null) return '—';
    return `<s class="price-was">${esc(U.formatRp(n))}</s>`;
  }

  function diskonCell(k) {
    const n = U.finiteNumber(k.diskonPerKg);
    if (n == null || n <= 0) return '—';
    return `<span class="price-off">− ${esc(U.formatRp(n))}</span>`;
  }

  function subtotalCell(k) {
    const n = U.lineSubtotal(k);
    return esc(n == null ? '—' : U.formatRp(n));
  }

  function kloterTable(o) {
    if (U.hasTierDiscount(o)) {
      const lines = O.kloterOf(o)
        .map(
          (k, i) => `<section class="tier-line">
          <div class="tier-line-head">
            <strong>${esc(I.t('booking.kloterN', { n: k.kloter || i + 1 }))}</strong>
            <span>${txt(k.prosesPengolahan)}</span>
            <span>${esc(U.formatKg(k.jumlahPesananKg))}</span>
          </div>
          <dl class="kv">
            <div><dt>${esc(I.t('tier.lineOriginal'))}</dt><dd>${asliCell(k)}</dd></div>
            <div><dt>${esc(I.t('tier.lineDiscount'))}</dt><dd>${diskonCell(k)}</dd></div>
            <div><dt>${esc(I.t('tier.lineAfter'))}</dt><dd>${esc(moneyOrDash(U.finiteNumber(k.hargaPerKg)))}</dd></div>
            <div><dt>${esc(I.t('booking.subtotal'))}</dt><dd>${subtotalCell(k)}</dd></div>
          </dl>
        </section>`,
        )
        .join('');
      return `<div class="tier-lines">${lines}</div>`;
    }
    const rows = O.kloterOf(o)
      .map(
        (k, i) => `<tr>
          <td>${esc(k.kloter || i + 1)}</td>
          <td>${txt(k.prosesPengolahan)}</td>
          <td class="num">${esc(U.formatNumber(k.jumlahPesananKg))}</td>
          <td class="num">${esc(U.formatRp(k.hargaPerKg))}</td>
          <td class="num">${subtotalCell(k)}</td>
        </tr>`,
      )
      .join('');
    return `<div class="table-wrap kloter-table">
        <table>
          <thead><tr>
            <th>${esc(I.t('booking.kloter'))}</th>
            <th>${esc(I.t('booking.process'))}</th>
            <th class="num">${esc(I.t('order.qtyKg'))}</th>
            <th class="num">${esc(I.t('polygon.hargaPerKg'))}</th>
            <th class="num">${esc(I.t('booking.subtotal'))}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function tierRows(o) {
    if (!U.hasTierDiscount(o)) return '';
    const asli = U.finiteNumber(o.hargaPerKgAsli);
    const asliHtml = asli == null ? '—' : `<s class="price-was">${esc(U.formatRp(asli))}</s>`;
    return `
      ${row('tier.name', txt(U.tierTitle(o)))}
      <div><dt>${esc(I.t('tier.originalPerKg'))}</dt><dd>${asliHtml}</dd></div>
      <div><dt>${esc(I.t('tier.discountPerKg'))}</dt><dd class="price-off">− ${esc(U.formatRp(o.diskonTierPerKg))}</dd></div>
      ${row('tier.afterPerKg', txt(U.formatRp(o.hargaPerKg)))}`;
  }

  function goodsSubtotal(o) {
    return O.kloterOf(o).reduce((s, k) => s + (U.lineSubtotal(k) || 0), 0);
  }

  function kontrakOf(o) {
    return o.tipeBooking === 'Kontrak' ? window.AWKontrak.contractSummary(o.kontrak, O.num(o.totalHarga)) : null;
  }

  function kontrakTable(k) {
    const K = window.AWKontrak;
    const rows = k.jadwalPembayaran
      .map(
        (r) => `<tr>
          <td>${esc(r.jenis === 'DP' ? I.t('kontrak.dpN', { p: U.formatNumber(k.dpPersen) }) : K.scheduleRowLabel(r, k.jumlahBulan))}</td>
          <td>${esc(K.scheduleRowDue(r))}</td>
          <td class="num">${esc(U.formatRp(r.jumlahRp))}</td>
        </tr>`,
      )
      .join('');
    return `<h3 class="sub-title">${esc(I.t('kontrak.invoiceTitle'))}</h3>
      <div class="table-wrap kloter-table">
        <table>
          <thead><tr>
            <th>${esc(I.t('kontrak.payment'))}</th>
            <th>${esc(I.t('kontrak.due'))}</th>
            <th class="num">${esc(I.t('kontrak.amount'))}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr>
            <td colspan="2">${esc(I.t('kontrak.total'))}</td>
            <td class="num"><strong>${esc(U.formatRp(k.totalNilaiKontrak))}</strong></td>
          </tr></tfoot>
        </table>
      </div>`;
  }

  function orderCard(o) {
    const multi = O.isMultiKloter(o);
    const kontrak = kontrakOf(o);
    const tier = U.hasTierDiscount(o);
    const subtotal = U.formatRp(goodsSubtotal(o));
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
          ${row('booking.type', txt(window.AWBookingDraft.typeLabel(o.tipeBooking || 'Normal')))}
          ${
            kontrak
              ? row('kontrak.period', txt(`${window.AWKontrak.periodLabel(kontrak)} (${I.t('booking.kontrakMonths', { n: kontrak.jumlahBulan })})`)) +
                `<div><dt>${esc(I.t('kontrak.dpN', { p: U.formatNumber(kontrak.dpPersen) }))}</dt><dd>${txt(U.formatRp(kontrak.nilaiDp))}</dd></div>` +
                row('kontrak.installment', txt(I.t('kontrak.perMonthX', { amount: U.formatRp(kontrak.cicilanPerBulan), n: kontrak.jumlahBulan })))
              : ''
          }
          ${row('booking.kloterCount', txt(U.formatNumber(O.kloterOf(o).length, 0)))}
          ${row('booking.process', txt(O.processLabel(o)))}
          ${row('checkout.polygon', txt([o.namaPolygon, o.idPolygon].filter(Boolean).join(' · ')))}
          ${row('order.qtyKg', txt(U.formatNumber(o.jumlahPesananKg)))}
          ${tier ? tierRows(o) : multi ? '' : row('polygon.hargaPerKg', txt(U.formatRp(o.hargaPerKg)))}
          ${row('booking.subtotal', txt(subtotal))}
          ${row('order.tax', txt(U.formatRp(o.biayaPajak || 0)))}
          ${row('order.shipping', txt(U.formatRp(o.biayaPengiriman || 0)))}
        </dl>
        ${multi ? kloterTable(o) : ''}
        <div class="total-band"><span>${esc(I.t(kontrak ? 'kontrak.total' : 'order.total'))}</span><strong>${esc(U.formatRp(o.totalHarga))}</strong></div>
        ${kontrak ? kontrakTable(kontrak) : ''}
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
      proses: O.processLabel(o) || '—',
      kebun: (p && (p.namaKml || p.idPolygon)) || o.namaPolygon || o.idPolygon || '—',
      petani: (pt && pt.nama) || (p && p.petani) || '',
      mdpl: (p && p.mdpl) || (pt && pt.mdpl) || '',
    };
    if (params.petani && params.mdpl) return I.t('trace.sentence', params);
    return I.t('trace.sentenceShort', params);
  }

  /* Harga & tier dari objek pesanan. Field yang hanya ada di pesanan bersarang ikut dipakai, tanpa menimpa nilai yang sudah ada. */
  function orderView(payload) {
    const root = payload && typeof payload === 'object' ? payload : {};
    const base = root.order && typeof root.order === 'object' ? { ...root.order } : {};
    const sources = [base.pesanan, base.invoice && base.invoice.pesanan, root.pesanan, root.invoice && root.invoice.pesanan];
    const keys = [
      'jumlahPesananKg',
      'hargaPerKg',
      'hargaPerKgAsli',
      'diskonTierPerKg',
      'tierHarga',
      'totalHarga',
      'kloter',
      'biayaPajak',
      'biayaPengiriman',
    ];
    sources.forEach((src) => {
      if (!src || typeof src !== 'object' || Array.isArray(src)) return;
      keys.forEach((key) => {
        if (base[key] === undefined && src[key] !== undefined) base[key] = src[key];
      });
    });
    return base;
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
    const o = orderView(data);
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
          ${prosesSection(tr.prosesPengolahan, O.processLabel(o))}
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
