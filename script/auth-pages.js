/* Halaman /login & /signup + helper input foto profil (dipakai juga di dashboard profil) */
(function (global) {
  const MAX_PHOTO = 5 * 1024 * 1024;
  const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const USERNAME_RE = /^[A-Za-z0-9_.]{3,30}$/;

  /* Validasi file foto → key error i18n atau '' */
  function photoError(file) {
    if (!file) return '';
    if (!PHOTO_TYPES.includes(file.type)) return 'auth.errPhotoType';
    if (file.size > MAX_PHOTO) return 'auth.errPhotoSize';
    return '';
  }

  /* Preview bulat untuk input file (preview: elemen atau fungsi yang mengembalikannya);
     onError(key) dipanggil jika file ditolak */
  function bindPhoto(input, preview, onError) {
    let objectUrl = '';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      const err = photoError(file);
      if (err) {
        input.value = '';
        onError(err);
        return;
      }
      onError('');
      if (!file) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(file);
      const target = typeof preview === 'function' ? preview() : preview;
      target.querySelector('img')?.remove();
      const img = document.createElement('img');
      img.src = objectUrl;
      img.alt = '';
      target.appendChild(img);
    });
  }

  function bindPasswordToggles(root) {
    root.querySelectorAll('[data-toggle-password]').forEach((btn) => {
      const input = btn.parentElement.querySelector('input');
      btn.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.dataset.i18n = show ? 'auth.hide' : 'auth.show';
        btn.textContent = global.AWI18n.t(btn.dataset.i18n);
        btn.setAttribute('aria-pressed', String(show));
      });
    });
  }

  global.AWPhotoInput = { photoError, bindPhoto, bindPasswordToggles, USERNAME_RE };

  /* Field Data pembeli (_perusahaan_fields.html): tipePembeli Perusahaan/Perseorangan + namaPerusahaan, wajib */
  const Perusahaan = {
    tipe(form) {
      const checked = form.querySelector('input[name="tipePembeli"]:checked');
      return checked ? checked.value : '';
    },
    syncLabel(form) {
      const personal = Perusahaan.tipe(form) === 'Perseorangan';
      form.querySelector('[data-perusahaan-label]').dataset.i18n = personal ? 'company.namePersonal' : 'company.nameCompany';
      form.namaPerusahaan.dataset.i18nPlaceholder = personal ? 'company.placeholderPersonal' : 'company.placeholderCompany';
      form.namaPerusahaan.autocomplete = personal ? 'name' : 'organization';
      global.AWI18n.apply(form.querySelector('[data-perusahaan]'));
    },
    bind(form) {
      form.querySelectorAll('input[name="tipePembeli"]').forEach((r) =>
        r.addEventListener('change', () => Perusahaan.syncLabel(form)),
      );
      Perusahaan.syncLabel(form);
    },
    fill(form, customer) {
      const tipe = (customer && customer.tipePembeli) || '';
      form.querySelectorAll('input[name="tipePembeli"]').forEach((r) => {
        r.checked = r.value === tipe;
      });
      form.namaPerusahaan.value = (customer && customer.namaPerusahaan) || '';
      Perusahaan.syncLabel(form);
    },
    /* → key error i18n atau '' */
    validate(form) {
      const tipe = Perusahaan.tipe(form);
      if (!tipe) return 'company.errType';
      if (!form.namaPerusahaan.value.trim()) {
        return tipe === 'Perseorangan' ? 'company.errNamePersonal' : 'company.errNameCompany';
      }
      return '';
    },
    append(form, fd) {
      fd.append('tipePembeli', Perusahaan.tipe(form));
      fd.append('namaPerusahaan', form.namaPerusahaan.value.trim().replace(/\s+/g, ' '));
    },
  };
  global.AWPerusahaanInput = Perusahaan;

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('[data-auth-page]');
    if (!form) return;
    const I = global.AWI18n;
    const page = form.dataset.authPage;
    const params = new URLSearchParams(location.search);
    const next = global.AWAuth.safeNext(params.get('next'), '/dashboard');
    const errorEl = document.getElementById('auth-error');
    const noticeEl = document.getElementById('auth-notice');
    const submitBtn = form.querySelector('button[type="submit"]');
    let error = null;

    if (global.AWAuth.isLoggedIn()) {
      location.replace(next);
      return;
    }

    const sw = form.querySelector('[data-auth-switch]');
    if (sw && params.get('next')) sw.href = `${sw.getAttribute('href')}?next=${encodeURIComponent(next)}`;

    if (global.AWAuth.peekPendingBooking()) {
      noticeEl.hidden = false;
      noticeEl.dataset.i18n = 'auth.pendingNotice';
      noticeEl.textContent = I.t('auth.pendingNotice');
    }

    function showError(e) {
      error = e;
      errorEl.hidden = !e;
      if (!e) return;
      errorEl.textContent = e.key ? I.t(e.key, e.params) : I.apiError(e.raw);
    }

    document.addEventListener('aw:langchange', () => showError(error));
    bindPasswordToggles(form);

    if (page === 'signup') {
      bindPhoto(form.foto, document.getElementById('photo-preview'), (key) => showError(key ? { key } : null));
      form.nama.addEventListener('input', () => {
        const fb = document.querySelector('#photo-preview .avatar-fallback');
        fb.textContent = global.WalidaUtils.initials(form.nama.value);
      });
      Perusahaan.bind(form);
    }

    function validate() {
      const username = form.username.value.trim();
      if (page === 'login') {
        if (!username || !form.password.value) return { key: 'auth.errRequired' };
        return null;
      }
      if (!form.nama.value.trim()) return { key: 'auth.errName' };
      if (!USERNAME_RE.test(username)) return { key: 'auth.errUsername' };
      const companyKey = Perusahaan.validate(form);
      if (companyKey) return { key: companyKey };
      if (form.password.value.length < 6) return { key: 'auth.errPasswordLength' };
      if (form.password.value !== form.password2.value) return { key: 'auth.errPasswordMatch' };
      const photoKey = photoError(form.foto.files && form.foto.files[0]);
      return photoKey ? { key: photoKey } : null;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const invalid = validate();
      showError(invalid);
      if (invalid) return;
      submitBtn.disabled = true;
      try {
        let res;
        if (page === 'login') {
          res = await global.AWApi.login(form.username.value.trim().toLowerCase(), form.password.value);
        } else {
          const fd = new FormData();
          fd.append('nama', form.nama.value.trim());
          fd.append('username', form.username.value.trim().toLowerCase());
          Perusahaan.append(form, fd);
          fd.append('password', form.password.value);
          const file = form.foto.files && form.foto.files[0];
          if (file) fd.append('foto', file);
          res = await global.AWApi.signup(fd);
        }
        global.AWAuth.setSession(res);
        location.replace(next);
      } catch (err) {
        showError({ raw: err.message });
        submitBtn.disabled = false;
      }
    });
  });
})(window);
