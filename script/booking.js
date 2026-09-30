/* Langkah Booking: pilih proses + jumlah GB → draft di sessionStorage → Checkout */
(function (global) {
  const DRAFT_KEY = 'awBookingDraft';

  function readDraft() {
    try {
      return JSON.parse(global.sessionStorage.getItem(DRAFT_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function writeDraft(draft) {
    try {
      if (draft) global.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      else global.sessionStorage.removeItem(DRAFT_KEY);
    } catch (_) {
      /* sessionStorage tidak tersedia */
    }
  }

  global.AWBookingDraft = { read: readDraft, write: writeDraft };

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('booking-root');
    if (!root) return;
    const U = global.WalidaUtils;
    const I = global.AWI18n;
    const esc = U.escapeHtml;
    const id = root.dataset.id;
    let item = null;
    let error = '';
    let formError = '';
    let values = { prosesPengolahan: '', jumlahPesananKg: '' };

    const pending = global.AWAuth.peekPendingBooking();
    const draft = readDraft();
    if (pending && pending.idPolygon === id) {
      values = { prosesPengolahan: pending.prosesPengolahan || '', jumlahPesananKg: pending.jumlahPesananKg || '' };
      global.AWAuth.clearPendingBooking();
    } else if (draft && draft.idPolygon === id) {
      values = { prosesPengolahan: draft.prosesPengolahan, jumlahPesananKg: draft.jumlahPesananKg };
    }

    function readForm() {
      const form = root.querySelector('form');
      if (!form) return;
      values = {
        prosesPengolahan: form.prosesPengolahan.value,
        jumlahPesananKg: form.jumlahPesananKg.value,
      };
    }

    function render() {
      if (error || !item) {
        root.innerHTML = `<h1>${esc(I.t('booking.title'))}</h1>
          <p class="status-box error">${esc(error || I.t('polygon.notFound'))}</p>
          <a class="btn" href="/peta">${esc(I.t('common.backToMap'))}</a>`;
        return;
      }
      const stock = U.availableStock(item);
      const proses = U.processNames(item);
      const bookable = U.canBook(item);
      root.innerHTML = `
        ${stepsHtml(2)}
        <p class="kicker">${esc(I.t('booking.kicker'))}</p>
        <h1>${esc(U.farmTitle(item))}</h1>
        <p class="lede">${esc([item.idPolygon, U.petaniNama(item)].filter(Boolean).join(' · '))}</p>
        <div class="info-grid">
          <div><span>${esc(I.t('polygon.stock'))}</span><strong>${esc(stock == null ? '—' : U.formatKg(stock))}</strong></div>
          <div><span>${esc(I.t('polygon.varietas'))}</span><strong>${esc(item.varietas || '—')}</strong></div>
        </div>
        ${
          bookable
            ? `<form class="booking-form" novalidate>
            <label>
              ${esc(I.t('booking.process'))}
              <select name="prosesPengolahan" required>
                <option value="">${esc(I.t('booking.chooseProcess'))}</option>
                ${proses.map((p) => `<option value="${esc(p)}" ${values.prosesPengolahan === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
              </select>
            </label>
            <label>
              ${esc(I.t('booking.qty'))}
              <input type="number" name="jumlahPesananKg" min="0.01" step="0.01" ${stock != null ? `max="${stock}"` : ''}
                value="${esc(values.jumlahPesananKg)}" placeholder="${esc(I.t('booking.qtyPlaceholder'))}" required />
            </label>
            ${formError ? `<p class="form-error" role="alert">${esc(formError)}</p>` : ''}
            <div class="actions">
              <button type="submit" class="btn">${esc(I.t('booking.toCheckout'))}</button>
              <a class="btn btn-ghost" href="/lahan/${encodeURIComponent(id)}">${esc(I.t('common.cancel'))}</a>
            </div>
          </form>`
            : `<p class="status-box error">${esc(I.t(U.isSoldOut(item) ? 'polygon.soldOutHint' : 'polygon.notBookableHint'))}</p>
          <a class="btn btn-ghost" href="/lahan/${encodeURIComponent(id)}">${esc(I.t('common.back'))}</a>`
        }`;
      const form = root.querySelector('form');
      if (!form) return;
      form.addEventListener('input', readForm);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        readForm();
        submit();
      });
    }

    function validate() {
      const qty = Number(values.jumlahPesananKg);
      const stock = U.availableStock(item);
      if (!values.prosesPengolahan) return I.t('booking.errProcess');
      if (!U.processNames(item).includes(values.prosesPengolahan)) return I.t('booking.errProcessInvalid');
      if (!(qty > 0)) return I.t('booking.errQty');
      if (stock != null && qty > stock) return I.t('booking.errStock', { stock: U.formatKg(stock) });
      if (!(Number(item.hargaPerKg) > 0)) return I.t('booking.errPrice');
      return '';
    }

    function submit() {
      if (!global.AWAuth.isLoggedIn()) {
        global.AWAuth.savePendingBooking({ idPolygon: id, ...values, page: location.pathname });
        location.href = global.AWAuth.loginUrl();
        return;
      }
      formError = validate();
      if (formError) {
        render();
        return;
      }
      const qty = Number(values.jumlahPesananKg);
      const harga = Number(item.hargaPerKg);
      writeDraft({
        idPolygon: item.idPolygon,
        namaPolygon: U.farmTitle(item),
        petani: U.petaniNama(item),
        jumlahPesananKg: qty,
        prosesPengolahan: values.prosesPengolahan,
        varietas: item.varietas || '',
        hargaPerKg: harga,
        productPrice: qty * harga,
        jenisKopi: item.jenisKopi || '',
      });
      location.href = `/lahan/${encodeURIComponent(id)}/checkout`;
    }

    document.addEventListener('aw:langchange', () => {
      readForm();
      if (formError) formError = validate();
      render();
    });

    (async function load() {
      try {
        item = await global.AWApi.polygon(id);
      } catch (err) {
        error = err.status === 404 ? I.t('polygon.notFound') : err.message;
      }
      render();
    })();
  });

  /* Indikator langkah Check → Booking → Checkout → Invoice */
  function stepsHtml(active) {
    const I = global.AWI18n;
    const keys = ['booking.stepCheck', 'booking.stepBooking', 'booking.stepCheckout', 'booking.stepInvoice'];
    return `<ol class="flow-steps">${keys
      .map(
        (k, i) =>
          `<li class="${i + 1 < active ? 'done' : ''}${i + 1 === active ? ' current' : ''}"><span>${i + 1}</span>${global.WalidaUtils.escapeHtml(I.t(k))}</li>`,
      )
      .join('')}</ol>`;
  }

  global.AWBookingSteps = stepsHtml;
})(window);
