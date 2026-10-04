/* ==========================================================================
   Design — NOTIFICATIONS PANEL
   --------------------------------------------------------------------------
   Requires js/overlay.js. A panel opened from its trigger joins the dismiss
   stack, so Escape and a press outside close it.

   WHAT IT DOES. A control with `aria-controls` naming the panel opens and
   closes it. Each notification's close button removes that notification,
   "Dismiss all" removes every one, and a panel left with none shows its empty
   state. A long description's button expands and trims it.

   THE TRIGGER IS FOUND BY `aria-controls`, the attribute that already says
   which panel a button owns, so no `data-rux-*` is written.

   CLOSED IS `hidden`. Carbon's React takes a closed panel out of the tree
   after its exit animation. Here the panel keeps its place in the markup and
   takes `hidden` when that animation ends.

   A PANEL WRITTEN OPEN is left alone until something is pressed: it is not on
   the dismiss stack, so a press elsewhere on the page does not close it.

   THE OTHER LABELS are in the markup. A description's button carries its other
   label in `data-rux-alt-label`, and the two swap on each press.
   ========================================================================== */

/* BEHAVIOUR: verified-live · driven 2026-10-03 on
   https://ibm-products.carbondesignsystem.com/iframe.html?id=components-notificationspanel--default
   and read against @carbon/ibm-products 2.99.0, NotificationsPanel.js.

   READ OFF THE RUNNING COMPONENT:
     · the header's bell opens and closes the panel and carries
       `aria-expanded` and `header__action--active` while it is open
     · opening moves focus to "Dismiss all"; Escape inside the panel closes it
       and returns focus to the bell
     · an open panel carries `notifications-panel__entrance`, a closing one
       `notifications-panel__exit`
     · dismissing one takes it out of the DOM, takes its day heading with it
       when it was the last under that heading, and the count in "View all
       (16)" becomes 15
     · "Dismiss all" leaves the main section with
       `notifications-panel__main-section-empty` and the empty state inside
       it, and no bottom actions

   FROM THE SOURCE: a description's button swaps
   `notification-short-description` for `notification-long-description` and
   `notification-read-more-button` for `notification-read-less-button`.

   TWO DIFFERENCES, both deliberate:
     · Carbon hands every dismissal to the consumer, who takes the item out of
       its data. Here the module takes it out of the markup and fires
       `rux:notification-dismissed` or `rux:notifications-dismissed`.
     · After a dismissal Carbon leaves focus on the document body. Here it
       moves to the next notification's close button, or the one before, or
       "Dismiss all", as js/dismiss.js does for the same reason.

   NOT WRITTEN: grouping notifications by date and writing their relative
   times, which is the consumer's data; the settings and "view all" actions,
   which are the consumer's to answer. */
(() => {
  'use strict';
  const overlay = window.Rux?.overlay;
  if (!overlay) return; // js/overlay.js must load first

  // Every class is spelled whole, because check-classes reads the names here.
  const PANEL = '.rux--notifications-panel__container';
  const NOTE = '.rux--notifications-panel__notification';
  const ENTER = 'rux--notifications-panel__entrance', EXIT = 'rux--notifications-panel__exit';
  const LONG = 'rux--notifications-panel__notification-long-description';
  const SHORT = 'rux--notifications-panel__notification-short-description';
  const MORE = 'rux--notifications-panel__notification-read-more-button';
  const LESS = 'rux--notifications-panel__notification-read-less-button';
  const EXIT_MS = 240;

  const live = new Map();   // panel -> registration
  const triggerOf = panel => panel.id
    ? document.querySelector(`[aria-controls="${CSS.escape(panel.id)}"]`) : null;

  function mark(panel, open) {
    const trigger = triggerOf(panel);
    if (!trigger) return;
    trigger.setAttribute('aria-expanded', String(open));
    if (trigger.classList.contains('rux--header__action'))
      trigger.classList.toggle('rux--header__action--active', open);
  }

  function open(panel) {
    if (live.has(panel)) return;
    panel.hidden = false;
    panel.classList.remove(EXIT);
    panel.classList.add(ENTER);
    mark(panel, true);
    live.set(panel, overlay.register({
      element: panel,
      anchor: triggerOf(panel),
      close: opts => close(panel, opts),
    }));
    panel.querySelector('.rux--notifications-panel__dismiss-button')?.focus();
    panel.dispatchEvent(new CustomEvent('rux:notifications-opened', { bubbles: true }));
  }

  function close(panel, options = {}) {
    if (panel.hidden || panel.classList.contains(EXIT)) return;
    live.get(panel)?.release();
    live.delete(panel);
    panel.classList.remove(ENTER);
    panel.classList.add(EXIT);
    mark(panel, false);
    // The exit animation may never run — reduced motion, a hidden tab — so the
    // clock ends it as well as the event.
    const done = () => { if (panel.classList.contains(EXIT)) panel.hidden = true; };
    panel.addEventListener('animationend', done, { once: true });
    setTimeout(done, EXIT_MS + 60);
    if (options.restoreFocus) triggerOf(panel)?.focus();
    panel.dispatchEvent(new CustomEvent('rux:notifications-closed', { bubbles: true }));
  }

  const isOpen = panel => !panel.hidden && !panel.classList.contains(EXIT);

  /* ── what is left after a dismissal ─────────────────────────────────── */
  function settle(panel) {
    const main = panel.querySelector('.rux--notifications-panel__main-section');
    if (!main) return;
    // A day heading with no notification under it goes with the last one.
    for (const heading of main.querySelectorAll('.rux--notifications-panel__time-section-label')) {
      const next = heading.nextElementSibling;
      if (!next || !next.matches(NOTE)) heading.remove();
    }
    const left = main.querySelectorAll(NOTE).length;
    const viewAll = panel.querySelector('.rux--notifications-panel__view-all-button');
    if (viewAll) viewAll.textContent = viewAll.textContent.replace(/\(\d+\)/, `(${left})`);
    if (left) return;
    main.classList.add('rux--notifications-panel__main-section-empty');
    const empty = main.querySelector('.rux--empty-state');
    if (empty) empty.hidden = false;
    panel.querySelector('.rux--notifications-panel__bottom-actions')?.remove();
  }

  function dismiss(note) {
    const panel = note.closest(PANEL);
    const all = [...panel.querySelectorAll(NOTE)];
    const at = all.indexOf(note);
    const neighbour = all[at + 1] ?? all[at - 1];
    note.remove();
    settle(panel);
    (neighbour?.querySelector('.rux--notifications-panel__dismiss-single-button')
      ?? panel.querySelector('.rux--notifications-panel__dismiss-button'))?.focus();
    panel.dispatchEvent(new CustomEvent('rux:notification-dismissed', { bubbles: true, detail: { notification: note } }));
  }

  function dismissAll(panel) {
    const all = [...panel.querySelectorAll(NOTE)];
    for (const note of all) note.remove();
    settle(panel);
    panel.dispatchEvent(new CustomEvent('rux:notifications-dismissed', { bubbles: true, detail: { notifications: all } }));
  }

  function readMore(button) {
    const text = button.closest('.rux--notifications-panel__notification-content')?.querySelector('.rux--notifications-panel__notification-description');
    if (!text) return;
    const long = !text.classList.contains(LONG);
    text.classList.toggle(LONG, long);
    text.classList.toggle(SHORT, !long);
    button.classList.toggle(LESS, long);
    button.classList.toggle(MORE, !long);
    const other = button.getAttribute('data-rux-alt-label');
    const label = [...button.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (other && label) {
      button.setAttribute('data-rux-alt-label', label.textContent.trim());
      label.textContent = other;
    }
  }

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;

    const trigger = event.target.closest('[aria-controls]');
    const owned = trigger && document.getElementById(trigger.getAttribute('aria-controls'));
    if (owned?.matches(PANEL)) {
      event.preventDefault();
      isOpen(owned) ? close(owned) : open(owned);
      return;
    }

    const panel = event.target.closest(PANEL);
    const button = panel && event.target.closest('button');
    if (!button) return;
    if (button.matches('.rux--notifications-panel__dismiss-single-button')) {
      // The notification is itself a control; its own press is the consumer's.
      event.stopPropagation();
      dismiss(button.closest(NOTE));
    } else if (button.matches('.rux--notifications-panel__dismiss-button')) dismissAll(panel);
    else if (button.matches(`.${MORE}, .${LESS}`)) {
      event.stopPropagation();
      readMore(button);
    }
  });

  // Carbon answers Escape on the panel itself, so a panel written open, which
  // is not on the dismiss stack, closes from the keyboard too.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !(event.target instanceof Element)) return;
    const panel = event.target.closest(PANEL);
    if (!panel || live.has(panel) || !isOpen(panel)) return;
    event.stopPropagation();
    close(panel, { restoreFocus: true });
  });

  for (const panel of document.querySelectorAll(PANEL)) mark(panel, isOpen(panel));

  window.Rux.notificationsPanel = { open, close, isOpen, dismiss, dismissAll };
})();
