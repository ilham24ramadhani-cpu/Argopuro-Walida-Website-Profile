/* Invoice booking: dari respons POST /api/booking (sessionStorage) atau GET /api/booking/<id> */
document.addEventListener('DOMContentLoaded', () => {
  const U = window.WalidaUtils;
  const I = window.AWI18n;
  const APP = window.APP || {};
  const esc = U.escapeHtml;
  const root = document.getElementById('invoice-root');
  const id = root.dataset.id;
  let inv = null;
  let error = '';

  function num(v) {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }

  function normalize(payload) {
    if (!payload) return null;
    const raw = payload.invoice || payload;
    if (!raw || !(raw.idPembelian || raw.pembeli || raw.pesanan)) return null;
    const pembeli = raw.pembeli || {};
    const p = raw.pesanan || {};
    const berat = num(p.jumlahPesananKg);
    const harga = num(p.hargaPerKg);
    const subtotal = Math.round(berat * harga * 100) / 100;
    return {
      idPembelian: raw.idPembelian || '—',
      tanggalPemesanan: raw.tanggalPemesanan || '',
      statusPembayaran: raw.statusPembayaran || 'Belum Lunas',
      statusPemesanan: raw.statusPemesanan || 'Ordering',
      keteranganPembayaran: (raw.keteranganPembayaran || '').trim(),
      pembeli,
      pesanan: {
        idPolygon: p.idPolygon || '',
        petakLabel: [p.namaPolygon, p.idPolygon].filter((x) => x && String(x).trim()).join(' · ') || '—',
        prosesPengolahan: p.prosesPengolahan || '—',
        jumlahPesananKg: berat,
        hargaPerKg: harga,
        subtotal,
        totalHarga: p.totalHarga !== undefined && p.totalHarga !== null && p.totalHarga !== '' ? num(p.totalHarga) : subtotal,
        tipeProduk: p.tipeProduk || 'Green Beans',
        varietas: p.varietas || '—',
        biayaPajak: num(p.biayaPajak),
        biayaPengiriman: num(p.biayaPengiriman),
      },
    };
  }

  function render() {
    if (error && !inv) {
      root.innerHTML = `<h1>Invoice</h1><p class="status-box error">${esc(error)}</p>
        <a class="btn" href="/peta">${esc(I.t('common.backToMap'))}</a>`;
      return;
    }
    if (!inv) return;
    const L = APP.letterhead || {};
    const p = inv.pesanan;
    const fmt = (n) => U.formatNumber(n, 0);
    const pembayaran = inv.keteranganPembayaran || APP.paymentDefault || '';
    root.innerHTML = `
      <div class="invoice-toolbar no-print">
        <div>
          <p class="kicker">${esc(I.t('invoice.kicker'))}</p>
          <h1 class="invoice-page-title">${esc(inv.idPembelian)}</h1>
        </div>
        <div class="invoice-actions">
          <button type="button" class="btn btn-invoice" data-print>${esc(I.t('invoice.print'))}</button>
          <a class="btn" href="/dashboard/pesanan/${encodeURIComponent(inv.idPembelian)}">${esc(I.t('invoice.viewInOrders'))}</a>
          <a class="btn btn-ghost" href="/peta">${esc(I.t('common.backToMap'))}</a>
          ${p.idPolygon ? `<a class="btn btn-ghost" href="/peta?polygon=${encodeURIComponent(p.idPolygon)}">${esc(I.t('invoice.viewPolygon'))}</a>` : ''}
        </div>
      </div>
      <article class="inv-doc" id="invoice-print-area">
        <header class="inv-kop">
          <img class="inv-logo" src="${esc(APP.logoUrl)}" alt="" />
          <div class="inv-kop-right">
            <strong class="inv-brand">${esc(L.nama)}</strong>
            <p>${esc(I.t('invoice.contact'))}: ${esc(L.kontak)}</p>
            <p>${esc(L.alamat)}</p>
          </div>
        </header>
        <hr class="inv-rule" />
        <h1 class="inv-title">${esc(I.t('invoice.docTitle'))}</h1>
        <p class="inv-subtitle">${esc(I.t('invoice.docSubtitle'))}</p>
        <section class="inv-ringkas">
          <h2>${esc(I.t('invoice.summary'))}</h2>
          <div class="inv-ringkas-grid">
            <div><span>${esc(I.t('order.id'))}</span><strong>${esc(inv.idPembelian)}</strong></div>
            <div><span>${esc(I.t('order.statusOrder'))}</span>${U.badgeHtml('order', inv.statusPemesanan)}</div>
            <div><span>${esc(I.t('order.date'))}</span><strong>${esc(I.formatDate(inv.tanggalPemesanan))}</strong></div>
            <div><span>${esc(I.t('order.statusPayment'))}</span>${U.badgeHtml('payment', inv.statusPembayaran)}</div>
          </div>
        </section>
        <section class="inv-section">
          <h2>${esc(I.t('invoice.buyer'))}</h2>
          <dl class="inv-dl">
            <div><dt>${esc(I.t('checkout.name'))}</dt><dd>${esc(inv.pembeli.namaPembeli || '—')}</dd></div>
            <div><dt>${esc(I.t('checkout.contact'))}</dt><dd>${esc(inv.pembeli.kontakPembeli || '—')}</dd></div>
            <div><dt>${esc(I.t('checkout.address'))}</dt><dd>${esc(inv.pembeli.alamatPembeli || '—')}</dd></div>
          </dl>
        </section>
        <section class="inv-section">
          <h2>${esc(I.t('invoice.order'))}</h2>
          <div class="inv-table-wrap">
            <table class="inv-table">
              <thead><tr>
                <th>${esc(I.t('order.product'))}</th>
                <th>${esc(I.t('polygon.varietas'))}</th>
                <th>${esc(I.t('booking.process'))}</th>
                <th>${esc(I.t('checkout.polygon'))}</th>
                <th>${esc(I.t('order.weightKg'))}</th>
                <th>${esc(I.t('polygon.hargaPerKg'))}</th>
                <th>${esc(I.t('booking.subtotal'))}</th>
              </tr></thead>
              <tbody><tr>
                <td>${esc(p.tipeProduk)}</td>
                <td>${esc(p.varietas)}</td>
                <td>${esc(p.prosesPengolahan)}</td>
                <td>${esc(p.petakLabel)}</td>
                <td class="num">${esc(U.formatNumber(p.jumlahPesananKg, 2))}</td>
                <td class="num">${esc(fmt(p.hargaPerKg))}</td>
                <td class="num">${esc(fmt(p.subtotal))}</td>
              </tr></tbody>
            </table>
          </div>
          <div class="inv-summary">
            ${
              p.biayaPajak > 0 || p.biayaPengiriman > 0
                ? `<div><span>${esc(I.t('order.tax'))}</span><strong>${esc(fmt(p.biayaPajak))}</strong></div>
                   <div><span>${esc(I.t('order.shipping'))}</span><strong>${esc(fmt(p.biayaPengiriman))}</strong></div>`
                : ''
            }
            <div class="inv-total-band"><span>${esc(I.t('invoice.total'))}</span><strong>${esc(U.formatRp(p.totalHarga))}</strong></div>
          </div>
        </section>
        <section class="inv-pay">
          <h2>${esc(I.t('invoice.paymentInfo'))}</h2>
          <p>${esc(pembayaran)}</p>
        </section>
        <footer class="inv-foot">
          <p>${esc(I.t('invoice.footer'))}</p>
          <p class="inv-print-date">${esc(I.t('invoice.printed'))}: ${esc(I.formatDate(new Date()))}</p>
        </footer>
      </article>`;
    root.querySelector('[data-print]').addEventListener('click', () => window.print());
  }

  document.addEventListener('aw:langchange', render);

  (async function load() {
    try {
      const cached = normalize(JSON.parse(sessionStorage.getItem('awLastInvoice') || 'null'));
      if (cached && (id === 'baru' || cached.idPembelian === id)) inv = cached;
    } catch (_) {
      /* cache tidak valid */
    }
    if (inv) {
      render();
      return;
    }
    try {
      inv = normalize(await window.AWApi.invoice(id));
      if (!inv) error = I.t('invoice.notFound');
    } catch (err) {
      error = err.status === 404 ? I.t('invoice.notFound') : I.apiError(err.message);
    }
    render();
  })();
});
