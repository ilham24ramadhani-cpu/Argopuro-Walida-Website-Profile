/* Detail petak (panel peta & halaman /lahan/<id>) + tombol Booking yang wajib login */
(function (global) {
  const U = global.WalidaUtils;
  const I = global.AWI18n;
  const esc = U.escapeHtml;

  const LOCK_ICON =
    '<svg class="icon-lock" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"/></svg>';

  function lahanUrl(id) {
    return `/lahan/${encodeURIComponent(id)}`;
  }

  function bookingUrl(id) {
    return `${lahanUrl(id)}/booking`;
  }

  function statusBadge(item) {
    const soldOut = U.isSoldOut(item);
    return `<span class="stock-badge ${soldOut ? 'stock-badge--habis' : 'stock-badge--ok'}">${esc(
      I.t(soldOut ? 'polygon.soldOut' : 'polygon.available'),
    )}</span>`;
  }

  function stockText(item) {
    const stock = U.availableStock(item);
    if (stock == null) return '—';
    const total = item.potentialGb;
    return total != null && total !== ''
      ? I.t('polygon.stockOf', { stock: U.formatKg(stock), total: U.formatKg(total) })
      : U.formatKg(stock);
  }

  function prosesChips(item) {
    const list = U.processNames(item);
    if (!list.length) return '—';
    return `<span class="chip-list">${list.map((p) => `<span class="proses-chip">${esc(p)}</span>`).join('')}</span>`;
  }

  /* Tombol booking: login → ke form booking; belum login → "Masuk untuk Booking"; habis → disabled */
  function bookButtonHtml(item, cls) {
    const id = U.farmId(item);
    if (!U.canBook(item)) {
      const why = U.isSoldOut(item) ? 'polygon.soldOutHint' : 'polygon.notBookableHint';
      return `<button type="button" class="btn ${cls || ''}" disabled>${esc(I.t('polygon.book'))}</button>
        <p class="form-hint">${esc(I.t(why))}</p>`;
    }
    if (!global.AWAuth.isLoggedIn()) {
      return `<button type="button" class="btn ${cls || ''}" data-login-book="${esc(id)}">${LOCK_ICON}${esc(I.t('polygon.loginToBook'))}</button>
        <p class="form-hint">${esc(I.t('auth.noAccount'))} <a href="${esc(global.AWAuth.loginUrl(null, 'signup'))}" data-signup-book="${esc(id)}">${esc(I.t('auth.signupLink'))}</a></p>`;
    }
    return `<a class="btn ${cls || ''}" href="${bookingUrl(id)}">${esc(I.t('polygon.book'))}</a>`;
  }

  function rowsHtml(item) {
    const rows = [
      ['polygon.idPolygon', esc(item.idPolygon || '—')],
      ['polygon.namaKml', esc(item.namaKml || '—')],
      ['polygon.varietas', esc(item.varietas || '—')],
      ['polygon.mdpl', esc(U.formatMdpl(item.mdpl))],
      ['polygon.luas', esc(U.formatHa(U.landAreaHa(item)))],
      ['polygon.proses', prosesChips(item)],
      ['polygon.hargaPerKg', esc(Number(item.hargaPerKg) > 0 ? U.formatRp(item.hargaPerKg) : '—')],
      ['polygon.stock', esc(stockText(item))],
      ['polygon.cherry', esc(U.formatKg(item.jumlahCherry))],
    ];
    return rows.map(([k, v]) => `<div><dt>${esc(I.t(k))}</dt><dd>${v}</dd></div>`).join('');
  }

  function pembeliHtml(item) {
    const list = Array.isArray(item.pembeliBooking) ? item.pembeliBooking : [];
    if (!list.length) return '';
    return `<div class="pembeli-block"><h4>${esc(I.t('polygon.buyers'))}</h4><ul>${list
      .map(
        (p) =>
          `<li><strong>${esc(p.namaPembeli || '—')}</strong><span>${esc(p.prosesPengolahan || '—')}</span><span>${esc(U.formatKg(p.jumlahPesananKg))}</span></li>`,
      )
      .join('')}</ul></div>`;
  }

  function petaniHtml(item, size) {
    const nama = U.petaniNama(item);
    return `
      <div class="petani-block">
        ${U.avatarHtml(U.petaniFotoUrl(item), nama || '?', `petani-avatar petani-avatar--${size}`)}
        <div class="petani-block-text">
          <span class="petani-label">${esc(I.t('polygon.farmer'))}</span>
          <strong>${esc(nama || '—')}</strong>
          ${item.idPetani ? `<span class="petani-id">${esc(item.idPetani)}</span>` : ''}
        </div>
      </div>`;
  }

  function prosesSection(item, prosesList) {
    const matches = global.AWProses ? global.AWProses.forPolygon(item, prosesList) : [];
    if (!matches.length) return '';
    return `<section class="detail-proses">
        <h4>${esc(I.t('process.forPolygon'))}</h4>
        <div class="proses-grid proses-grid--compact">${matches.map((p, i) => global.AWProses.cardHtml(p, i)).join('')}</div>
      </section>`;
  }

  /* Panel di halaman peta */
  function panelHtml(item, opts) {
    const o = opts || {};
    const id = U.farmId(item);
    return `
      <header>
        <button type="button" class="detail-close" aria-label="${esc(I.t('common.close'))}" data-close>×</button>
        <div class="detail-code">${esc(item.idPolygon || '')}</div>
        <strong>${esc(U.farmTitle(item))}</strong>
        <div>${statusBadge(item)}</div>
      </header>
      ${petaniHtml(item, 'md')}
      <dl>${rowsHtml(item)}</dl>
      ${pembeliHtml(item)}
      <div class="detail-actions">
        ${bookButtonHtml(item, 'btn-block')}
        <a class="btn btn-ghost btn-block" href="${lahanUrl(id)}">${esc(I.t('polygon.viewDetail'))}</a>
        ${o.waHref ? `<a class="btn btn-ghost btn-block" href="${esc(o.waHref)}" target="_blank" rel="noopener" data-wa-open>${esc(I.t('polygon.askAdmin'))}</a>` : ''}
      </div>
      ${prosesSection(item, o.prosesList)}`;
  }

  /* Halaman /lahan/<id> */
  function pageHtml(item, opts) {
    const o = opts || {};
    return `
      <p class="kicker">${esc(I.t('polygon.kicker'))}</p>
      <h1>${esc(U.farmTitle(item))}</h1>
      <p class="lede">${esc(item.idPolygon || '')} ${statusBadge(item)}</p>
      <div class="petani-hero">${petaniHtml(item, 'lg')}</div>
      <dl class="detail-dl">${rowsHtml(item)}</dl>
      ${pembeliHtml(item)}
      <div class="actions">
        ${bookButtonHtml(item)}
        <a class="btn btn-ghost" href="/peta">${esc(I.t('common.backToMap'))}</a>
      </div>
      ${prosesSection(item, o.prosesList)}`;
  }

  /* Pasang handler: tombol login-untuk-booking & Selengkapnya proses */
  function bind(root, item, opts) {
    const o = opts || {};
    const pending = () =>
      global.AWAuth.savePendingBooking({
        idPolygon: U.farmId(item),
        page: global.location.pathname,
      });
    root.querySelectorAll('[data-login-book]').forEach((btn) =>
      btn.addEventListener('click', () => {
        pending();
        global.location.href = global.AWAuth.loginUrl();
      }),
    );
    root.querySelectorAll('[data-signup-book]').forEach((a) => a.addEventListener('click', pending));
    if (global.AWProses) global.AWProses.bindMore(root, global.AWProses.forPolygon(item, o.prosesList));
    const close = root.querySelector('[data-close]');
    if (close && o.onClose) close.addEventListener('click', o.onClose);
  }

  global.AWPolygonDetail = { panelHtml, pageHtml, bind, bookButtonHtml, lahanUrl, bookingUrl, statusBadge };
})(window);
