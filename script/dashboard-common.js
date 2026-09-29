/* Header & navigasi dashboard (semua halaman /dashboard*) */
document.addEventListener('DOMContentLoaded', () => {
  const U = window.WalidaUtils;
  const userEl = document.getElementById('dash-user');

  function renderUser() {
    const c = window.AWAuth.getCustomer() || {};
    userEl.querySelector('.user-avatar').outerHTML = U.avatarHtml(
      window.AWAuth.fotoUrl(c),
      c.nama || c.username || '?',
      'user-avatar user-avatar--md',
    );
    userEl.querySelector('.dash-user-name').textContent = c.nama || '—';
    userEl.querySelector('.dash-user-username').textContent = c.username ? `@${c.username}` : '';
  }

  document.querySelector('[data-dash-logout]').addEventListener('click', () => window.AWAuth.logout());
  document.addEventListener('aw:authchange', () => {
    if (window.AWAuth.loggingOut) return;
    if (!window.AWAuth.isLoggedIn()) {
      window.AWAuth.requireLogin();
      return;
    }
    renderUser();
  });
  renderUser();
});
