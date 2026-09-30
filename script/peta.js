/* Peta kebun: filter MDPL/proses, PolygonMap (MapLibre 2D/3D), panel detail petak + Booking */
document.addEventListener('DOMContentLoaded', () => {
  const U = window.WalidaUtils;
  const I = window.AWI18n;
  const D = window.AWPolygonDetail;
  const APP = window.APP || {};
  const esc = U.escapeHtml;
  const statusEl = document.getElementById('peta-status');
  const listEl = document.getElementById('farm-list');
  const panelEl = document.getElementById('detail-panel');
  const mdplEl = document.getElementById('filter-mdpl');
  const prosesEl = document.getElementById('filter-proses');
  const toolbar = document.querySelector('.map-pane [data-map-toolbar]');
  const legend = document.querySelector('.map-pane .map-legend');

  let items = [];
  let prosesList = [];
  let selectedId = null;
  let selected = null;
  let map = null;
  let statusKey = 'peta.loading';
  let statusText = '';

  function setStatus(key, isError, rawText) {
    statusKey = key;
    statusText = rawText || '';
    if (!key && !rawText) {
      statusEl.hidden = true;
      statusEl.textContent = '';
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = rawText || I.t(key);
    statusEl.classList.toggle('error', !!isError);
  }

  function waText(item) {
    return I.t('wa.polygon', {
      company: APP.companyName || '',
      id: item.idPolygon || '',
      name: U.farmTitle(item),
    }).replace(/\s+/g, ' ');
  }

  function waHref(item) {
    if (!APP.waUrl) return '';
    return `${APP.waUrl}?text=${encodeURIComponent(waText(item))}`;
  }

  function syncWaContext(item) {
    if (!window.WaChat) return;
    if (item) window.WaChat.setContext(waText(item), I.t('wa.chipPolygon', { id: item.idPolygon || U.farmTitle(item) }));
    else window.WaChat.resetContext();
  }

  function filteredItems() {
    const mdplFilter = mdplEl.value;
    const prosesFilter = prosesEl.value;
    return items.filter((item) => {
      if (mdplFilter !== '' && Number(item.mdpl) !== Number(mdplFilter)) return false;
      if (prosesFilter && !U.processNames(item).includes(prosesFilter)) return false;
      return true;
    });
  }

  function fillProsesOptions() {
    const set = new Set();
    items.forEach((item) => U.processNames(item).forEach((p) => set.add(p)));
    const current = prosesEl.value;
    prosesEl.innerHTML = `<option value="">${esc(I.t('common.all'))}</option>`;
    Array.from(set)
      .sort((a, b) => a.localeCompare(b, I.locale()))
      .forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        prosesEl.appendChild(opt);
      });
    if (set.has(current)) prosesEl.value = current;
  }

  function farmItemHtml(item) {
    const soldOut = U.isSoldOut(item);
    const sub = [item.idPolygon, item.namaKml].filter(Boolean).join(' · ');
    const meta = [U.formatMdpl(item.mdpl), U.formatHa(U.landAreaHa(item)), item.varietas].filter((x) => x && x !== '—');
    const stock = U.availableStock(item);
    return `
      <span class="farm-swatch" style="background:${esc(U.polygonColor(item))}"></span>
      ${U.avatarHtml(U.petaniFotoUrl(item), U.petaniNama(item) || '?', 'petani-avatar petani-avatar--sm')}
      <span class="farm-item-text">
        <strong>${esc(U.farmTitle(item))}</strong>
        <span>${esc(sub)}</span>
        <span class="farm-item-meta">${esc(meta.join(' · '))}</span>
        <span class="farm-item-stock">
          <span class="stock-badge ${soldOut ? 'stock-badge--habis' : 'stock-badge--ok'}">${esc(I.t(soldOut ? 'polygon.soldOut' : 'polygon.available'))}</span>
          ${stock != null ? `<span>${esc(U.formatKg(stock))}</span>` : ''}        </span>
      </span>`;
  }

  function renderList(fit) {
    const filtered = filteredItems();
    listEl.innerHTML = '';
    if (!filtered.length) {
      listEl.hidden = true;
      if (items.length) setStatus('peta.noMatch', false);
      renderMap(filtered, fit);
      return;
    }
    if (!statusEl.classList.contains('error')) setStatus('', false);
    listEl.hidden = false;
    filtered.forEach((item) => {
      const id = U.farmId(item);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `farm-item${selectedId === id ? ' active' : ''}`;
      btn.innerHTML = farmItemHtml(item);
      btn.addEventListener('click', () => onSelect(id));
      listEl.appendChild(btn);
    });
    renderMap(filtered, fit);
  }

  function closePanel() {
    selectedId = null;
    selected = null;
    renderPanel(null);
    renderList();
    if (map) map.focus(null);
  }

  function renderPanel(item) {
    syncWaContext(item);
    if (!item) {
      panelEl.hidden = true;
      panelEl.innerHTML = '';
      return;
    }
    panelEl.hidden = false;
    panelEl.innerHTML = D.panelHtml(item, { waHref: waHref(item), prosesList });
    D.bind(panelEl, item, { prosesList, onClose: closePanel });
  }

  function renderMap(filtered, fit) {
    if (!map) {
      map = window.PolygonMap.create('map', filtered, {
        selectedId,
        fitPadding: () => ({
          top: toolbar.offsetTop + toolbar.offsetHeight + 16,
          bottom: (legend ? legend.offsetHeight + 40 : 0) + 16,
          left: 32,
          right: !panelEl.hidden && window.innerWidth > 860 ? panelEl.offsetWidth + 72 : 56,
        }),
        onSelect: (item) => onSelect(U.farmId(item)),
      });
      window.PolygonMap.bindControls(map, toolbar, { fullsizeTarget: toolbar.parentElement });
      return;
    }
    map.update(filtered, { fit: !!fit, animate: fit !== 'instant' });
  }

  async function onSelect(id) {
    selectedId = id;
    selected = items.find((i) => U.farmId(i) === id) || null;
    renderPanel(selected);
    renderList();
    if (map) map.focus(id);
    if (!id) return;
    try {
      const detail = await window.AWApi.polygon(id);
      if (selectedId !== id || !detail) return;
      selected = { ...selected, ...detail };
      items = items.map((p) => (U.farmId(p) === id ? selected : p));
      renderPanel(selected);
      renderList();
    } catch (_) {
      /* tetap pakai data dari daftar */
    }
  }

  /* Kembali dari login lewat tombol "Masuk untuk Booking": buka lagi petak yang dipilih */
  function restoreSelection() {
    const pending = window.AWAuth.peekPendingBooking();
    const fromQuery = new URLSearchParams(location.search).get('polygon');
    let id = fromQuery;
    if (pending && pending.page === location.pathname && window.AWAuth.isLoggedIn()) {
      id = pending.idPolygon;
      window.AWAuth.clearPendingBooking();
    }
    if (id && items.some((i) => U.farmId(i) === id)) onSelect(id);
  }

  mdplEl.addEventListener('change', () => renderList(true));
  prosesEl.addEventListener('change', () => renderList(true));

  function rerender() {
    if (statusKey || statusText) setStatus(statusKey, statusEl.classList.contains('error'), statusText);
    fillProsesOptions();
    renderList();
    renderPanel(selected);
  }
  document.addEventListener('aw:langchange', rerender);
  document.addEventListener('aw:authchange', () => renderPanel(selected));

  (async function load() {
    renderMap([]);
    window.AWProses.load()
      .then((list) => {
        prosesList = list;
        if (selected) renderPanel(selected);
      })
      .catch(() => {});
    try {
      const data = await window.AWApi.polygons();
      if (!Array.isArray(data)) throw new Error(I.t('peta.badResponse'));
      items = data;
      setStatus(items.length ? '' : 'peta.empty', false);
      fillProsesOptions();
      renderList('instant');
      restoreSelection();
    } catch (err) {
      setStatus('', true, err.message || I.t('peta.loadError'));
    }
  })();
});
