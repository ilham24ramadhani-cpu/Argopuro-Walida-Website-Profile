/* /dashboard/pesanan: filter (status ke API, tanggal & kata kunci di browser), rekap, daftar, export */
document.addEventListener('DOMContentLoaded', () => {
  const U = window.WalidaUtils;
  const I = window.AWI18n;
  const O = window.AWOrders;
  const esc = U.escapeHtml;
  const form = document.getElementById('order-filters');
  const summaryEl = document.getElementById('order-summary');
  const statusEl = document.getElementById('order-status');
  const listEl = document.getElementById('order-list');
  const FILTER_KEYS = ['statusPemesanan', 'statusPembayaran', 'dari', 'sampai', 'q'];

  let orders = [];
  let loaded = false;
  let error = '';
  let requestSeq = 0;

  function readFilters() {
    return Object.fromEntries(FILTER_KEYS.map((k) => [k, form[k].value.trim()]));
  }

  function writeUrl(f) {
    const q = new URLSearchParams();
    FILTER_KEYS.forEach((k) => f[k] && q.set(k, f[k]));
    const s = q.toString();
    history.replaceState(null, '', s ? `?${s}` : location.pathname);
  }

  function ymd(value) {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(value || ''));
    return m ? m[1] : '';
  }

  function filtered() {
    const f = readFilters();
    const q = f.q.toLowerCase();
    return orders.filter((o) => {
      const d = ymd(o.tanggalPemesanan);
      if (f.dari && (!d || d < f.dari)) return false;
      if (f.sampai && (!d || d > f.sampai)) return false;
      if (q) {
        const hay = [o.idPembelian, o.namaPolygon, o.idPolygon, o.prosesPengolahan, o.varietas].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function hasFilters() {
    const f = readFilters();
    return FILTER_KEYS.some((k) => f[k]);
  }

  function detailUrl(o) {
    return `/dashboard/pesanan/${encodeURIComponent(o.idPembelian)}`;
  }

  function renderSummary(list) {
    const s = O.summarize(list);
    const stat = (key, value) => `<div class="stat"><span>${esc(I.t(key))}</span><strong>${esc(value)}</strong></div>`;
    const counts = (kind, statuses, map) =>
      statuses
        .map((st) => `<span class="count-pill">${U.badgeHtml(kind, st)} <strong>${esc(U.formatNumber(map[st] || 0, 0))}</strong></span>`)
        .join('');
    summaryEl.innerHTML = `
      <div class="stat-grid">
        ${stat('dashboard.stats.totalOrders', U.formatNumber(s.count, 0))}
        ${stat('dashboard.stats.totalKg', U.formatKg(s.totalKg))}
        ${stat('dashboard.stats.totalValue', U.formatRp(s.totalHarga))}
      </div>
      <div class="dash-card count-rows">
        <div><span class="count-label">${esc(I.t('order.statusOrder'))}</span>${counts('order', O.ORDER_STATUSES, s.byOrder)}</div>
        <div><span class="count-label">${esc(I.t('order.statusPayment'))}</span>${counts('payment', O.PAYMENT_STATUSES, s.byPayment)}</div>
      </div>`;
  }

  function petakText(o) {
    return [o.namaPolygon, o.idPolygon].filter(Boolean).join(' · ') || '—';
  }

  function renderList(list) {
    if (!list.length) {
      listEl.innerHTML = hasFilters()
        ? `<div class="empty-state"><p>${esc(I.t('dashboard.orders.noMatch'))}</p></div>`
        : `<div class="empty-state">
            <p class="empty-state-icon" aria-hidden="true">📦</p>
            <p>${esc(I.t('dashboard.orders.empty'))}</p>
            <a class="btn" href="/peta">${esc(I.t('dashboard.orders.startBooking'))}</a>
          </div>`;
      return;
    }
    const th = (key, cls) => `<th class="${cls || ''}">${esc(I.t(key))}</th>`;
    const rows = list
      .map(
        (o) => `
        <tr tabindex="0" data-href="${esc(detailUrl(o))}">
          <td><a href="${esc(detailUrl(o))}" class="order-id">${esc(o.idPembelian)}</a></td>
          <td>${esc(I.formatDate(o.tanggalPemesanan, { month: 'short' }))}</td>
          <td>${esc(petakText(o))}</td>
          <td>${esc(o.prosesPengolahan || '—')}</td>
          <td>${esc(o.varietas || '—')}</td>
          <td class="num">${esc(U.formatNumber(o.jumlahPesananKg))}</td>
          <td class="num">${esc(U.formatRp(o.hargaPerKg))}</td>
          <td class="num"><strong>${esc(U.formatRp(o.totalHarga))}</strong></td>
          <td>${U.badgeHtml('order', o.statusPemesanan)}</td>
          <td>${U.badgeHtml('payment', o.statusPembayaran)}</td>
        </tr>`,
      )
      .join('');
    const cards = list
      .map(
        (o) => `
        <a class="order-card" href="${esc(detailUrl(o))}">
          <div class="order-card-head">
            <strong>${esc(o.idPembelian)}</strong>
            <span>${esc(I.formatDate(o.tanggalPemesanan, { month: 'short' }))}</span>
          </div>
          <p>${esc(petakText(o))}</p>
          <p class="order-card-meta">${esc([o.prosesPengolahan, o.varietas].filter(Boolean).join(' · '))}</p>
          <div class="order-card-foot">
            <span>${esc(U.formatKg(o.jumlahPesananKg))} × ${esc(U.formatRp(o.hargaPerKg))}</span>
            <strong>${esc(U.formatRp(o.totalHarga))}</strong>
          </div>
          <div class="order-card-badges">${U.badgeHtml('order', o.statusPemesanan)} ${U.badgeHtml('payment', o.statusPembayaran)}</div>
        </a>`,
      )
      .join('');
    listEl.innerHTML = `
      <div class="table-wrap order-table">
        <table>
          <thead><tr>
            ${th('order.id')}${th('order.date')}${th('checkout.polygon')}${th('booking.process')}${th('polygon.varietas')}
            ${th('order.qtyKg', 'num')}${th('polygon.hargaPerKg', 'num')}${th('order.total', 'num')}
            ${th('order.statusOrder')}${th('order.statusPayment')}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="order-cards">${cards}</div>`;
    listEl.querySelectorAll('tr[data-href]').forEach((tr) => {
      const go = () => {
        location.href = tr.dataset.href;
      };
      tr.addEventListener('click', (e) => {
        if (!e.target.closest('a')) go();
      });
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') go();
      });
    });
  }

  function render() {
    if (!loaded) return;
    if (error) {
      statusEl.hidden = false;
      statusEl.classList.add('error');
      statusEl.textContent = error;
      summaryEl.innerHTML = '';
      listEl.innerHTML = '';
      return;
    }
    statusEl.hidden = true;
    const list = filtered();
    renderSummary(list);
    renderList(list);
  }

  async function load() {
    const f = readFilters();
    const seq = ++requestSeq;
    statusEl.hidden = false;
    statusEl.classList.remove('error');
    statusEl.textContent = I.t('common.loading');
    try {
      const data = await window.AWApi.orders({
        statusPemesanan: f.statusPemesanan,
        statusPembayaran: f.statusPembayaran,
      });
      if (seq !== requestSeq) return;
      orders = Array.isArray(data) ? data : [];
      error = '';
    } catch (err) {
      if (seq !== requestSeq) return;
      error = I.apiError(err.message);
    }
    loaded = true;
    render();
  }

  /* ——— Export (data yang sedang terfilter) ——— */

  function exportColumns() {
    const st = (kind) => (o) => I.statusLabel(kind, o[kind === 'order' ? 'statusPemesanan' : 'statusPembayaran']);
    const n = (field) => (o) => O.num(o[field]);
    return [
      ['order.id', (o) => o.idPembelian || ''],
      ['order.date', (o) => ymd(o.tanggalPemesanan)],
      ['polygon.idPolygon', (o) => o.idPolygon || ''],
      ['order.polygonName', (o) => o.namaPolygon || ''],
      ['booking.process', (o) => o.prosesPengolahan || ''],
      ['polygon.varietas', (o) => o.varietas || ''],
      ['order.product', (o) => o.tipeProduk || ''],
      ['order.qtyKg', n('jumlahPesananKg')],
      ['order.pricePerKgIdr', n('hargaPerKg')],
      ['order.taxIdr', n('biayaPajak')],
      ['order.shippingIdr', n('biayaPengiriman')],
      ['order.totalIdr', n('totalHarga')],
      ['order.statusOrder', st('order')],
      ['order.statusPayment', st('payment')],
    ];
  }

  function exportRows(list) {
    const cols = exportColumns();
    return [cols.map(([k]) => I.t(k)), ...list.map((o) => cols.map(([, get]) => get(o)))];
  }

  function recapRows(list) {
    const s = O.summarize(list);
    const rows = [
      [I.t('dashboard.export.metric'), I.t('dashboard.export.value')],
      [I.t('dashboard.stats.totalOrders'), s.count],
      [I.t('dashboard.stats.totalKg'), s.totalKg],
      [I.t('dashboard.stats.totalValueIdr'), s.totalHarga],
    ];
    O.ORDER_STATUSES.forEach((st) => rows.push([`${I.t('order.statusOrder')}: ${I.statusLabel('order', st)}`, s.byOrder[st] || 0]));
    O.PAYMENT_STATUSES.forEach((st) => rows.push([`${I.t('order.statusPayment')}: ${I.statusLabel('payment', st)}`, s.byPayment[st] || 0]));
    return rows;
  }

  function fileName(ext) {
    const c = window.AWAuth.getCustomer() || {};
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `rekap-pesanan-${(c.username || 'customer').replace(/[^\w.-]/g, '')}-${stamp}.${ext}`;
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvCell(v) {
    if (typeof v === 'number') return String(v);
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function exportCsv() {
    const csv = exportRows(filtered()).map((r) => r.map(csvCell).join(',')).join('\r\n');
    download(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }), fileName('csv'));
  }

  function exportXlsx() {
    const X = window.XLSX;
    if (!X) {
      alert(I.t('dashboard.export.xlsxNotReady'));
      return;
    }
    const list = filtered();
    const wb = X.utils.book_new();
    const sheet = X.utils.aoa_to_sheet(exportRows(list));
    sheet['!cols'] = exportColumns().map(([k]) => ({ wch: Math.max(12, I.t(k).length + 2) }));
    X.utils.book_append_sheet(wb, sheet, I.t('dashboard.export.sheetOrders'));
    const recap = X.utils.aoa_to_sheet(recapRows(list));
    recap['!cols'] = [{ wch: 36 }, { wch: 18 }];
    X.utils.book_append_sheet(wb, recap, I.t('dashboard.export.sheetRecap'));
    X.writeFile(wb, fileName('xlsx'));
  }

  document.querySelector('[data-export="csv"]').addEventListener('click', exportCsv);
  document.querySelector('[data-export="xlsx"]').addEventListener('click', exportXlsx);

  /* ——— Filter ——— */

  const params = new URLSearchParams(location.search);
  FILTER_KEYS.forEach((k) => {
    if (params.get(k)) form[k].value = params.get(k);
  });

  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('change', (e) => {
    writeUrl(readFilters());
    if (e.target.name === 'statusPemesanan' || e.target.name === 'statusPembayaran') load();
    else render();
  });
  form.q.addEventListener('input', () => {
    writeUrl(readFilters());
    render();
  });
  form.querySelector('[data-reset]').addEventListener('click', () => {
    form.reset();
    writeUrl(readFilters());
    load();
  });
  document.addEventListener('aw:langchange', render);

  load();
});
