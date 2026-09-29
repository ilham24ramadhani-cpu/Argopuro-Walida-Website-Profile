document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll(':scope > a').forEach((a) => {
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const slot = document.getElementById('nav-auth');
  if (!slot) return;
  const { t } = window.AWI18n;
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function avatar(customer, cls) {
    return window.WalidaUtils.avatarHtml(window.AWAuth.fotoUrl(customer), customer && customer.nama, cls);
  }

  function render() {
    const customer = window.AWAuth.getCustomer();
    if (!window.AWAuth.isLoggedIn()) {
      const next = encodeURIComponent(location.pathname + location.search);
      const onAuthPage = /^\/(login|signup)\b/.test(location.pathname);
      const q = onAuthPage ? location.search : `?next=${next}`;
      slot.innerHTML = `
        <a class="nav-auth-link" href="${esc(slot.dataset.loginUrl + q)}">${esc(t('nav.login'))}</a>
        <a class="btn nav-auth-signup" href="${esc(slot.dataset.signupUrl + q)}">${esc(t('nav.signup'))}</a>`;
      return;
    }
    const name = (customer && customer.nama) || (customer && customer.username) || '';
    slot.innerHTML = `
      <div class="dropdown">
        <button class="nav-user" type="button" data-bs-toggle="dropdown" aria-expanded="false">
          ${avatar(customer, 'user-avatar user-avatar--sm')}
          <span class="nav-user-name">${esc(name)}</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><a class="dropdown-item" href="/dashboard">${esc(t('nav.dashboard'))}</a></li>
          <li><a class="dropdown-item" href="/dashboard/pesanan">${esc(t('nav.orders'))}</a></li>
          <li><hr class="dropdown-divider" /></li>
          <li><button class="dropdown-item" type="button" data-logout>${esc(t('nav.logout'))}</button></li>
        </ul>
      </div>`;
    slot.querySelector('[data-logout]').addEventListener('click', () => {
      window.AWAuth.logout();
    });
  }

  window.AWAvatar = avatar;
  render();
  document.addEventListener('aw:authchange', render);
  document.addEventListener('aw:langchange', render);
});
