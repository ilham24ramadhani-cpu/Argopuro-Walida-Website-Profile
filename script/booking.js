/* Langkah Booking: tipe pemesanan → (Kontrak: periode + DP) → jumlah kloter → proses + kg GB per kloter → draft di sessionStorage → Purchase */
(function (global) {
  const DRAFT_KEY = 'awBookingDraft';

  /* Tipe pemesanan yang tersedia (nilai dikirim ke API sebagai tipeBooking) */
  const BOOKING_TYPES = [
    { value: 'Normal', labelKey: 'booking.typeNormal', descKey: 'booking.typeNormalDesc' },
    { value: 'Kontrak', labelKey: 'booking.typeKontrak', descKey: 'booking.typeKontrakDesc' },
  ];

  /* Kontrak: batas harus sama dengan admin (BOOKING_KONTRAK_* di API) */
  const KONTRAK = {
    DP_MIN: 30,
    DP_MAX: 70,
    DP_OPTIONS: [30, 35, 40, 45, 50, 55, 60, 65, 70],
    MAX_MONTHS: 24,
    START_WINDOW: 12,
  };

  function parseMonth(key) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null;
    return { y: Number(m[1]), m: Number(m[2]) };
  }

  function monthKey(y, m) {
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  function currentMonth() {
    const d = new Date();
    return monthKey(d.getFullYear(), d.getMonth() + 1);
  }

  function addMonths(key, n) {
    const p = parseMonth(key);
    if (!p) return '';
    const idx = p.y * 12 + (p.m - 1) + n;
    return monthKey(Math.floor(idx / 12), (idx % 12) + 1);
  }

  /* Inklusif: Januari–Mei = 5 bulan */
  function monthCount(start, end) {
    const a = parseMonth(start);
    const b = parseMonth(end);
    if (!a || !b) return 0;
    return (b.y - a.y) * 12 + (b.m - a.m) + 1;
  }

  function monthLabel(key) {
    const p = parseMonth(key);
    if (!p) return key || '—';
    return new Intl.DateTimeFormat(global.AWI18n.locale(), { month: 'long', year: 'numeric' }).format(new Date(p.y, p.m - 1, 1));
  }

  function periodLabel(k) {
    return k ? `${monthLabel(k.bulanMulai)} – ${monthLabel(k.bulanSelesai)}` : '—';
  }

  /* Porsi persen (tanpa harga): DP + sisa dibagi rata per bulan */
  function percentPlan(k) {
    const n = monthCount(k.bulanMulai, k.bulanSelesai);
    const dp = Number(k.dpPersen) || 0;
    const rest = 100 - dp;
    return { n, dp, rest, perMonth: n > 0 ? rest / n : 0 };
  }

  /* Sama dengan _jadwal_pembayaran_kontrak di API; dipakai bila respons lama belum memuat jadwalPembayaran */
  function computeSchedule(total, k) {
    const n = monthCount(k.bulanMulai, k.bulanSelesai);
    const t = Math.round((Number(total) || 0) * 100) / 100;
    const dp = Math.round(t * Number(k.dpPersen)) / 100;
    const sisa = Math.round((t - dp) * 100) / 100;
    const cicilan = n > 0 ? Math.floor(sisa / n) : 0;
    const rows = [{ ke: 0, jenis: 'DP', bulan: '', jumlahRp: dp }];
    for (let i = 0; i < n; i += 1) {
      rows.push({
        ke: i + 1,
        jenis: 'Cicilan',
        bulan: addMonths(k.bulanMulai, i),
        jumlahRp: i < n - 1 ? cicilan : Math.round((sisa - cicilan * (n - 1)) * 100) / 100,
      });
    }
    return { totalNilaiKontrak: t, nilaiDp: dp, sisaPembayaran: sisa, cicilanPerBulan: cicilan, jadwalPembayaran: rows };
  }

  /* Data kontrak dari API (atau draft) → angka lengkap untuk invoice / detail pesanan */
  function contractSummary(k, total) {
    if (!k || !parseMonth(k.bulanMulai) || !parseMonth(k.bulanSelesai)) return null;
    const base = {
      bulanMulai: k.bulanMulai,
      bulanSelesai: k.bulanSelesai,
      jumlahBulan: Number(k.jumlahBulan) || monthCount(k.bulanMulai, k.bulanSelesai),
      dpPersen: Number(k.dpPersen) || 0,
    };
    if (Array.isArray(k.jadwalPembayaran) && k.jadwalPembayaran.length) {
      return {
        ...base,
        totalNilaiKontrak: Number(k.totalNilaiKontrak ?? total) || 0,
        nilaiDp: Number(k.nilaiDp) || 0,
        sisaPembayaran: Number(k.sisaPembayaran) || 0,
        cicilanPerBulan: Number(k.cicilanPerBulan) || 0,
        jadwalPembayaran: k.jadwalPembayaran,
      };
    }
    return { ...base, ...computeSchedule(total, base) };
  }

  function scheduleRowLabel(row, n) {
    const I = global.AWI18n;
    return row.jenis === 'DP' ? I.t('kontrak.dp') : I.t('kontrak.installmentN', { n: row.ke, total: n });
  }

  function scheduleRowDue(row) {
    return row.jenis === 'DP' ? global.AWI18n.t('kontrak.dueOnOrder') : monthLabel(row.bulan);
  }

  global.AWKontrak = {
    ...KONTRAK,
    parseMonth,
    currentMonth,
    addMonths,
    monthCount,
    monthLabel,
    periodLabel,
    percentPlan,
    contractSummary,
    scheduleRowLabel,
    scheduleRowDue,
  };

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
    const K = global.AWKontrak;
    const emptyKontrak = () => ({ bulanMulai: '', bulanSelesai: '', dpPersen: 0 });
    let values = { tipeBooking: '', jumlahKloter: 0, kloter: [], kontrak: emptyKontrak() };

    function restore(src) {
      const kloter = draftKloter(src).map((k) => ({
        prosesPengolahan: k.prosesPengolahan || '',
        jumlahPesananKg: k.jumlahPesananKg ?? '',
      }));
      const k = src.kontrak || {};
      values = {
        tipeBooking: src.tipeBooking || (kloter.length ? BOOKING_TYPES[0].value : ''),
        jumlahKloter: kloter.length,
        kloter,
        kontrak: { bulanMulai: k.bulanMulai || '', bulanSelesai: k.bulanSelesai || '', dpPersen: Number(k.dpPersen) || 0 },
      };
    }

    const isKontrak = () => values.tipeBooking === 'Kontrak';

    function kontrakPeriodError() {
      const k = values.kontrak;
      if (!k.bulanMulai || !k.bulanSelesai) return I.t('booking.errKontrakPeriod');
      const n = K.monthCount(k.bulanMulai, k.bulanSelesai);
      if (k.bulanMulai < K.currentMonth() || n < 1 || n > K.MAX_MONTHS) {
        return I.t('booking.errKontrakRange', { max: K.MAX_MONTHS });
      }
      return '';
    }

    function kontrakDpValid() {
      const dp = Number(values.kontrak.dpPersen);
      return dp >= K.DP_MIN && dp <= K.DP_MAX;
    }

    /* Kloter baru tampil setelah syarat tipe pemesanan terpenuhi (Kontrak: periode + DP) */
    function typeReady() {
      if (!values.tipeBooking) return false;
      return !isKontrak() || (!kontrakPeriodError() && kontrakDpValid());
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
      const mulai = form.querySelector('[name="kontrakMulai"]');
      const selesai = form.querySelector('[name="kontrakSelesai"]');
      if (mulai) values.kontrak.bulanMulai = mulai.value;
      if (selesai) values.kontrak.bulanSelesai = selesai.value;
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

    function monthOptions(from, count, selected) {
      return Array.from({ length: count }, (_, i) => K.addMonths(from, i))
        .map((m) => `<option value="${esc(m)}" ${m === selected ? 'selected' : ''}>${esc(K.monthLabel(m))}</option>`)
        .join('');
    }

    function kontrakPeriodStepHtml(n) {
      const k = values.kontrak;
      const months = K.monthCount(k.bulanMulai, k.bulanSelesai);
      const ok = !kontrakPeriodError();
      return `
        <fieldset class="booking-step">
          ${stepHead(n, 'booking.stepKontrakPeriod')}
          <div class="kontrak-period">
            <label>
              ${esc(I.t('booking.kontrakStart'))}
              <select name="kontrakMulai" required>
                <option value="">${esc(I.t('booking.chooseMonth'))}</option>
                ${monthOptions(K.currentMonth(), K.START_WINDOW, k.bulanMulai)}
              </select>
            </label>
            <label>
              ${esc(I.t('booking.kontrakEnd'))}
              <select name="kontrakSelesai" required ${k.bulanMulai ? '' : 'disabled'}>
                <option value="">${esc(I.t('booking.chooseMonth'))}</option>
                ${k.bulanMulai ? monthOptions(k.bulanMulai, K.MAX_MONTHS, k.bulanSelesai) : ''}
              </select>
            </label>
          </div>
          ${
            ok
              ? `<div class="kloter-total"><span>${esc(I.t('booking.kontrakDuration'))}</span><strong>${esc(I.t('booking.kontrakMonths', { n: months }))}</strong><small>${esc(K.periodLabel(k))}</small></div>`
              : ''
          }
          <p class="form-hint">${esc(I.t('booking.kontrakPeriodHint', { max: K.MAX_MONTHS }))}</p>
        </fieldset>`;
    }

    function kontrakDpStepHtml(n) {
      const k = values.kontrak;
      const plan = K.percentPlan(k);
      return `
        <fieldset class="booking-step">
          ${stepHead(n, 'booking.stepKontrakDp')}
          <div class="kloter-count" role="radiogroup">
            ${K.DP_OPTIONS.map(
              (dp) =>
                `<button type="button" class="kloter-count-btn${k.dpPersen === dp ? ' active' : ''}" data-dp="${dp}" role="radio" aria-checked="${k.dpPersen === dp}">${dp}%</button>`,
            ).join('')}
          </div>
          <p class="form-hint">${esc(I.t('booking.kontrakDpHint', { min: K.DP_MIN, max: K.DP_MAX }))}</p>
          ${
            kontrakDpValid()
              ? `<p class="kontrak-plan">${esc(
                  I.t('booking.kontrakPlan', {
                    dp: U.formatNumber(plan.dp),
                    rest: U.formatNumber(plan.rest),
                    n: plan.n,
                    per: U.formatNumber(plan.perMonth),
                  }),
                )}</p>`
              : ''
          }
        </fieldset>`;
    }

    function countStepHtml(n) {
      const max = maxKloter();
      return `
        <fieldset class="booking-step">
          ${stepHead(n, 'booking.stepKloterCount')}
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

    function kloterStepHtml(n) {
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
          ${stepHead(n, 'booking.stepKloterDetail')}
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
            ${isKontrak() ? kontrakPeriodStepHtml(2) : ''}
            ${isKontrak() && !kontrakPeriodError() ? kontrakDpStepHtml(3) : ''}
            ${typeReady() ? countStepHtml(isKontrak() ? 4 : 2) : ''}
            ${typeReady() && values.jumlahKloter ? kloterStepHtml(isKontrak() ? 5 : 3) : ''}
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
        const name = e.target.name || '';
        if (name === 'tipeBooking' || name === 'kontrakMulai' || name === 'kontrakSelesai' || name.startsWith('proses-')) {
          readForm();
          if (name === 'kontrakMulai') {
            const k = values.kontrak;
            const n = K.monthCount(k.bulanMulai, k.bulanSelesai);
            if (!k.bulanMulai || n < 1 || n > K.MAX_MONTHS) k.bulanSelesai = '';
          }
          formError = '';
          render();
        }
      });
      form.querySelectorAll('[data-dp]').forEach((btn) =>
        btn.addEventListener('click', () => {
          readForm();
          values.kontrak.dpPersen = Number(btn.dataset.dp);
          formError = '';
          render();
        }),
      );
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
      if (isKontrak()) {
        const periodErr = kontrakPeriodError();
        if (periodErr) return periodErr;
        if (!kontrakDpValid()) return I.t('booking.errKontrakDp', { min: K.DP_MIN, max: K.DP_MAX });
      }
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
          kontrak: isKontrak() ? values.kontrak : null,
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
        kontrak: isKontrak()
          ? {
              bulanMulai: values.kontrak.bulanMulai,
              bulanSelesai: values.kontrak.bulanSelesai,
              jumlahBulan: K.monthCount(values.kontrak.bulanMulai, values.kontrak.bulanSelesai),
              dpPersen: values.kontrak.dpPersen,
            }
          : null,
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
