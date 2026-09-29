/* Halaman /lahan/<id>: detail petak dari API + tombol booking (wajib login) */
document.addEventListener('DOMContentLoaded', () => {
  const U = window.WalidaUtils;
  const I = window.AWI18n;
  const D = window.AWPolygonDetail;
  const root = document.getElementById('lahan-root');
  const id = root.dataset.id;
  let item = null;
  let prosesList = [];
  let error = '';

  function render() {
    if (error || !item) {
      root.innerHTML = `
        <h1>${U.escapeHtml(I.t('polygon.pageTitle'))}</h1>
        <p class="status-box error">${U.escapeHtml(error || I.t('polygon.notFound'))}</p>
        <a class="btn" href="/peta">${U.escapeHtml(I.t('common.backToMap'))}</a>`;
      return;
    }
    root.innerHTML = D.pageHtml(item, { prosesList });
    D.bind(root, item, { prosesList });
    if (window.WaChat) {
      window.WaChat.setContext(
        I.t('wa.polygon', { company: document.querySelector('meta[name="aw-brand"]').content, id: item.idPolygon, name: U.farmTitle(item) }),
        I.t('wa.chipPolygon', { id: item.idPolygon }),
      );
    }
    document.title = `${U.farmTitle(item)} — ${document.querySelector('meta[name="aw-brand"]').content}`;
  }

  document.addEventListener('aw:langchange', render);
  document.addEventListener('aw:authchange', render);

  (async function load() {
    // Kembali dari login lewat "Masuk untuk Booking": langsung buka form booking petak ini
    const pending = window.AWAuth.peekPendingBooking();
    if (pending && pending.idPolygon === id && pending.page === location.pathname && window.AWAuth.isLoggedIn()) {
      location.replace(D.bookingUrl(id));
      return;
    }
    try {
      item = await window.AWApi.polygon(id);
    } catch (err) {
      error = err.status === 404 ? I.t('polygon.notFound') : err.message;
    }
    render();
    window.AWProses.load()
      .then((list) => {
        prosesList = list;
        render();
      })
      .catch(() => {});
  })();
});
