/* Peta kebun: filter MDPL/proses, PolygonMap (MapLibre 2D/3D), panel Petani + Book */
document.addEventListener('DOMContentLoaded', () => {
  const U = window.WalidaUtils;
  const APP = window.APP || {};
  const statusEl = document.getElementById('peta-status');
  const listEl = document.getElementById('farm-list');
  const panelEl = document.getElementById('detail-panel');
  const mdplEl = document.getElementById('filter-mdpl');
  const prosesEl = document.getElementById('filter-proses');

  let items = [];
  let selectedId = null;
  let selected = null;
  let map = null;

  function setStatus(text, isError) {
    if (!text) {
      statusEl.hidden = true;
      statusEl.textContent = '';
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = text;
    statusEl.classList.toggle('error', !!isError);
  }

  function lahanHref(id) {
    return String(APP.lahanUrl || '/lahan/__ID__').replace('__ID__', encodeURIComponent(id));
  }

  function polygonHref(id) {
    return String(APP.polygonUrl || '/api/polygons/__ID__').replace(
      '__ID__',
      encodeURIComponent(id),
    );
  }

  function filteredItems() {
    const mdplFilter = mdplEl.value;
    const prosesFilter = prosesEl.value;
    return items.filter((item) => {
      if (mdplFilter !== '') {
        const mdpl = Number(item.mdpl);
        if (Number.isNaN(mdpl) || mdpl !== Number(mdplFilter)) return false;
      }
      if (prosesFilter && !U.processNames(item).includes(prosesFilter)) return false;
      return true;
    });
  }

  function fillProsesOptions() {
    const set = new Set();
    items.forEach((item) => U.processNames(item).forEach((p) => set.add(p)));
    const current = prosesEl.value;
    prosesEl.innerHTML = '<option value="">Semua</option>';
    Array.from(set)
      .sort((a, b) => a.localeCompare(b, 'id'))
      .forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        prosesEl.appendChild(opt);
      });
    if ([...set].includes(current)) prosesEl.value = current;
  }

  function renderList(fit) {
    const filtered = filteredItems();
    listEl.innerHTML = '';
    if (!filtered.length) {
      listEl.hidden = true;
      if (!statusEl.textContent || statusEl.hidden) {
        setStatus('Tidak ada petak yang cocok dengan filter.', false);
      }
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
      const petani = U.petaniNama(item);
      const sub = [petani, item.varietas].filter(Boolean).join(' · ') || item.idPolygon || '';
      btn.innerHTML = `<strong>${U.escapeHtml(U.displayName(item))}</strong><span>${U.escapeHtml(sub)}</span>`;
      btn.addEventListener('click', () => onSelect(id));
      listEl.appendChild(btn);
    });
    renderMap(filtered, fit);
  }

  function avatarHtml(item, size) {
    const url = U.petaniFotoUrl(item);
    const nama = U.petaniNama(item) || 'Petani';
    const ini = U.petaniInisial(item);
    if (url) {
      return `<div class="petani-avatar petani-avatar--${size}"><img src="${U.escapeHtml(url)}" alt="${U.escapeHtml(nama)}" onerror="this.style.display='none';this.nextElementSibling.hidden=false"/><span class="petani-avatar-fallback" hidden>${U.escapeHtml(ini)}</span></div>`;
    }
    return `<div class="petani-avatar petani-avatar--${size}"><span class="petani-avatar-fallback">${U.escapeHtml(ini)}</span></div>`;
  }

  function renderPanel(item) {
    if (!item) {
      panelEl.hidden = true;
      panelEl.innerHTML = '';
      return;
    }
    const id = U.farmId(item);
    const soldOut = U.isSoldOut(item);
    const stock = U.availableStock(item);
    const proses = U.processNames(item);
    const pembeli = Array.isArray(item.pembeliBooking) ? item.pembeliBooking : [];
    const namaPetani = U.petaniNama(item);

    let prosesHtml = '—';
    if (proses.length) {
      prosesHtml = proses
        .map(
          (p, i) =>
            `<span class="proses-chip">${proses.length > 1 ? `${i + 1}. ` : ''}${U.escapeHtml(p)}</span>`,
        )
        .join('');
    }

    let pembeliHtml = '';
    if (pembeli.length) {
      pembeliHtml = `<div class="pembeli-block"><h4>Pembeli booking</h4><ul>${pembeli
        .map(
          (p) =>
            `<li><strong>${U.escapeHtml(p.namaPembeli || '—')}</strong><span>${U.escapeHtml(p.prosesPengolahan || '—')}</span><span>${U.escapeHtml(U.formatKg(p.jumlahPesananKg))}</span></li>`,
        )
        .join('')}</ul></div>`;
    }

    panelEl.hidden = false;
    panelEl.innerHTML = `
      <header>
        <button type="button" class="detail-close" aria-label="Tutup" data-close>×</button>
        <div class="detail-code">${U.escapeHtml(item.idPolygon || '')}</div>
        <strong>${U.escapeHtml(U.displayName(item))}</strong>
        ${soldOut ? '<span class="badge-habis">Habis</span>' : ''}
      </header>
      <div class="petani-block">
        ${avatarHtml(item, 'md')}
        <div class="petani-block-text">
          <span class="petani-label">Petani</span>
          <strong>${U.escapeHtml(namaPetani || '—')}</strong>
          ${item.idPetani ? `<span class="petani-id">${U.escapeHtml(item.idPetani)}</span>` : ''}
        </div>
      </div>
      <dl>
        <div><dt>Jumlah cherry</dt><dd>${U.escapeHtml(U.formatKg(item.jumlahCherry))}</dd></div>
        <div><dt>Potential GB</dt><dd>${U.escapeHtml(U.formatKg(item.potentialGb))}</dd></div>
        <div><dt>Potential GB tersedia</dt><dd>${stock == null ? '—' : U.escapeHtml(U.formatKg(stock))}</dd></div>
        <div><dt>Varietas</dt><dd>${U.escapeHtml(item.varietas || '—')}</dd></div>
        <div><dt>Proses pengolahan</dt><dd>${prosesHtml}</dd></div>
        <div><dt>MDPL</dt><dd>${U.escapeHtml(U.formatMeter(item.mdpl))}</dd></div>
        <div><dt>Luas lahan</dt><dd>${U.escapeHtml(U.formatHa(U.landAreaHa(item)))}</dd></div>
      </dl>
      ${pembeliHtml}
      <div class="detail-actions">
        <a class="btn btn-block" href="${lahanHref(id)}">Book</a>
      </div>
    `;
    panelEl.querySelector('[data-close]')?.addEventListener('click', () => {
      selectedId = null;
      selected = null;
      renderPanel(null);
      renderList();
      if (map) map.focus(null);
    });
  }

  function renderMap(filtered, fit) {
    if (!map) {
      map = window.PolygonMap.create('map', filtered, {
        selectedId,
        colorFor: (item) => U.polygonColor(item, false),
        onSelect: (item) => onSelect(U.farmId(item)),
      });
      window.PolygonMap.bindControls(map, document.getElementById('map-toolbar'));
      return;
    }
    map.setItems(filtered, { fit });
  }

  async function onSelect(id) {
    selectedId = id;
    selected = items.find((i) => U.farmId(i) === id) || null;
    renderPanel(selected);
    renderList();
    if (map) map.focus(id);
    if (!id) return;
    try {
      const res = await fetch(polygonHref(id));
      const detail = await res.json();
      if (!res.ok) throw new Error(detail.error || 'Gagal memuat detail');
      if (selectedId !== id) return;
      selected = detail;
      items = items.map((p) => (U.farmId(p) === id ? { ...p, ...detail } : p));
      renderPanel(selected);
      renderList();
    } catch (_) {
      /* keep list snapshot */
    }
  }

  mdplEl.addEventListener('change', () => renderList(true));
  prosesEl.addEventListener('change', () => renderList(true));

  (async function load() {
    try {
      const res = await fetch(APP.polygonsUrl || '/api/polygons');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat polygon');
      if (!Array.isArray(data)) throw new Error('Respons API polygon tidak berbentuk daftar.');
      items = data;
      if (!items.length) {
        setStatus('Belum ada data polygon di sistem admin.', false);
      } else {
        setStatus('', false);
      }
      fillProsesOptions();
      renderList();
    } catch (err) {
      setStatus(err.message || 'Tidak bisa memuat data polygon. Periksa WALIDA_API.', true);
      renderMap([]);
    }
  })();
});
