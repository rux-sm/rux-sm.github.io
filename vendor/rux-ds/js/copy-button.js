/* ==========================================================================
   rux-ds — COPY BUTTON
                                                        Phase 5, roadmap §4.5
   --------------------------------------------------------------------------
   Requires js/overlay.js. Load after js/popover.js.

   THE FEEDBACK IS THE TOOLTIP, NOT `copy-btn__feedback`. That class has rules
   in @carbon/styles and appears in ZERO captures — it is the v10 Copy
   component's own bubble, left in the stylesheet. Carbon's current copy button
   renders the button inside an icon-tooltip and swaps the tooltip's TEXT when
   the copy lands, which is what `components-copybutton--default@copied`
   records: the button gains `copy-btn--animating copy-btn--fade-in` and
   nothing else in the tree changes.

   SO THIS FRAGMENT KEEPS THE TOOLTIP CHROME THE SINK DECLINES EVERYWHERE
   ELSE, and that is a deliberate exception rather than an oversight. The
   standing call — recorded in sink/tooltip.html and in check-ancestry's
   KNOWN — is that the sink demos the component and not the story's HOVER
   HINT. Here the tooltip is not a hint about the button; it is the button's
   only output. Decline it and the component has no way to tell you it worked.

   `--animating` GATES THE OTHER TWO. The rules are
   `.copy-btn.copy-btn--animating.copy-btn--fade-in` and `…--fade-out`, so
   the animating class must be present for either fade to apply, and removing
   it is what resets the button. That ordering is why this file adds two
   classes and removes two.

   NO CLIPBOARD PERMISSION IS REQUESTED AND NONE IS NEEDED. navigator.clipboard
   .writeText resolves in a secure context on a user gesture; where it is
   unavailable — an insecure origin, or a browser that declines — the catch
   still runs the feedback, because a copy button that goes silent is worse
   than one that lies about a copy the user can verify by pasting. The failure
   is reported to the console, not to the page.

   WHAT IS COPIED is `data-rux-copy` on the button, or the text of the element
   its `data-rux-copy-from` names. A page that needs neither owns the click.
   ========================================================================== */

/* BEHAVIOUR: verified-live · read 2026-08-31 on
   https://react.carbondesignsystem.com/iframe.html?id=components-copybutton--default
   and its `@copied` state recipe in docs/carbon-react-states.json.
   Confirmed there, not inferred here: the copied state adds exactly
   `cds--copy-btn--animating` and `cds--copy-btn--fade-in` to the button, the
   DOM is otherwise identical, and no `copy-btn__feedback` element exists in
   either capture.
   NOT VERIFIED LIVE: the timings. Carbon's React component takes a
   `feedbackTimeout` prop defaulting to 2000ms; no clock was measured on the
   running story, so the 2000/240 pair here follows that prop and the
   stylesheet's own transition duration rather than a reading. */

(function () {
  'use strict';

  var BTN = '.rux--copy-btn';
  var ANIMATING = 'rux--copy-btn--animating';
  var FADE_IN = 'rux--copy-btn--fade-in';
  var FADE_OUT = 'rux--copy-btn--fade-out';
  var SHOW_MS = 2000;   // Carbon's feedbackTimeout default
  var FADE_MS = 240;    // long enough for the stylesheet's own fade

  var OPEN = 'rux--popover--open';
  var timers = new WeakMap();

  function containerOf(btn) { return btn.closest('.rux--popover-container'); }

  function tooltipTextOf(btn) {
    var container = containerOf(btn);
    return container && container.querySelector('.rux--tooltip-content');
  }

  function payload(btn) {
    if (btn.hasAttribute('data-rux-copy')) return btn.getAttribute('data-rux-copy');
    var from = btn.getAttribute('data-rux-copy-from');
    var el = from && document.getElementById(from);
    return el ? el.textContent.trim() : '';
  }

  function feedback(btn) {
    var text = tooltipTextOf(btn);
    var container = containerOf(btn);
    var previous = timers.get(btn);
    if (previous) { clearTimeout(previous.show); clearTimeout(previous.out); }
    if (text && !text.dataset.ruxCopyIdle) text.dataset.ruxCopyIdle = text.textContent;

    btn.classList.add(ANIMATING, FADE_IN);
    btn.classList.remove(FADE_OUT);
    // THE MODULE OPENS THE POPOVER, because nothing else does. Measured
    // 2026-08-31: the tooltip content is 0x0 until its container carries
    // `popover--open` -- sink/tooltip.html records that the visibility comes
    // from `.rux--popover--open > .rux--popover > .rux--popover-content` and
    // that `tooltip--visible` styles nothing. js/popover.js claims a container
    // on click, but a copy button's click is its own, so the feedback text was
    // changing inside a box of zero size. Keeping the tooltip chrome is only
    // justified if the chrome actually opens.
    if (container) container.classList.add(OPEN);
    if (text) text.textContent = btn.getAttribute('data-rux-copy-feedback') || 'Copied!';

    var show = setTimeout(function () {
      btn.classList.remove(FADE_IN);
      btn.classList.add(FADE_OUT);
      var out = setTimeout(function () {
        // ANIMATING LAST: it gates both fade rules, so dropping it first would
        // cut the fade-out mid-transition.
        btn.classList.remove(FADE_OUT, ANIMATING);
        if (container) container.classList.remove(OPEN);
        if (text && text.dataset.ruxCopyIdle) text.textContent = text.dataset.ruxCopyIdle;
        timers.delete(btn);
      }, FADE_MS);
      timers.set(btn, { show: show, out: out });
    }, SHOW_MS);
    timers.set(btn, { show: show, out: null });
  }

  document.addEventListener('click', function (event) {
    if (!(event.target instanceof Element)) return;
    var btn = event.target.closest(BTN);
    if (!btn || btn.disabled) return;
    var value = payload(btn);
    if (!value) { feedback(btn); return; }
    try {
      var write = navigator.clipboard && navigator.clipboard.writeText(value);
      if (write && write.catch) write.catch(function (err) { console.warn('rux copy-button:', err); });
    } catch (err) {
      console.warn('rux copy-button:', err);
    }
    feedback(btn);
  });

  window.Rux = window.Rux || {};
  window.Rux.copyButton = { feedback: feedback };
})();
