/* Widget chat admin: jendela chat beranimasi, pesan dilanjutkan ke WhatsApp (wa.me) */
(function (global) {
  const TEASER_KEY = 'waTeaserSeen';
  const TYPING_MS = 1100;

  const noop = { open() {}, close() {}, setContext() {}, resetContext() {} };
  global.WaChat = noop;

  function init() {
    const root = document.getElementById('wa-widget');
    if (!root) return;

    const panel = root.querySelector('.wa-panel');
    const launcher = root.querySelector('.wa-launcher');
    const badge = root.querySelector('.wa-launcher-badge');
    const teaser = root.querySelector('.wa-teaser');
    const typing = root.querySelector('.wa-typing');
    const bubble = root.querySelector('.wa-bubble');
    const chipsEl = root.querySelector('.wa-chips');
    const form = root.querySelector('.wa-panel-form');
    const input = form.querySelector('textarea');
    const base = root.dataset.waBase;
    const company = root.dataset.company || '';
    const messageKey = root.dataset.waMessageKey || '';
    const pageSpecific = root.dataset.waPage === '1';
    const touch = global.matchMedia && global.matchMedia('(hover: none)').matches;
    const t = (key, params) => global.AWI18n.t(key, { company, ...(params || {}) });
    const defaultMessage = () =>
      messageKey && global.AWI18n.has(messageKey) ? t(messageKey) : root.dataset.waMessage || '';

    let context = { message: defaultMessage(), label: '', custom: false };
    let greeted = false;
    let isOpen = false;

    function presetChips() {
      return [
        { label: t('wa.chipPrice'), message: t('wa.msgPrice') },
        { label: t('wa.chipBooking'), message: t('wa.msgBooking') },
        { label: t('wa.chipVisit'), message: t('wa.msgVisit') },
      ];
    }

    function renderChips() {
      const chips = [];
      if (context.label) chips.push({ label: context.label, message: context.message, primary: true });
      else if (context.message && (pageSpecific || context.custom)) {
        chips.push({ label: t('wa.chipThisPage'), message: context.message, primary: true });
      }
      chips.push(...presetChips());
      chipsEl.innerHTML = '';
      chips.forEach((c, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `wa-chip${c.primary ? ' wa-chip--primary' : ''}`;
        btn.style.animationDelay = `${i * 70}ms`;
        btn.textContent = c.label;
        btn.addEventListener('click', () => {
          input.value = c.message;
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        });
        chipsEl.appendChild(btn);
      });
    }

    function stamp() {
      const t = new Date();
      bubble.querySelector('.wa-bubble-time').textContent = t.toLocaleTimeString(global.AWI18n.locale(), {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    function showGreeting() {
      if (greeted) return;
      greeted = true;
      typing.hidden = false;
      bubble.hidden = true;
      chipsEl.hidden = true;
      setTimeout(() => {
        typing.hidden = true;
        stamp();
        bubble.hidden = false;
        renderChips();
        chipsEl.hidden = false;
      }, TYPING_MS);
    }

    function open() {
      if (isOpen) return;
      isOpen = true;
      hideTeaser();
      badge.hidden = true;
      panel.hidden = false;
      requestAnimationFrame(() => root.classList.add('is-open'));
      launcher.setAttribute('aria-expanded', 'true');
      launcher.setAttribute('aria-label', t('wa.launcherClose'));
      if (!input.value) input.value = context.message;
      showGreeting();
      if (!touch) setTimeout(() => input.focus(), 250);
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      root.classList.remove('is-open');
      launcher.setAttribute('aria-expanded', 'false');
      launcher.setAttribute('aria-label', t('wa.launcherOpen'));
      setTimeout(() => {
        if (!isOpen) panel.hidden = true;
      }, 220);
    }

    function hideTeaser() {
      teaser.classList.remove('is-visible');
      setTimeout(() => (teaser.hidden = true), 250);
      try {
        global.sessionStorage.setItem(TEASER_KEY, '1');
      } catch (_) {
        /* sessionStorage tidak tersedia */
      }
    }

    function showTeaser() {
      let seen = false;
      try {
        seen = !!global.sessionStorage.getItem(TEASER_KEY);
      } catch (_) {
        seen = false;
      }
      if (seen || isOpen || document.documentElement.classList.contains('map-fullsize-open')) return;
      teaser.hidden = false;
      requestAnimationFrame(() => teaser.classList.add('is-visible'));
      setTimeout(() => {
        if (!teaser.hidden) hideTeaser();
      }, 12000);
    }

    function send(e) {
      e.preventDefault();
      const text = (input.value || context.message || '').replace(/\s+/g, ' ').trim();
      global.open(`${base}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      close();
    }

    launcher.addEventListener('click', (e) => {
      e.preventDefault();
      if (isOpen) close();
      else open();
    });
    root.querySelector('.wa-panel-close').addEventListener('click', close);
    root.querySelector('.wa-teaser-close').addEventListener('click', hideTeaser);
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-wa-open]');
      if (opener) {
        e.preventDefault();
        open();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) close();
    });
    form.addEventListener('submit', send);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !touch) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
    setTimeout(showTeaser, 5000);

    function applyContext(next) {
      const prevMessage = context.message;
      context = next;
      if (!input.value || input.value === prevMessage) input.value = context.message;
      if (greeted && !chipsEl.hidden) renderChips();
    }

    global.WaChat = {
      open,
      close,
      /* Pesan kontekstual, mis. saat petak dipilih di peta */
      setContext(message, label) {
        applyContext({ message: message || defaultMessage(), label: label || '', custom: !!message });
      },
      resetContext() {
        applyContext({ message: defaultMessage(), label: '', custom: false });
      },
    };
    launcher.setAttribute('aria-label', t('wa.launcherOpen'));
    document.addEventListener('aw:langchange', () => {
      if (!context.custom) applyContext({ message: defaultMessage(), label: '', custom: false });
      else if (greeted && !chipsEl.hidden) renderChips();
      launcher.setAttribute('aria-label', t(isOpen ? 'wa.launcherClose' : 'wa.launcherOpen'));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
