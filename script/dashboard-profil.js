/* /dashboard: profil customer, ringkasan pesanan, ubah profil & ganti password */
document.addEventListener('DOMContentLoaded', () => {
  const U = window.WalidaUtils;
  const I = window.AWI18n;
  const P = window.AWPhotoInput;
  const esc = U.escapeHtml;
  const cardEl = document.getElementById('profile-card');
  const statsEl = document.getElementById('profile-stats');
  const profileForm = document.getElementById('profile-form');
  const passwordForm = document.getElementById('password-form');
  const preview = () => profileForm.querySelector('.user-avatar');
  let customer = window.AWAuth.getCustomer();
  let orders = null;
  let ordersError = '';
  const messages = new Map();

  function renderCard() {
    if (!customer) return;
    cardEl.innerHTML = `
      ${U.avatarHtml(window.AWAuth.fotoUrl(customer), customer.nama || customer.username, 'user-avatar user-avatar--xl')}
      <div class="profile-info">
        <h2>${esc(customer.nama || '—')}</h2>
        <p class="profile-username">@${esc(customer.username || '')}</p>
        <dl class="profile-dl">
          <div><dt>${esc(I.t('dashboard.profile.customerId'))}</dt><dd>${esc(customer.idCustomer || '—')}</dd></div>
          <div><dt>${esc(I.t('dashboard.profile.joined'))}</dt><dd>${esc(I.formatDate(customer.createdAt))}</dd></div>
        </dl>
      </div>`;
  }

  function renderStats() {
    if (ordersError) {
      statsEl.innerHTML = `<p class="status-box error">${esc(ordersError)}</p>`;
      return;
    }
    if (!orders) {
      statsEl.innerHTML = '';
      return;
    }
    const s = window.AWOrders.summarize(orders);
    const stat = (key, value, cls) =>
      `<div class="stat ${cls || ''}"><span>${esc(I.t(key))}</span><strong>${esc(value)}</strong></div>`;
    statsEl.innerHTML =
      stat('dashboard.stats.totalOrders', U.formatNumber(s.count, 0)) +
      stat('dashboard.stats.ordering', U.formatNumber(s.byOrder.Ordering || 0, 0), 'stat--warn') +
      stat('dashboard.stats.complete', U.formatNumber(s.byOrder.Complete || 0, 0), 'stat--ok') +
      stat('dashboard.stats.totalSpent', U.formatRp(s.totalHarga));
  }

  function fillProfileForm() {
    if (!customer) return;
    profileForm.nama.value = customer.nama || '';
    profileForm.username.value = customer.username || '';
    const current = preview().querySelector('img');
    if (!current || !current.src.startsWith('blob:')) {
      preview().outerHTML = U.avatarHtml(window.AWAuth.fotoUrl(customer), customer.nama, 'user-avatar user-avatar--lg');
    }
  }

  /* Pesan per form: { key, params } atau { raw } (dari API), type: 'error' | 'ok' */
  function setMsg(form, msg) {
    messages.set(form, msg);
    const el = form.querySelector('[data-msg]');
    el.hidden = !msg;
    if (!msg) return;
    el.className = `form-msg form-msg--${msg.type}`;
    el.textContent = msg.key ? I.t(msg.key, msg.params) : I.apiError(msg.raw);
  }

  async function save(form, fd, successKey) {
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    setMsg(form, null);
    try {
      const res = await window.AWApi.updateMe(fd);
      window.AWAuth.setSession(res);
      customer = (res && res.customer) || customer;
      renderCard();
      setMsg(form, { type: 'ok', key: successKey });
      return true;
    } catch (err) {
      if (err.status === 401 && !/password/i.test(err.message || '')) {
        window.AWAuth.clear();
        window.AWAuth.requireLogin();
        return false;
      }
      setMsg(form, { type: 'error', raw: err.message });
      return false;
    } finally {
      btn.disabled = false;
    }
  }

  P.bindPasswordToggles(document);

  const photoInput = profileForm.foto;
  P.bindPhoto(photoInput, preview, (key) => setMsg(profileForm, key ? { type: 'error', key } : null));

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = profileForm.nama.value.trim();
    const username = profileForm.username.value.trim().toLowerCase();
    if (!nama) return setMsg(profileForm, { type: 'error', key: 'auth.errName' });
    if (!P.USERNAME_RE.test(username)) return setMsg(profileForm, { type: 'error', key: 'auth.errUsername' });
    const fd = new FormData();
    fd.append('nama', nama);
    fd.append('username', username);
    const file = photoInput.files && photoInput.files[0];
    if (file) fd.append('foto', file);
    if (await save(profileForm, fd, 'dashboard.profile.saved')) {
      photoInput.value = '';
      fillProfileForm();
    }
    return undefined;
  });

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = passwordForm;
    if (!f.passwordLama.value) return setMsg(f, { type: 'error', key: 'dashboard.profile.errOldPassword' });
    if (f.passwordBaru.value.length < 6) return setMsg(f, { type: 'error', key: 'auth.errPasswordLength' });
    if (f.passwordBaru.value !== f.passwordKonfirmasi.value) return setMsg(f, { type: 'error', key: 'auth.errPasswordMatch' });
    const fd = new FormData();
    fd.append('nama', customer.nama || '');
    fd.append('username', customer.username || '');
    fd.append('passwordLama', f.passwordLama.value);
    fd.append('passwordBaru', f.passwordBaru.value);
    if (await save(f, fd, 'dashboard.profile.passwordSaved')) f.reset();
    return undefined;
  });

  document.addEventListener('aw:langchange', () => {
    renderCard();
    renderStats();
    messages.forEach((msg, form) => setMsg(form, msg));
  });

  renderCard();
  fillProfileForm();

  window.AWApi.me()
    .then((res) => {
      customer = (res && res.customer) || res || customer;
      window.AWAuth.setSession({ customer });
      renderCard();
      fillProfileForm();
    })
    .catch(() => {});

  window.AWApi.orders()
    .then((list) => {
      orders = Array.isArray(list) ? list : [];
    })
    .catch((err) => {
      ordersError = I.apiError(err.message);
    })
    .finally(renderStats);
});
