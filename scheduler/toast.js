/* ==========================================================================
   Rux Scheduler — NOTICES, AND THE TOAST
   --------------------------------------------------------------------------
   One builder for a notice wherever it goes, and the toast: what a person
   just did, said over the page in one line. Loaded by every office page
   that says anything about a save: the board, the record pages through
   pair.js, Settings and the Forms page. The driver's own page and the shared
   links keep their own lines.

   A TOAST IS ONE AT A TIME. A new one replaces the last, and its button with
   it. Where the header has room it stands in the header; elsewhere, as on a
   phone, at the bottom of the screen. app.css places it and overrides.css
   draws its one line.
   ========================================================================== */
(() => {
  'use strict';

  const svgUse = (href, size, box) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size); svg.setAttribute('height', size);
    svg.setAttribute('viewBox', box); svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  };

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // Every class is written out in full, never `--${kind}`: check-classes reads
  // the source and cannot see through an interpolation. A kind not here, such
  // as 'working' for something still being done, draws as info.
  const NOTE = {
    error: { cls: 'rux--inline-notification rux--inline-notification--error', icon: '#m-error-fill' },
    info: { cls: 'rux--inline-notification rux--inline-notification--info', icon: '#m-info-fill' },
    success: { cls: 'rux--inline-notification rux--inline-notification--success', icon: '#m-check_circle-fill' },
    warning: { cls: 'rux--inline-notification rux--inline-notification--warning', icon: '#m-report-fill' },
  };

  // The same kinds as Carbon's actionable notification, for a notice that
  // offers an action.
  const ACTION_NOTE = {
    error: { cls: 'rux--actionable-notification rux--actionable-notification--error', icon: '#m-error-fill' },
    info: { cls: 'rux--actionable-notification rux--actionable-notification--info', icon: '#m-info-fill' },
    success: { cls: 'rux--actionable-notification rux--actionable-notification--success', icon: '#m-check_circle-fill' },
    warning: { cls: 'rux--actionable-notification rux--actionable-notification--warning', icon: '#m-report-fill' },
  };

  /* One builder for every place a notice goes. `where` is 'toast' for the
     one-line toast `toast` shows, in the header or at the bottom of the
     screen, and anything else for a notice in the page, as the board's empty
     week and the editor's tabs put one. With an `action` it is Carbon's
     actionable notification, from `carbon-react-dom.json`'s
     `components-notifications-actionable--inline`, whose icon keeps
     `rux--inline-notification__icon`. The capture's `role="alertdialog"` and
     focus sentinels are left out: they trap the keyboard, and this action is
     an offer about something already done. A toast has a close button; a
     notice in the page does not, because the page's next render clears it.
     A toast's one line can cut its words off, so the whole of them is the
     words' tooltip, and pressing the words opens the toast to show them all,
     which is how a phone, with no hover, reads them. */
  function note(kind, title, subtitle, action, where) {
    const asToast = where === 'toast';
    const opens = text => {
      if (!asToast) return;
      text.title = [title, subtitle].filter(Boolean).join('\n');
      text.addEventListener('click', () => {
        const box = text.closest('[role="status"]');
        box.toggleAttribute('data-open');
        placeToast(toastPlace(), box);
      });
    };
    if (!action) {
      const spec = NOTE[kind] ?? NOTE.info;
      const box = el('div', spec.cls);
      box.setAttribute('role', 'status');
      const details = el('div', 'rux--inline-notification__details');
      const icon = svgUse(spec.icon, '20', '0 0 32 32');
      icon.setAttribute('class', 'rux--inline-notification__icon');
      const wrap = el('div', 'rux--inline-notification__text-wrapper');
      wrap.append(
        el('div', 'rux--inline-notification__title', title),
        el('div', 'rux--inline-notification__subtitle', subtitle),
      );
      details.append(icon, wrap);
      box.appendChild(details);
      opens(wrap);
      if (asToast) box.appendChild(closeButton('rux--inline-notification', title));
      return box;
    }
    const spec = ACTION_NOTE[kind] ?? ACTION_NOTE.info;
    const box = el('div', spec.cls);
    box.setAttribute('role', 'status');
    const focus = el('div', 'rux--actionable-notification__focus-wrapper');
    const details = el('div', 'rux--actionable-notification__details');
    const icon = svgUse(spec.icon, '20', '0 0 32 32');
    icon.setAttribute('class', 'rux--inline-notification__icon');
    const wrap = el('div', 'rux--actionable-notification__text-wrapper');
    const content = el('div', 'rux--actionable-notification__content');
    content.append(
      el('div', 'rux--actionable-notification__title', title),
      el('div', 'rux--actionable-notification__subtitle', subtitle),
    );
    wrap.appendChild(content);
    opens(content);
    details.append(icon, wrap);
    const buttons = el('div', 'rux--actionable-notification__button-wrapper');
    // One action, or a choice of them, in the order given, each Carbon's
    // ghost button beside the words.
    for (const a of [action].flat()) {
      const btn = el('button', 'rux--actionable-notification__action-button rux--btn rux--btn--sm rux--layout--size-sm rux--btn--ghost', a.label);
      btn.type = 'button';
      btn.addEventListener('click', a.onClick);
      buttons.appendChild(btn);
    }
    focus.append(details, buttons);
    box.appendChild(focus);
    if (Array.isArray(action)) box.classList.add('scheduler-note--choice');
    if (asToast) box.appendChild(closeButton('rux--actionable-notification', title));
    return box;
  }

  /* A toast carries Carbon's close button because nothing else clears it.
     Written out in full per variant for check-classes. The button names the
     notice it closes, as Design's notifications do. */
  const CLOSE = {
    'rux--actionable-notification': { btn: 'rux--actionable-notification__close-button', icon: 'rux--actionable-notification__close-icon' },
    'rux--inline-notification': { btn: 'rux--inline-notification__close-button', icon: 'rux--inline-notification__close-icon' },
  };
  function closeButton(base, title) {
    const spec = CLOSE[base];
    const b = el('button', spec.btn);
    b.type = 'button';
    b.setAttribute('aria-label', `Close notification: ${title}`);
    const svg = svgUse('#m-close', '20', '0 0 32 32');
    svg.setAttribute('class', spec.icon);
    b.appendChild(svg);
    b.addEventListener('click', () => toast(null));
    return b;
  }

  /* The toast's own element, the board's from its markup and made on a page
     that has none, the last thing in the body. */
  let region = null;
  function toastEl() {
    if (region?.isConnected) return region;
    region = document.getElementById('scheduler-toast');
    if (!region) {
      region = el('div', 'scheduler-toast');
      region.id = 'scheduler-toast';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      region.hidden = true;
      document.body.appendChild(region);
    }
    return region;
  }

  /* WHERE A TOAST STANDS. Where the header has room, in the gap between the
     company's name and the header's buttons, so a toast covers neither the
     page nor a panel beside it; elsewhere, as on a phone, at the bottom of
     the screen. Either way it is one line, 40px in a 64px header's theme and
     32px in Carbon's 48px one. The gap is measured as the toast is shown,
     since the header's height is the theme's and its buttons the window's.
     In the header the toast is centred on its own height, borders and all,
     and one opened to show all its words starts where its line does and
     hangs below; it wears the header's theme, so it reads on the header's
     surface. */
  const TOAST_ROOM = 360;
  function toastPlace() {
    const header = document.querySelector('.rux--header');
    const bar = header?.offsetHeight ? header.getBoundingClientRect() : null;
    const row = bar ? bar.height / 2 + 8 : 40;
    const name = header?.querySelector('.rux--header__name');
    if (!bar || !name) return { where: 'bottom', row };
    const buttons = [...header.querySelectorAll('.rux--header__global > *')].filter(b => b.offsetWidth);
    const start = name.getBoundingClientRect().right + 16;
    const end = (buttons.length ? Math.min(...buttons.map(b => b.getBoundingClientRect().left)) : bar.right) - 16;
    if (end - start < TOAST_ROOM) return { where: 'bottom', row };
    return { where: 'header', start, room: end - start, row, top: bar.top, height: bar.height, theme: header.dataset.theme };
  }
  function placeToast(place, box) {
    const host = toastEl();
    host.dataset.place = place.where;
    host.style.setProperty('--scheduler-toast-row', `${place.row}px`);
    if (place.where !== 'header') {
      host.removeAttribute('data-theme');
      return;
    }
    if (place.theme) host.dataset.theme = place.theme;
    else host.removeAttribute('data-theme');
    const tall = box?.offsetHeight ?? place.row;
    const drop = tall <= place.height - 8 ? (place.height - tall) / 2 : (place.height - place.row) / 2;
    host.style.setProperty('--scheduler-toast-top', `${place.top + drop}px`);
    host.style.setProperty('--scheduler-toast-start', `${place.start}px`);
    host.style.setProperty('--scheduler-toast-room', `${place.room}px`);
  }
  // A window resized under a toast moves it between the header and the bottom.
  window.addEventListener('resize', () => {
    if (region && !region.hidden) placeToast(toastPlace(), region.firstElementChild);
  });

  /* Over the page, for a notice about what a person just did, so the page
     does not jump the way it would under a notice in its flow. It replaces
     rather than stacks, so a second move drops the first move's undo. No
     kind takes it away. */
  function toast(kind, title, subtitle, action) {
    const host = toastEl();
    host.replaceChildren();
    if (!kind) { host.hidden = true; return; }
    host.hidden = false;
    const place = toastPlace();
    placeToast(place);
    const box = note(kind, title, subtitle, action, 'toast');
    host.appendChild(box);
    // Centred again on the height the toast's words gave it.
    placeToast(place, box);
    /* A success or a note with nothing to press tells the person something
       and asks for nothing, so it closes itself: after five seconds, and
       longer the more there is to read, fifteen characters a second and
       never past ten. A warning, an error, the offer of an undo and the
       notice that something is still being done all stay, because each is
       asking for something or is not finished. The wait is the delay on the
       card's own fade in app.css, and the toast goes when that fade ends --
       so app.css taking the animation away under the pointer stops the
       dismissal, and there are not two clocks to agree. */
    if ((kind === 'success' || kind === 'info') && !action) {
      const read = `${title ?? ''}${subtitle ?? ''}`.length;
      box.style.setProperty('--scheduler-toast-wait', `${Math.min(10, Math.max(5, 2 + read / 15)).toFixed(1)}s`);
      box.classList.add('scheduler-toast__timed');
      box.addEventListener('animationend', e => { if (e.target === box && box.isConnected) toast(null); });
    }
  }

  /* A page that says what it did in sentences: the first is the toast's
     title and the rest its words, as the board's toasts read. No kind takes
     the toast away. */
  function report(kind, text) {
    const [title, ...rest] = String(text ?? '').split(/(?<=[.?!…])\s+/);
    toast(kind, title, rest.join(' '));
  }

  window.SchedulerToast = { note, toast, report };
})();
