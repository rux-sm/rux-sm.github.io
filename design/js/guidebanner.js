/* ==========================================================================
   Design — GUIDE BANNER
   --------------------------------------------------------------------------
   Requires js/overlay.js only to share the `window.Rux` namespace. The banner
   sits in the page and covers nothing, so it never joins the dismiss stack.

   WHAT IT DOES. The toggle collapses and expands the banner. Back and Next
   page the row of insights, show only while the row scrolls, and go disabled
   at the end they point to. Close removes the banner.

   THE EDGE FADES ARE INLINE STYLE, as in js/scroll-gradient.js and for the
   same reason: Carbon's stylesheet positions the two edge elements and gives
   them no background. Its component writes the gradient onto each, in the
   banner's own two end colours.

   THE TOGGLE'S OTHER LABEL comes from `data-rux-alt-label` on the button. The
   two swap on each press, so the words stay in the markup.
   ========================================================================== */

/* BEHAVIOUR: verified-live · driven 2026-10-03 on
   https://ibm-products.carbondesignsystem.com/iframe.html?id=preview-candidate-onboarding-guidebanner--many-insights
   and read against @carbon/ibm-products 2.99.0, Guidebanner.js and Carousel.js.

   READ OFF THE RUNNING COMPONENT:
     · the toggle flips `guidebanner__collapsible-collapsed` on the root and
       `aria-expanded` on itself, and its label between "Read more" and
       "Read less"
     · at the start Back is disabled; at the end Next is; a position between
       leaves both enabled
     · each edge carries `background: linear-gradient(90deg, #001d6c,
       transparent)` on the left and `linear-gradient(270deg, #6929c4,
       transparent)` on the right, at every scroll position

   FROM THE SOURCE, the arithmetic: the position is scrollLeft over its maximum
   to two decimals; Next adds the summed width of the items wholly in view, or
   the row's width when none is; Back subtracts that sum less the first such
   item's left edge.

   TWO DIFFERENCES, both deliberate:
     · Carbon reads the position on `scrollend`. This reads it on `scroll`,
       which ends on the same value and exists in every browser.
     · Carbon's close button calls the consumer's `onClose` and does nothing
       else. Here it removes the banner and fires `rux:guidebanner-closed`,
       as js/dismiss.js removes a notification.

   NOT WRITTEN: `guidebanner__back-button--disabled` and its Next twin, which
   Carbon adds beside the button's own `disabled` and no rule styles. */
(() => {
  'use strict';
  if (!window.Rux?.overlay) return; // js/overlay.js must load first

  const ROOT = '.rux--guidebanner';
  const COLLAPSED = 'rux--guidebanner__collapsible-collapsed';
  const EDGES = [
    ['.rux--guidebanner__carousel-elements-container--scrolled', 'linear-gradient(90deg, #001d6c, transparent)'],
    ['.rux--guidebanner__carousel-elements-container--scroll-max', 'linear-gradient(270deg, #6929c4, transparent)'],
  ];

  const rowOf = banner => banner.querySelector('.rux--guidebanner__carousel-elements');
  const toggleOf = banner => banner.querySelector('.rux--guidebanner__toggle-button');

  // 0 at the start, 1 at the end, as Carbon's Carousel reports it.
  function position(row) {
    const max = row.scrollWidth - row.clientWidth;
    return max > 0 ? parseFloat((parseInt(row.scrollLeft, 10) / max).toFixed(2)) || 0 : 0;
  }

  function sync(banner) {
    const row = rowOf(banner);
    if (!row) return;
    const scrolls = row.scrollWidth > row.clientWidth;
    const at = position(row);
    for (const [selector, atEnd] of [['.rux--guidebanner__back-button', at === 0],
                                     ['.rux--guidebanner__next-button', at === 1]]) {
      const holder = banner.querySelector(selector);
      const button = holder?.querySelector('button');
      if (!holder) continue;
      holder.hidden = !scrolls;
      if (button) {
        button.disabled = atEnd;
        button.classList.toggle('rux--btn--disabled', atEnd);
      }
    }
  }

  function page(banner, forward) {
    const row = rowOf(banner);
    if (!row) return;
    const box = row.getBoundingClientRect();
    const inView = [...row.children].map(item => item.getBoundingClientRect())
      .filter(r => r.left >= box.left && r.right <= box.right);
    const width = inView.reduce((sum, r) => sum + r.width, 0);
    if (forward) row.scrollLeft += width > 0 ? width : box.width;
    else row.scrollLeft -= width > 0 ? width - inView[0].left : box.width + box.left;
  }

  function setOpen(banner, open) {
    const toggle = toggleOf(banner);
    if (banner.classList.contains(COLLAPSED) === !open) return;
    banner.classList.toggle(COLLAPSED, !open);
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(open));
      const other = toggle.getAttribute('data-rux-alt-label');
      if (other) {
        toggle.setAttribute('data-rux-alt-label', toggle.textContent.trim());
        toggle.textContent = other;
      }
    }
    sync(banner);
    banner.dispatchEvent(new CustomEvent(open ? 'rux:guidebanner-opened' : 'rux:guidebanner-collapsed',
      { bubbles: true }));
  }

  function close(banner) {
    const parent = banner.parentNode;
    banner.remove();
    parent?.dispatchEvent(new CustomEvent('rux:guidebanner-closed', { bubbles: true }));
  }

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    const banner = button?.closest(ROOT);
    if (!banner) return;
    if (button.matches('.rux--guidebanner__toggle-button')) setOpen(banner, banner.classList.contains(COLLAPSED));
    else if (button.closest('.rux--guidebanner__next-button')) page(banner, true);
    else if (button.closest('.rux--guidebanner__back-button')) page(banner, false);
    else if (button.closest('.rux--guidebanner__close-button')) close(banner);
  });

  // Scroll does not bubble, so it is heard on the way down.
  document.addEventListener('scroll', event => {
    const banner = event.target instanceof Element && event.target.closest(ROOT);
    if (banner) sync(banner);
  }, true);

  // Carbon returns the row to its start when the window is resized.
  window.addEventListener('resize', () => {
    for (const banner of document.querySelectorAll(ROOT)) {
      const row = rowOf(banner);
      if (row) row.scrollLeft = 0;
      sync(banner);
    }
  });

  for (const banner of document.querySelectorAll(ROOT)) {
    for (const [edge, fade] of EDGES) {
      const el = banner.querySelector(edge);
      if (el) el.style.background = fade;
    }
    const toggle = toggleOf(banner);
    const row = rowOf(banner);
    toggle?.setAttribute('aria-expanded', String(!banner.classList.contains(COLLAPSED)));
    if (toggle && row) toggle.setAttribute('aria-controls', window.Rux.overlay.autoId(row, 'rux-guidebanner'));
    sync(banner);
  }

  window.Rux.guidebanner = {
    open: banner => setOpen(banner, true),
    collapse: banner => setOpen(banner, false),
    next: banner => page(banner, true),
    back: banner => page(banner, false),
    close,
  };
})();
