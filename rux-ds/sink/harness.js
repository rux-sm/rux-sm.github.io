//
// KITCHEN-SINK HARNESS ONLY. This is not the design system's behaviour layer.
//
// Phase 5 writes the real one: an overlay kernel owning outside-press, Escape and
// focus trapping, with full keyboard and ARIA lifecycle (roadmap §4.5). This file
// exists so the sink can DEMONSTRATE components rather than freeze them open — it
// toggles the same state classes Carbon's CSS already reacts to, and does nothing
// else. No focus management, no keyboard support beyond Escape, no aria wiring
// past the attribute each toggle owns.
//
// Every class named here was read out of the compiled CSS, not invented.
//
//
// WHAT HAS LEFT THIS FILE, and what is still here.
//
// Moved to js/, with real focus management, keyboard support and ARIA:
//   modal · popover · tooltip · menu · overflow menu · list box · tabs ·
//   accordion · data table · toggle · number steppers · search clear ·
//   checkbox indeterminate · UI shell
//
// Deleted outright, because the component no longer ships (Phase 3):
//   copy button (CUT) · content switcher (CUT) · toggletip (CUT) ·
//   combo box (CUT) · multiselect (DEFER) · tree view (DEFER) · slider (DEFER)
// Their fragments live in sink/deferred/. Driving markup that is not on the
// page is not harmless — it is code nobody can test and nobody will delete.
//
// Still here, and staying: the two demo conveniences that were never
// component behaviour — cancelling in-page anchor jumps so a clickable tile
// does not throw the reader up the page, and the theme switcher. Neither
// belongs to a component, so neither has a module to move to.
//
(() => {
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // The Element guard is not defensive noise. A real click lands on an
  // Element, but an event DISPATCHED at document — which is how the Phase 5
  // modules are exercised, and how any test drives Escape — makes the target
  // `document`, which has no .closest. rux-ui carries the same guard on its
  // own document handlers for the same reason.
  const on = (sel, ev, fn) => document.addEventListener(ev, e => {
    if (!(e.target instanceof Element)) return;
    const t = e.target.closest(sel); if (t) fn(t, e);
  });

  // ---- demo links must not navigate --------------------------------------
  // The fragments use real anchors on purpose: a clickable tile IS an <a> in
  // Carbon, and so is every breadcrumb and link item. Faking them as <div>s to
  // stop the jump would break the markup this project exists to preserve.
  //
  // But the sink is ONE page, so `href="#tile"` resolves to the tile section
  // and the browser scrolls there — which reads as "clicking the tile threw me
  // up the page". Cancel navigation inside .ks-main only; the left nav's links
  // are the one place a hash jump is the intended behaviour.
  document.addEventListener('click', e => {
    if (e.target.closest('.ks-main a[href^="#"]')) e.preventDefault();
  });

  // ---- theme -------------------------------------------------------------
  $$('[data-set-theme]').forEach(b =>
    b.addEventListener('click', () => document.documentElement.dataset.theme = b.dataset.setTheme));

  // ---- dismissal is not this file's job any more --------------------------
  // Escape and outside-press both lived here and both are gone. js/overlay.js
  // owns them for every registered surface, dismisses only the TOPMOST rather
  // than everything at once, and presses on pointerdown in the capture phase so
  // a surface settles before the pressed control takes focus. Nothing the
  // harness still drives is dismissible, so there is nothing left to hand over.
})();
