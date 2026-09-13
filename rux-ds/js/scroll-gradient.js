/* ==========================================================================
   rux-ds — SCROLL GRADIENT                             Phase 5, roadmap §4.5
   --------------------------------------------------------------------------
   Requires nothing. Paint over a scroller, not a surface over the page, so it
   never joins the dismiss stack.

   THE FADE IS IN NO STYLESHEET, AND THAT IS NOT A GAP IN THIS BUILD.
   @carbon/styles compiles the geometry only — position, z-index, a 3rem edge,
   the insets — sets all four edge elements to `display: none`, never turns
   them back on, and declares no background or colour anywhere. css/rux.css
   matches it declaration for declaration. React writes the fade inline while
   it watches the scroll position, which is also why the stylesheet ships
   rules keyed on data attributes no static page sets.

   SO THIS MODULE WRITES INLINE STYLE, and only what was read off the running
   component. ui-shell's note says a behaviour layer should not write paint,
   and it should not when a class can carry the state. Here none can: there is
   no compiled rule to switch on in either stylesheet, and writing one would
   be inventing a colour Carbon never shipped. Every declaration below was
   copied off the element it lands on, at a scroll position named in the
   label.

   IT FADES TO layer-01, SO IT BELONGS ON A layer-01 SURFACE. That is Carbon's
   token choice, not this module's; on any other ground the closed edge reads
   as a pale band. sink/scroll-gradient.html carries `ks-layer` for that
   reason and says so.
   ========================================================================== */

/* BEHAVIOUR: verified-live · driven 2026-09-11 on
   https://ibm-products.carbondesignsystem.com/iframe.html?id=utilities-scrollgradient--scroll-gradient-vertical
   and https://ibm-products.carbondesignsystem.com/iframe.html?id=utilities-scrollgradient--scroll-gradient-x-and-y-axis

   READ AS INLINE STYLE OFF EACH EDGE, at three scroll positions on the x-and-y
   story — origin, scrolled on both axes, and at the far end of both:

     start-vertical    right: 0 · linear-gradient(0deg, transparent,
                       var(--cds-layer-01) 90%)
     end-vertical      right: 0; bottom: 0 · linear-gradient(0deg,
                       var(--cds-layer-01) 10%, transparent)
     end-horizontal    right: 0; bottom: 0 · linear-gradient(-90deg,
                       var(--cds-layer-01) 10%, transparent)
     start-horizontal  no background-image in any of the three states

   Each carries `opacity` and `display` together — 1/block when its edge has
   content beyond it, 0/none when it does not. The pairing is Carbon's and it
   means the change cannot be transitioned, since `display: none` ends any
   animation whatever opacity says. Kept as read rather than improved.

   THE TOKEN IS THE ONLY SUBSTITUTION: `--cds-layer-01` becomes
   `--rux-layer-01`, the same token under this prefix. The stops (90%, 10%)
   and angles (0deg, -90deg) are Carbon's numbers.

   NOT REIMPLEMENTED, each a deliberate decline:
     · Carbon's IntersectionObserver. It observes sentinel elements inside the
       content; the capture recorded those elements stripped of the data
       attributes that identify them, so there is nothing to observe and no
       capture to build one from. The scroller's own offsets are read instead,
       which give the same four answers.
     · The x-none and y-none modifiers. Both are in the capture, neither has a
       compiled rule (§4.1.12), and Carbon's root carries them unchanged at
       every scroll position, so they hold no state.
     · The blank start-horizontal edge. Carbon gives it opacity 1 and display
       block and NEVER a background-image, so scrolling right opens a 48px
       transparent block and no fade. The other three all carry one. That
       reads as an upstream oversight rather than a decision; its mirror is
       one line, below, commented out, because uncommenting it paints a
       gradient Carbon does not.

   NOT VERIFIED: whether Carbon repaints on resize or on content change. Only
   scrolling was driven. This module also recomputes on resize, which is doing
   slightly more than was observed rather than less. */

(function () {
  'use strict';

  var ROOT = '.rux--scroll-gradient';
  var SCROLLER = '.rux--scroll-gradient__content';

  // EVERY SELECTOR IS SPELLED IN FULL, never built from a stem plus a name.
  // check-classes reads string literals out of js/ and cannot tell a selector
  // from a fragment of one, so building a selector by concatenating the block
  // prefix with an element name reported that bare prefix as an undefined
  // class and failed the build. Writing this note out with the offending
  // literal quoted failed it a second time, which is the clearest statement
  // of the rule there is: the parser does not read comments differently from
  // code. js/date-picker.js hit the same edge from prose the same day. Both
  // are the cost of one regex standing in for a JS parser, and the cheap side
  // of that trade is spelling names out and describing them in words.

  // THE FOUR EDGES, each with the declarations read off Carbon's element.
  // `paint` is null where Carbon writes none — see the header.
  var EDGES = [
    {
      name: 'start-vertical',
      sel: '.rux--scroll-gradient__start-vertical',
      axis: 'y',
      needs: 'rux--scroll-gradient--y-scrollable',
      inset: { right: '0px' },
      paint: 'linear-gradient(0deg, transparent, var(--rux-layer-01) 90%)',
      shown: function (el) { return el.scrollTop > 0; },
    },
    {
      name: 'end-vertical',
      sel: '.rux--scroll-gradient__end-vertical',
      axis: 'y',
      needs: 'rux--scroll-gradient--y-scrollable',
      inset: { right: '0px', bottom: '0px' },
      paint: 'linear-gradient(0deg, var(--rux-layer-01) 10%, transparent)',
      shown: function (el) { return el.scrollTop + el.clientHeight < el.scrollHeight - 1; },
    },
    {
      name: 'start-horizontal',
      sel: '.rux--scroll-gradient__start-horizontal',
      axis: 'x',
      needs: 'rux--scroll-gradient--x-scrollable',
      inset: {},
      // Carbon writes no background-image on this edge, in any state. Its
      // mirror would be the line below; it stays commented because painting
      // it is this layer inventing a gradient rather than reproducing one.
      // paint: 'linear-gradient(90deg, var(--rux-layer-01) 10%, transparent)',
      paint: null,
      shown: function (el) { return el.scrollLeft > 0; },
    },
    {
      name: 'end-horizontal',
      sel: '.rux--scroll-gradient__end-horizontal',
      axis: 'x',
      needs: 'rux--scroll-gradient--x-scrollable',
      inset: { right: '0px', bottom: '0px' },
      paint: 'linear-gradient(-90deg, var(--rux-layer-01) 10%, transparent)',
      shown: function (el) { return el.scrollLeft + el.clientWidth < el.scrollWidth - 1; },
    },
  ];

  function claim(root) {
    var scroller = root.querySelector(SCROLLER);
    if (!scroller || root.hasAttribute('data-rux-scroll-gradient')) return;
    root.setAttribute('data-rux-scroll-gradient', '');

    var live = EDGES
      .map(function (edge) {
        if (!root.classList.contains(edge.needs)) return null;
        var el = root.querySelector(edge.sel);
        return el ? { edge: edge, el: el } : null;
      })
      .filter(Boolean);
    if (!live.length) return;

    // The insets and the paint never change; only display and opacity do.
    // Written once so the scroll handler stays to two properties.
    live.forEach(function (pair) {
      Object.keys(pair.edge.inset).forEach(function (side) {
        pair.el.style[side] = pair.edge.inset[side];
      });
      if (pair.edge.paint) pair.el.style.backgroundImage = pair.edge.paint;
    });

    function paint() {
      live.forEach(function (pair) {
        var on = pair.edge.shown(scroller);
        pair.el.style.display = on ? 'block' : 'none';
        pair.el.style.opacity = on ? '1' : '0';
      });
    }

    scroller.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  function claimAll() {
    Array.prototype.forEach.call(document.querySelectorAll(ROOT), claim);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', claimAll);
  else claimAll();
})();
