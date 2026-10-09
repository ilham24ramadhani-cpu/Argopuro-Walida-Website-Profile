/* Halaman /proses-pengolahan: kartu dari GET /api/polygon-proses + petani terkait (GET /api/polygon)
   + filter altitude & varietas */
document.addEventListener('DOMContentLoaded', () => {
  const I = window.AWI18n;
  const esc = window.WalidaUtils.escapeHtml;
  const grid = document.getElementById('proses-grid');
  const statusEl = document.getElementById('proses-status');
  const altEl = document.getElementById('filter-altitude');
  const varEl = document.getElementById('filter-varietas');
  let items = [];
  let polygons = [];
  let error = '';
  let loaded = false;

  function fillVarietas() {
    const current = varEl.value;
    const set = new Set(items.map((p) => String(p.varietas || '').trim()).filter(Boolean));
    varEl.innerHTML = `<option value="">${esc(I.t('common.all'))}</option>`;
    [...set].sort((a, b) => a.localeCompare(b, I.locale())).forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      varEl.appendChild(opt);
    });
    if (set.has(current)) varEl.value = current;
  }

  function render() {
    if (!loaded) return;
    if (error) {
      statusEl.hidden = false;
      statusEl.classList.add('error');
      statusEl.textContent = error;
      grid.innerHTML = '';
      return;
    }
    const alt = altEl.value;
    const varietas = varEl.value;
    const list = items.filter(
      (p) =>
        (alt === '' || Number(p.altitude) === Number(alt)) &&
        (varietas === '' || String(p.varietas || '').trim() === varietas),
    );
    statusEl.classList.remove('error');
    statusEl.hidden = list.length > 0;
    statusEl.textContent = I.t(items.length ? 'process.noMatch' : 'process.empty');
    grid.innerHTML = list.map((p, i) => window.AWProses.cardHtml(p, i, { polygons, contents: items })).join('');
    window.AWProses.bindMore(grid, list);
  }

  altEl.addEventListener('change', render);
  varEl.addEventListener('change', render);
  document.addEventListener('aw:langchange', () => {
    fillVarietas();
    render();
  });

  const polygonsReq = window.AWApi.polygons()
    .then((data) => {
      polygons = Array.isArray(data) ? data : [];
    })
    .catch(() => {});

  Promise.all([window.AWProses.load(), polygonsReq])
    .then(([list]) => {
      items = list;
    })
    .catch((err) => {
      error = I.apiError(err.message);
    })
    .finally(() => {
      loaded = true;
      fillVarietas();
      render();
    });
});
