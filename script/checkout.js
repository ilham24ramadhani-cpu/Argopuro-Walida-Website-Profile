/* Langkah Purchase: ringkasan kloter + pembayaran + data pembeli → POST /api/booking (Bearer token) → Invoice */
document.addEventListener('DOMContentLoaded', () => {
  const U = window.WalidaUtils;
  const I = window.AWI18n;
  const esc = U.escapeHtml;
  const root = document.getElementById('checkout-root');
  const id = root.dataset.id;
  const draft = window.AWBookingDraft.read();
  const kloter = window.AWBookingDraft.kloter(draft);
  let customer = window.AWAuth.getCustomer() || {};
  let formError = '';
  let formInfo = '';
  let submitting = false;
  let values = {
    namaPembeli: customer.nama || '',
    kontakPembeli: '',
    alamatPembeli: '',
    catatanPemesanan: '',
  };

  const pending = window.AWAuth.peekPendingBooking();
  if (pending && pending.idPolygon === id && pending.page === location.pathname) {
    Object.keys(values).forEach((k) => {
      if (pending[k]) values[k] = pending[k];
    });
    window.AWAuth.clearPendingBooking();
  }

  function readForm() {
    const form = root.querySelector('form');
    if (!form) return;
    Object.keys(values).forEach((k) => {
      values[k] = form[k].value;
    });
  }

  function kloterTableHtml() {
    const rows = kloter
      .map(
        (k, i) => `<tr>
          <td>${esc(I.t('booking.kloterN', { n: i + 1 }))}</td>
          <td>${esc(k.prosesPengolahan)}</td>
          <td class="num">${esc(U.formatKg(k.jumlahPesananKg))}</td>
        </tr>`,
      )
      .join('');
    return `<div class="table-wrap kloter-table">
        <table>
          <thead><tr>
            <th>${esc(I.t('booking.kloter'))}</th>
            <th>${esc(I.t('booking.process'))}</th>
            <th class="num">${esc(I.t('checkout.qty'))}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr>
            <td colspan="2">${esc(I.t('booking.totalQty'))}</td>
            <td class="num"><strong>${esc(U.formatKg(draft.jumlahPesananKg))}</strong></td>
          </tr></tfoot>
        </table>
      </div>`;
  }

  const K = window.AWKontrak;
  const kontrak = draft && draft.tipeBooking === 'Kontrak' ? draft.kontrak : null;

  /* Jadwal dalam persen; nominal Rupiah dihitung server dari harga per proses dan tampil di invoice */
  function kontrakScheduleHtml() {
    const plan = K.percentPlan(kontrak);
    const pct = (v) => `${U.formatNumber(v)}%`;
    const rows = [
      `<tr><td>${esc(I.t('kontrak.dp'))}</td><td>${esc(I.t('kontrak.dueOnOrder'))}</td><td class="num">${esc(pct(plan.dp))}</td></tr>`,
      ...Array.from(
        { length: plan.n },
        (_, i) => `<tr>
          <td>${esc(I.t('kontrak.installmentN', { n: i + 1, total: plan.n }))}</td>
          <td>${esc(K.monthLabel(K.addMonths(kontrak.bulanMulai, i)))}</td>
          <td class="num">${esc(pct(plan.perMonth))}</td>
        </tr>`,
      ),
    ].join('');
    return `
      <div class="info-grid">
        <div><span>${esc(I.t('kontrak.period'))}</span><strong>${esc(K.periodLabel(kontrak))}</strong><small class="d-block text-muted">${esc(I.t('booking.kontrakMonths', { n: plan.n }))}</small></div>
        <div><span>${esc(I.t('kontrak.dp'))}</span><strong>${esc(pct(plan.dp))}</strong></div>
        <div><span>${esc(I.t('kontrak.installment'))}</span><strong>${esc(pct(plan.perMonth))}</strong><small class="d-block text-muted">${esc(I.t('kontrak.timesMonths', { n: plan.n }))}</small></div>
      </div>
      <p class="kontrak-plan">${esc(I.t('kontrak.formula', { n: plan.n }))}</p>
      <div class="table-wrap kloter-table">
        <table>
          <thead><tr>
            <th>${esc(I.t('kontrak.payment'))}</th>
            <th>${esc(I.t('kontrak.due'))}</th>
            <th class="num">${esc(I.t('kontrak.share'))}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr>
            <td colspan="2">${esc(I.t('kontrak.total'))}</td>
            <td class="num"><strong>100%</strong></td>
          </tr></tfoot>
        </table>
      </div>
      <p class="form-hint">${esc(I.t('kontrak.rpHint'))}</p>`;
  }

  /* Nama perusahaan diambil dari profil (wajib) — yang tampil di peta sebagai pembeli */
  function companyHtml() {
    const editLink = `<a href="/dashboard">${esc(I.t('company.editInProfile'))}</a>`;
    if (!customer.namaPerusahaan) {
      return `<p class="status-box error" role="alert">${esc(I.t('company.missing'))} ${editLink}</p>`;
    }
    const key = customer.tipePembeli === 'Perseorangan' ? 'company.namePersonal' : 'company.nameCompany';
    return `<div class="info-grid"><div><span>${esc(I.t(key))}</span><strong>${esc(customer.namaPerusahaan)}</strong><small class="d-block text-muted">${editLink}</small></div></div>`;
  }

  function render() {
    if (!draft || draft.idPolygon !== id || !kloter.length || (draft.tipeBooking === 'Kontrak' && !kontrak)) {
      root.innerHTML = `
        <h1>${esc(I.t('checkout.title'))}</h1>
        <p class="status-box error">${esc(I.t('checkout.noDraft'))}</p>
        <a class="btn" href="/lahan/${encodeURIComponent(id)}">${esc(I.t('checkout.backToPolygon'))}</a>`;
      return;
    }
    const field = (name, key, type) => {
      const common = `name="${name}" ${type === 'optional' ? '' : 'required'}`;
      const input =
        type === 'textarea' || type === 'optional'
          ? `<textarea ${common} rows="${type === 'optional' ? 2 : 3}">${esc(values[name])}</textarea>`
          : `<input type="text" ${common} value="${esc(values[name])}" />`;
      return `<label>${esc(I.t(key))}${input}</label>`;
    };
    root.innerHTML = `
      ${window.AWBookingSteps(3)}
      <p class="kicker">${esc(I.t('checkout.kicker'))}</p>
      <h1>${esc(I.t('checkout.title'))}</h1>
      <section class="section-block">
        <h2>${esc(I.t('checkout.summary'))}</h2>
        <div class="info-grid">
          <div><span>${esc(I.t('checkout.polygon'))}</span><strong>${esc(draft.namaPolygon || draft.idPolygon)}</strong><small class="d-block text-muted">${esc(draft.idPolygon)}</small></div>
          ${draft.petani ? `<div><span>${esc(I.t('polygon.farmer'))}</span><strong>${esc(draft.petani)}</strong></div>` : ''}
          <div><span>${esc(I.t('booking.type'))}</span><strong>${esc(window.AWBookingDraft.typeLabel(draft.tipeBooking))}</strong></div>
          <div><span>${esc(I.t('booking.kloterCount'))}</span><strong>${esc(U.formatNumber(kloter.length, 0))}</strong></div>
        </div>
        ${kloterTableHtml()}
      </section>
      <section class="section-block">
        <h2>${esc(I.t('checkout.payment'))}</h2>
        ${kontrak ? kontrakScheduleHtml() : ''}
        <p class="payment-box">${esc(root.dataset.payment)}</p>
      </section>
      <form class="booking-form" novalidate>
        <h2>${esc(I.t('checkout.buyer'))}</h2>
        ${companyHtml()}
        ${field('namaPembeli', 'checkout.name')}
        ${field('kontakPembeli', 'checkout.contact')}
        ${field('alamatPembeli', 'checkout.address', 'textarea')}
        ${field('catatanPemesanan', 'checkout.note', 'optional')}
        ${formInfo ? `<p class="status-box" role="status">${esc(formInfo)}</p>` : ''}
        ${formError ? `<p class="form-error" role="alert">${esc(formError)}</p>` : ''}
        <div class="actions">
          <button type="submit" class="btn" ${submitting ? 'disabled' : ''}>${esc(I.t(submitting ? 'checkout.submitting' : 'checkout.submit'))}</button>
          <a class="btn btn-ghost" href="/lahan/${encodeURIComponent(id)}/booking">${esc(I.t('common.back'))}</a>
        </div>
      </form>`;
    root.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      readForm();
      submit();
    });
  }

  function saveAndLogin(message) {
    window.AWAuth.savePendingBooking({
      idPolygon: id,
      tipeBooking: draft.tipeBooking,
      kloter,
      kontrak,
      ...values,
      page: location.pathname,
    });
    formError = '';
    formInfo = message;
    render();
    setTimeout(() => {
      location.href = window.AWAuth.loginUrl();
    }, 1600);
  }

  function invoiceId(res) {
    const inv = (res && res.invoice) || res || {};
    return inv.idPembelian || (res && res.idPembelian) || '';
  }

  async function submit() {
    if (submitting) return;
    if (!values.namaPembeli.trim() || !values.kontakPembeli.trim() || !values.alamatPembeli.trim()) {
      formError = I.t('checkout.errRequired');
      render();
      return;
    }
    if (!window.AWAuth.isLoggedIn()) {
      saveAndLogin(I.t('checkout.sessionExpired'));
      return;
    }
    if (!customer.namaPerusahaan) {
      formError = I.t('company.missing');
      render();
      return;
    }
    const body = {
      idPolygon: draft.idPolygon,
      tipeBooking: draft.tipeBooking || 'Normal',
      kloter: kloter.map((k) => ({ prosesPengolahan: k.prosesPengolahan, jumlahPesananKg: k.jumlahPesananKg })),
      jumlahPesananKg: draft.jumlahPesananKg,
      namaPembeli: values.namaPembeli.trim(),
      kontakPembeli: values.kontakPembeli.trim(),
      alamatPembeli: values.alamatPembeli.trim(),
      tipePemesanan: 'E-commerce',
      tipeProduk: 'Green Beans',
      biayaPengiriman: 0,
      biayaPajak: 0,
      tipePajak: 'penjumlahan',
    };
    // Hanya untuk 1 kloter: API lama (tanpa dukungan kloter[]) menolak pesanan multi-kloter, bukan salah hitung
    if (kloter.length === 1) body.prosesPengolahan = kloter[0].prosesPengolahan;
    if (kontrak) {
      body.kontrak = { bulanMulai: kontrak.bulanMulai, bulanSelesai: kontrak.bulanSelesai, dpPersen: kontrak.dpPersen };
    }
    if (draft.varietas) body.varietas = draft.varietas;
    if (draft.jenisKopi) body.jenisKopi = draft.jenisKopi;
    if (values.catatanPemesanan.trim()) body.catatanPemesanan = values.catatanPemesanan.trim();

    submitting = true;
    formError = '';
    render();
    try {
      const res = await window.AWApi.booking(body);
      window.AWBookingDraft.write(null);
      try {
        sessionStorage.setItem('awLastInvoice', JSON.stringify(res));
      } catch (_) {
        /* sessionStorage tidak tersedia */
      }
      location.href = `/invoice/${encodeURIComponent(invoiceId(res) || 'baru')}`;
    } catch (err) {
      submitting = false;
      if (err.status === 401) {
        window.AWAuth.clear();
        saveAndLogin(I.t('checkout.sessionExpired'));
        return;
      }
      formError = I.apiError(err.message);
      render();
    }
  }

  document.addEventListener('aw:langchange', () => {
    readForm();
    render();
  });
  render();

  if (window.AWAuth.isLoggedIn()) {
    window.AWApi.request('/api/public/customer/me', { auth: true, handle401: false })
      .then((res) => {
        const fresh = (res && res.customer) || res;
        if (!fresh || submitting) return;
        customer = fresh;
        window.AWAuth.setSession({ customer });
        readForm();
        render();
      })
      .catch(() => {});
  }
});
