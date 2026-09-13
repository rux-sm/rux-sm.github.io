/* ==========================================================================
   THE DIAGRAM PANEL — this project's own, linked only by a page that carries
   a diagram (tools/build.mjs passes it to page()).
   --------------------------------------------------------------------------
   THE PAGE IS WHOLE WITHOUT THIS FILE, which is the rule every behaviour here
   is written to. A node is a `<details>` and its panel is CSS: it opens, it
   closes from its own tile, and the `name` attribute already limits the map to
   one open panel at a time — all of that is the platform's and none of it is
   below. This file adds the two things a DETACHED panel needs and a panel
   anchored under its tile did not.

   A CLOSE BUTTON, BUILT HERE RATHER THAN SHIPPED IN THE MARKUP. The panel is
   fixed to the right edge, so the tile that opened it can be scrolled out of
   sight and "click the tile again" stops being a way out. The button is created
   by the script that handles it, never rendered by the generator, because a
   button in the markup with no handler behind it is an affordance that lies —
   the same rule the shell applies to its own sign-in button.

   ESCAPE CLOSES IT, which is what a reader expects of anything that floats over
   the page. This does NOT dismiss on an outside press: the panel is read
   against the map, and clicking the map to compare a node with the one you have
   open is the ordinary way to use both. That is the same judgement rux-ds's
   js/ui-shell.js records for the side nav, and for the same reason.

   FOCUS GOES BACK TO THE TILE on close, so a keyboard reader is returned to
   where they were rather than to the top of the document.
   ========================================================================== */
(() => {
  'use strict';

  const nodes = document.querySelectorAll('.ln-dg-node');
  if (!nodes.length) return;

  const closeNode = node => {
    if (!node?.open) return;
    node.open = false;
    node.querySelector(':scope > summary')?.focus();
  };

  for (const node of nodes) {
    const panel = node.querySelector(':scope > .ln-dg-detail');
    if (!panel) continue;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ln-dg-close';
    button.setAttribute('aria-label', 'Close');
    // The sprite is inlined into every page by the generator, so #i-close is
    // a same-document reference and needs no fetch.
    button.innerHTML = '<svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-close"/></svg>';
    button.addEventListener('click', () => closeNode(node));
    panel.prepend(button);
  }

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeNode(document.querySelector('.ln-dg-node[open]'));
  });
})();
