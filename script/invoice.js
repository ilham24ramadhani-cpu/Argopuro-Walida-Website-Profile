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

  function opt(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  /* invoice.pesanan menang; field yang tidak ada di sana diambil dari pemesanan (POST). */
  function mergeRow(primary, extra) {
    const a = primary && typeof primary === 'object' ? primary : {};
    const b = extra && typeof extra === 'object' ? extra : {};
    return { ...b, ...a };
  }

  function tierOf(raw) {
    const tier = raw && raw.tierHarga;
    if (!tier || typeof tier !== 'object' || Array.isArray(tier)) return null;
    return {
      label: tier.label || '',
      nomorTier: tier.nomorTier,
      dariKg: tier.dariKg,
      sampaiKg: tier.sampaiKg,
      diskonPerKg: tier.diskonPerKg,
    };
  }

  function normalize(payload) {
    if (!payload) return null;
    const raw = payload.invoice || payload;
    if (!raw || !(raw.idPembelian || raw.pembeli || raw.pesanan || payload.pemesanan)) return null;
    const pembeli = raw.pembeli || payload.pembeli || {};
    const p = raw.pesanan || {};
    const alt = payload.pemesanan && typeof payload.pemesanan === 'object' ? payload.pemesanan : {};
    const merged = mergeRow(p, alt);
    const pKloter = Array.isArray(p.kloter) && p.kloter.length ? p.kloter : null;
    const aKloter = Array.isArray(alt.kloter) && alt.kloter.length ? alt.kloter : null;
    const rows = pKloter
      ? pKloter.map((k, i) => mergeRow(k, aKloter ? aKloter[i] : null))
      : aKloter
        ? aKloter.slice()
        : [merged];
    const kloter = rows.map((k, i) => {
      const berat = num(k.jumlahPesananKg);
      const harga = num(k.hargaPerKg);
      const sub = U.lineSubtotal(k);
      return {
        kloter: k.kloter || i + 1,
        prosesPengolahan: k.prosesPengolahan || '—',
        jumlahPesananKg: berat,
        hargaPerKg: harga,
        subtotal: sub == null ? 0 : sub,
      };
    });
    const subtotal = kloter.reduce((s, k) => s + k.subtotal, 0);
    const totalSrc = Object.prototype.hasOwnProperty.call(p, 'totalHarga') ? p.totalHarga : merged.totalHarga;
    const totalHarga = totalSrc !== undefined && totalSrc !== null && totalSrc !== '' ? num(totalSrc) : subtotal;
    const tipeBooking = merged.tipeBooking || 'Normal';
    const tierHarga = tierOf(merged);
    const diskonTierPerKg = opt(merged.diskonTierPerKg);
    return {
      idPembelian: raw.idPembelian || payload.idPembelian || '—',
      tanggalPemesanan: raw.tanggalPemesanan || payload.tanggalPemesanan || '',
      statusPembayaran: raw.statusPembayaran || payload.statusPembayaran || 'Belum Lunas',
      statusPemesanan: raw.statusPemesanan || payload.statusPemesanan || 'Ordering',
      keteranganPembayaran: (raw.keteranganPembayaran || payload.keteranganPembayaran || '').trim(),
      pembeli,
      pesanan: {
        idPolygon: merged.idPolygon || '',
        petakLabel: [merged.namaPolygon, merged.idPolygon].filter((x) => x && String(x).trim()).join(' · ') || '—',
        tipeBooking,
        kloter,
        jumlahPesananKg:
          merged.jumlahPesananKg !== undefined && merged.jumlahPesananKg !== null && merged.jumlahPesananKg !== ''
            ? num(merged.jumlahPesananKg)
            : kloter.reduce((s, k) => s + k.jumlahPesananKg, 0),
        subtotal,
        totalHarga,
        tierHarga,
        diskonTierPerKg,
        kontrak: tipeBooking === 'Kontrak' ? window.AWKontrak.contractSummary(merged.kontrak || raw.kontrak, totalHarga) : null,
        tipeProduk: merged.tipeProduk || 'Green Beans',
        varietas: merged.varietas || '—',
        biayaPajak: num(merged.biayaPajak),
        biayaPengiriman: num(merged.biayaPengiriman),
      },
    };
  }

  function kontrakSectionHtml(k) {
    const K = window.AWKontrak;
    const rp = (n) => U.formatRp(n);
    return `
        <section class="inv-section">
          <h2>${esc(I.t('kontrak.invoiceTitle'))}</h2>
          <div class="inv-table-wrap">
            <table class="inv-table">
              <thead><tr>
                <th>${esc(I.t('kontrak.payment'))}</th>
                <th>${esc(I.t('kontrak.due'))}</th>
                <th class="num">${esc(I.t('kontrak.amount'))}</th>
              </tr></thead>
              <tbody>${k.jadwalPembayaran
                .map(
                  (row) => `<tr>
                <td>${esc(row.jenis === 'DP' ? I.t('kontrak.dpN', { p: U.formatNumber(k.dpPersen) }) : K.scheduleRowLabel(row, k.jumlahBulan))}</td>
                <td>${esc(K.scheduleRowDue(row))}</td>
                <td class="num">${esc(rp(row.jumlahRp))}</td>
              </tr>`,
                )
                .join('')}</tbody>
            </table>
          </div>
          <div class="inv-summary inv-summary--wide">
            <div><span>${esc(I.t('kontrak.period'))}</span><strong>${esc(K.periodLabel(k))}</strong></div>
            <div><span>${esc(I.t('kontrak.total'))}</span><strong>${esc(rp(k.totalNilaiKontrak))}</strong></div>
            <div><span>${esc(I.t('kontrak.dpN', { p: U.formatNumber(k.dpPersen) }))}</span><strong>${esc(rp(k.nilaiDp))}</strong></div>
            <div><span>${esc(I.t('kontrak.remaining'))}</span><strong>${esc(rp(k.sisaPembayaran))}</strong></div>
            <div><span>${esc(I.t('kontrak.installment'))}</span><strong>${esc(I.t('kontrak.perMonthX', { amount: rp(k.cicilanPerBulan), n: k.jumlahBulan }))}</strong></div>
          </div>
        </section>`;
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
            <div><span>${esc(I.t('booking.type'))}</span><strong>${esc(window.AWBookingDraft.typeLabel(p.tipeBooking))}</strong></div>
            <div><span>${esc(I.t('booking.kloterCount'))}</span><strong>${esc(U.formatNumber(p.kloter.length, 0))}</strong></div>
            ${
              p.kontrak
                ? `<div><span>${esc(I.t('kontrak.period'))}</span><strong>${esc(window.AWKontrak.periodLabel(p.kontrak))} (${esc(I.t('booking.kontrakMonths', { n: p.kontrak.jumlahBulan }))})</strong></div>
                   <div><span>${esc(I.t('kontrak.dp'))}</span><strong>${esc(U.formatNumber(p.kontrak.dpPersen))}%</strong></div>`
                : ''
            }
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
                <th>${esc(I.t('booking.kloter'))}</th>
                <th>${esc(I.t('order.product'))}</th>
                <th>${esc(I.t('polygon.varietas'))}</th>
                <th>${esc(I.t('booking.process'))}</th>
                <th>${esc(I.t('checkout.polygon'))}</th>
                <th>${esc(I.t('order.weightKg'))}</th>
                <th>${esc(I.t('polygon.hargaPerKg'))}</th>
                <th>${esc(I.t('booking.subtotal'))}</th>
              </tr></thead>
              <tbody>${p.kloter
                .map(
                  (k) => `<tr>
                <td>${esc(k.kloter)}</td>
                <td>${esc(p.tipeProduk)}</td>
                <td>${esc(p.varietas)}</td>
                <td>${esc(k.prosesPengolahan)}</td>
                <td>${esc(p.petakLabel)}</td>
                <td class="num">${esc(U.formatNumber(k.jumlahPesananKg, 2))}</td>
                <td class="num">${esc(fmt(k.hargaPerKg))}</td>
                <td class="num">${esc(fmt(k.subtotal))}</td>
              </tr>`,
                )
                .join('')}</tbody>
            </table>
          </div>
          <div class="inv-summary${U.hasTierDiscount(p) ? ' inv-summary--tier' : ''}">
            <div><span>${esc(I.t('booking.totalQty'))}</span><strong>${esc(U.formatKg(p.jumlahPesananKg))}</strong></div>
            <div><span>${esc(I.t('booking.subtotal'))}</span><strong>${esc(fmt(p.subtotal))}</strong></div>
            ${
              U.hasTierDiscount(p)
                ? `<div class="inv-discount"><strong>${esc(I.t('tier.invoiceDiscount', { label: String(p.tierHarga.label || '').trim() }).trim())}</strong><small>${esc(U.tierNote(p))}</small></div>`
                : ''
            }
            ${
              p.biayaPajak > 0 || p.biayaPengiriman > 0
                ? `<div><span>${esc(I.t('order.tax'))}</span><strong>${esc(fmt(p.biayaPajak))}</strong></div>
                   <div><span>${esc(I.t('order.shipping'))}</span><strong>${esc(fmt(p.biayaPengiriman))}</strong></div>`
                : ''
            }
            <div class="inv-total-band"><span>${esc(I.t(p.kontrak ? 'kontrak.invoiceTotal' : 'invoice.total'))}</span><strong>${esc(U.formatRp(p.totalHarga))}</strong></div>
          </div>
        </section>
        ${p.kontrak ? kontrakSectionHtml(p.kontrak) : ''}
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
