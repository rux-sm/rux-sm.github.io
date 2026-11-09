/* ==========================================================================
   Rux Scheduler — BUS PAINT, a bus's drawing in its own paint
   --------------------------------------------------------------------------
   Every drawing of a bus takes its paint here, so they take it alike;
   the Live map's coaches use it. The drawings are pixel art in
   `brand/`, their paint in key colours that each bus's own from the Fleet
   page takes the place of: #FF00FF the paint, and #CC00CC, #990099 and
   #660066 shades of it, 12, 24 and 30% darker. Glass and tyres are black
   in every drawing, so every paint is first lifted off black by a floor of
   36, the darkest step that still parts from them, keeping the rest of its
   range: a channel v becomes floor + v × (255 − floor) / 255. Black draws as
   #242424 and charcoal #303030 as #4D4D4D, a step apart, and a light paint
   barely moves. A bus with no paint is drawn grey. LOOK holds these
   figures, and the black of glass and tyres and the grey of the hubs, as
   the drawings write them.

   `read(name)` is the markup of `brand/<name>.svg`, read once, with its ids,
   prolog, width and height gone, its edges crisp and hidden from a screen
   reader; '' where it did not come. CSS sizes it, whole pixels kept whole.
   `painted(markup, paint, look)` is that markup in a bus's paint, by LOOK
   or by `look`, which the components page's Bus drawings set to try other
   figures.
   ========================================================================== */
(() => {
  'use strict';

  const LOOK = Object.freeze({ floor: 36, side: 0.12, end: 0.24, detail: 0.3, black: '#000000', hub: '#8d8d8d' });
  const NO_PAINT = '#8d8d8d';
  const SHADE_OF = { cc00cc: 'side', '990099': 'end', '660066': 'detail' };
  const BRAND = new URL('brand/', document.currentScript?.src ?? location.href);

  const reading = new Map();
  function read(name) {
    if (!reading.has(name)) {
      reading.set(name, fetch(new URL(`${name}.svg`, BRAND))
        .then(r => (r.ok ? r.text() : ''))
        .then(text => {
          const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
          if (svg.nodeName !== 'svg') return '';
          for (const n of svg.querySelectorAll('[id]')) n.removeAttribute('id');
          svg.removeAttribute('id');
          svg.removeAttribute('width');
          svg.removeAttribute('height');
          Object.entries({ 'shape-rendering': 'crispEdges', 'aria-hidden': 'true' }).forEach(([k, v]) => svg.setAttribute(k, v));
          return svg.outerHTML;
        })
        .catch(() => ''));
    }
    return reading.get(name);
  }

  const channels = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const hexOf = c => `#${c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  function painted(markup, paint, look = LOOK) {
    const base = channels(/^#[0-9a-f]{6}$/i.test(paint ?? '') ? paint : NO_PAINT).map(v => look.floor + v * (255 - look.floor) / 255);
    const fixed = { '000000': look.black, '8d8d8d': look.hub };
    return markup.replace(/#(ff00ff|cc00cc|990099|660066|000000|8d8d8d)\b/gi, (_, key) => {
      const k = key.toLowerCase();
      return fixed[k] ?? hexOf(base.map(v => v * (1 - (look[SHADE_OF[k]] ?? 0))));
    });
  }

  window.SchedulerBusPaint = { LOOK, read, painted };
})();
