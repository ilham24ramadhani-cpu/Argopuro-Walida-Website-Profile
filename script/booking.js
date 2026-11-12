/* Langkah Booking: tipe pemesanan → jumlah kloter → proses + kg GB per kloter → draft di sessionStorage → Purchase */
(function (global) {
  const DRAFT_KEY = 'awBookingDraft';

  /* Tipe pemesanan yang tersedia (nilai dikirim ke API sebagai tipeBooking) */
  const BOOKING_TYPES = [{ value: 'Normal', labelKey: 'booking.typeNormal', descKey: 'booking.typeNormalDesc' }];

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

  /* Draft lama (sebelum multi-kloter) disimpan dengan proses + kg di root */
  function draftKloter(draft) {
    if (!draft) return [];
    if (Array.isArray(draft.kloter) && draft.kloter.length) return draft.kloter;
    return draft.prosesPengolahan ? [{ prosesPengolahan: draft.prosesPengolahan, jumlahPesananKg: draft.jumlahPesananKg }] : [];
  }

  function typeLabel(value) {
    const t = BOOKING_TYPES.find((x) => x.value === value);
    return t ? global.AWI18n.t(t.labelKey) : value || '—';
  }

  global.AWBookingDraft = { read: readDraft, write: writeDraft, kloter: draftKloter, typeLabel };

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
    let values = { tipeBooking: '', jumlahKloter: 0, kloter: [] };

    function restore(src) {
      const kloter = draftKloter(src).map((k) => ({
        prosesPengolahan: k.prosesPengolahan || '',
        jumlahPesananKg: k.jumlahPesananKg ?? '',
      }));
      values = {
        tipeBooking: src.tipeBooking || (kloter.length ? BOOKING_TYPES[0].value : ''),
        jumlahKloter: kloter.length,
        kloter,
      };
    }

    const pending = global.AWAuth.peekPendingBooking();
    const draft = readDraft();
    if (pending && pending.idPolygon === id) {
      restore(pending);
      global.AWAuth.clearPendingBooking();
    } else if (draft && draft.idPolygon === id) {
      restore(draft);
    }

    function maxKloter() {
      return U.processNames(item).length;
    }

    function setKloterCount(n) {
      values.jumlahKloter = n;
      values.kloter = Array.from({ length: n }, (_, i) => values.kloter[i] || { prosesPengolahan: '', jumlahPesananKg: '' });
    }

    function totalKg() {
      return values.kloter.reduce((sum, k) => sum + (Number(k.jumlahPesananKg) || 0), 0);
    }

    function readForm() {
      const form = root.querySelector('form');
      if (!form) return;
      const type = form.querySelector('input[name="tipeBooking"]:checked');
      values.tipeBooking = type ? type.value : '';
      values.kloter.forEach((k, i) => {
        const proses = form.querySelector(`[name="proses-${i}"]`);
        const qty = form.querySelector(`[name="qty-${i}"]`);
        if (proses) k.prosesPengolahan = proses.value;
        if (qty) k.jumlahPesananKg = qty.value;
      });
    }

    function stepHead(n, key) {
      return `<legend class="booking-step-head"><span>${n}</span>${esc(I.t(key))}</legend>`;
    }

    function typeStepHtml() {
      return `
        <fieldset class="booking-step">
          ${stepHead(1, 'booking.stepType')}
          <div class="choice-grid">
            ${BOOKING_TYPES.map(
              (t) => `
              <label class="choice-card">
                <input type="radio" name="tipeBooking" value="${esc(t.value)}" ${values.tipeBooking === t.value ? 'checked' : ''} />
                <span class="choice-card-body">
                  <strong>${esc(I.t(t.labelKey))}</strong>
                  <small>${esc(I.t(t.descKey))}</small>
                </span>
              </label>`,
            ).join('')}
          </div>
        </fieldset>`;
    }

    function countStepHtml() {
      const max = maxKloter();
      return `
        <fieldset class="booking-step">
          ${stepHead(2, 'booking.stepKloterCount')}
          <div class="kloter-count" role="radiogroup">
            ${Array.from({ length: max }, (_, i) => i + 1)
              .map(
                (n) =>
                  `<button type="button" class="kloter-count-btn${values.jumlahKloter === n ? ' active' : ''}" data-count="${n}" role="radio" aria-checked="${values.jumlahKloter === n}">${n}</button>`,
              )
              .join('')}
          </div>
          <p class="form-hint">${esc(I.t('booking.kloterCountHint', { max }))}</p>
        </fieldset>`;
    }

    function kloterStepHtml() {
      const proses = U.processNames(item);
      const stock = U.availableStock(item);
      const cards = values.kloter
        .map((k, i) => {
          const takenElsewhere = values.kloter.filter((_, j) => j !== i).map((x) => x.prosesPengolahan);
          return `
          <div class="kloter-card">
            <p class="kloter-card-title">${esc(I.t('booking.kloterN', { n: i + 1 }))}</p>
            <label>
              ${esc(I.t('booking.process'))}
              <select name="proses-${i}" required>
                <option value="">${esc(I.t('booking.chooseProcess'))}</option>
                ${proses
                  .map(
                    (p) =>
                      `<option value="${esc(p)}" ${k.prosesPengolahan === p ? 'selected' : ''} ${takenElsewhere.includes(p) ? 'disabled' : ''}>${esc(p)}</option>`,
                  )
                  .join('')}
              </select>
            </label>
            <label>
              ${esc(I.t('booking.qty'))}
              <input type="number" name="qty-${i}" min="0.01" step="0.01" ${stock != null ? `max="${stock}"` : ''}
                value="${esc(k.jumlahPesananKg)}" placeholder="${esc(I.t('booking.qtyPlaceholder'))}" required />
            </label>
          </div>`;
        })
        .join('');
      return `
        <fieldset class="booking-step">
          ${stepHead(3, 'booking.stepKloterDetail')}
          <p class="form-hint">${esc(I.t('booking.kloterDetailHint'))}</p>
          <div class="kloter-grid">${cards}</div>
          <div class="kloter-total">
            <span>${esc(I.t('booking.totalQty'))}</span>
            <strong data-total>${esc(U.formatKg(totalKg()))}</strong>
            ${stock != null ? `<small>${esc(I.t('booking.ofStock', { stock: U.formatKg(stock) }))}</small>` : ''}
          </div>
        </fieldset>`;
    }

    function render() {
      if (error || !item) {
        root.innerHTML = `<h1>${esc(I.t('booking.title'))}</h1>
          <p class="status-box error">${esc(error || I.t('polygon.notFound'))}</p>
          <a class="btn" href="/peta">${esc(I.t('common.backToMap'))}</a>`;
        return;
      }
      const stock = U.availableStock(item);
      const bookable = U.canBook(item) && maxKloter() > 0;
      const notBookableKey = U.isSoldOut(item) ? 'polygon.soldOutHint' : 'polygon.notBookableHint';
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
            ${typeStepHtml()}
            ${values.tipeBooking ? countStepHtml() : ''}
            ${values.tipeBooking && values.jumlahKloter ? kloterStepHtml() : ''}
            ${formError ? `<p class="form-error" role="alert">${esc(formError)}</p>` : ''}
            <div class="actions">
              <button type="submit" class="btn">${esc(I.t('booking.toCheckout'))}</button>
              <a class="btn btn-ghost" href="/lahan/${encodeURIComponent(id)}">${esc(I.t('common.cancel'))}</a>
            </div>
          </form>`
            : `<p class="status-box error">${esc(I.t(notBookableKey))}</p>
          <a class="btn btn-ghost" href="/lahan/${encodeURIComponent(id)}">${esc(I.t('common.back'))}</a>`
        }`;
      const form = root.querySelector('form');
      if (!form) return;
      form.addEventListener('input', (e) => {
        readForm();
        if (formError) {
          formError = '';
          const alert = form.querySelector('.form-error');
          if (alert) alert.remove();
        }
        if (e.target.name && e.target.name.startsWith('qty-')) {
          form.querySelector('[data-total]').textContent = U.formatKg(totalKg());
        }
      });
      form.addEventListener('change', (e) => {
        if (e.target.name === 'tipeBooking' || (e.target.name && e.target.name.startsWith('proses-'))) {
          readForm();
          formError = '';
          render();
        }
      });
      form.querySelectorAll('[data-count]').forEach((btn) =>
        btn.addEventListener('click', () => {
          readForm();
          setKloterCount(Number(btn.dataset.count));
          formError = '';
          render();
        }),
      );
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        readForm();
        submit();
      });
    }

    function validate() {
      const stock = U.availableStock(item);
      const proses = U.processNames(item);
      if (!BOOKING_TYPES.some((t) => t.value === values.tipeBooking)) return I.t('booking.errType');
      if (!(values.jumlahKloter > 0)) return I.t('booking.errKloterCount');
      const seen = new Set();
      for (let i = 0; i < values.kloter.length; i += 1) {
        const k = values.kloter[i];
        const prefix = I.t('booking.kloterN', { n: i + 1 });
        if (!k.prosesPengolahan) return `${prefix}: ${I.t('booking.errProcess')}`;
        if (!proses.includes(k.prosesPengolahan)) return `${prefix}: ${I.t('booking.errProcessInvalid')}`;
        if (seen.has(k.prosesPengolahan)) return `${prefix}: ${I.t('booking.errProcessDuplicate')}`;
        seen.add(k.prosesPengolahan);
        if (!(Number(k.jumlahPesananKg) > 0)) return `${prefix}: ${I.t('booking.errQty')}`;
      }
      if (stock != null && totalKg() > stock) return I.t('booking.errStock', { stock: U.formatKg(stock) });
      if (!(Number(item.hargaPerKg) > 0)) return I.t('booking.errPrice');
      return '';
    }

    function submit() {
      if (!global.AWAuth.isLoggedIn()) {
        global.AWAuth.savePendingBooking({
          idPolygon: id,
          tipeBooking: values.tipeBooking,
          kloter: values.kloter,
          page: location.pathname,
        });
        location.href = global.AWAuth.loginUrl();
        return;
      }
      formError = validate();
      if (formError) {
        render();
        return;
      }
      const kloter = values.kloter.map((k, i) => ({
        kloter: i + 1,
        prosesPengolahan: k.prosesPengolahan,
        jumlahPesananKg: Math.round(Number(k.jumlahPesananKg) * 100) / 100,
      }));
      writeDraft({
        idPolygon: item.idPolygon,
        namaPolygon: U.farmTitle(item),
        petani: U.petaniNama(item),
        tipeBooking: values.tipeBooking,
        kloter,
        jumlahPesananKg: Math.round(kloter.reduce((s, k) => s + k.jumlahPesananKg, 0) * 100) / 100,
        varietas: item.varietas || '',
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
      if (item && values.jumlahKloter > maxKloter()) setKloterCount(maxKloter());
      render();
    })();
  });

  /* Indikator langkah Pilih petak → Booking → Purchase → Invoice */
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
