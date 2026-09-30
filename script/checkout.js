/* Langkah Checkout: data pembeli → POST /api/booking (Bearer token) → Invoice */
document.addEventListener('DOMContentLoaded', () => {
  const U = window.WalidaUtils;
  const I = window.AWI18n;
  const esc = U.escapeHtml;
  const root = document.getElementById('checkout-root');
  const id = root.dataset.id;
  const draft = window.AWBookingDraft.read();
  const customer = window.AWAuth.getCustomer() || {};
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

  function render() {
    if (!draft || draft.idPolygon !== id) {
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
          <div><span>${esc(I.t('booking.process'))}</span><strong>${esc(draft.prosesPengolahan)}</strong></div>
          <div><span>${esc(I.t('checkout.qty'))}</span><strong>${esc(U.formatKg(draft.jumlahPesananKg))}</strong></div>
        </div>
      </section>
      <section class="section-block">
        <h2>${esc(I.t('checkout.payment'))}</h2>
        <p class="payment-box">${esc(root.dataset.payment)}</p>
      </section>
      <form class="booking-form" novalidate>
        <h2>${esc(I.t('checkout.buyer'))}</h2>
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
      prosesPengolahan: draft.prosesPengolahan,
      jumlahPesananKg: draft.jumlahPesananKg,
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
    const body = {
      idPolygon: draft.idPolygon,
      jumlahPesananKg: draft.jumlahPesananKg,
      prosesPengolahan: draft.prosesPengolahan,
      namaPembeli: values.namaPembeli.trim(),
      kontakPembeli: values.kontakPembeli.trim(),
      alamatPembeli: values.alamatPembeli.trim(),
      tipePemesanan: 'E-commerce',
      tipeProduk: 'Green Beans',
      biayaPengiriman: 0,
      biayaPajak: 0,
      tipePajak: 'penjumlahan',
    };
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
});
