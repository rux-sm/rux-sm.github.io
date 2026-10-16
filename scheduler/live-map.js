/* ==========================================================================
   Rux Scheduler — LIVE MAP, a bus and its leg on a street map
   --------------------------------------------------------------------------
   Shared by the Live map page and the board's live card, so both draw a bus
   and its leg alike. places.js's baseMap makes the map; this draws on it,
   in classes app.css colours.

   `load()` loads Leaflet the first time a page without it asks, from
   jsdelivr at the version and hash live.html links, and resolves once
   `window.L` is there.
   `style()` is the tiles for the page's own background: the light street
   map on a light page and the dark one on a dark page.
   `pinHtml({ number, hue, heading, moving, chosen, light, tone })` is a
   bus's pin: its number on its trip's colour, with an arrow turned the way it
   heads while it moves, ringed by the light its bar casts, `light` the bar's
   `data-light` and `tone` a warning's, as app.css draws them.
   `lightOf(bus)` is that light from samsara-now's bus, as the board's
   roadBar works it out.
   `drawLeg(map, s)` draws a bus's leg in a layer of its own and hands the
   layer back: the path driven, a dashed line from the bus on to its next
   stop, and each stop a ring, filled once reached. `s` is { path, here,
   stop, at, stops, reached, clock }, road.js's reading of the leg.
   `pointsOf(s)` is every point of the leg, for the view to hold.
   ========================================================================== */
(() => {
  'use strict';

  const LEAFLET = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/';
  const CSS_HASH = 'sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H';
  const JS_HASH = 'sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH';
  let loading = null;
  function load() {
    if (window.L) return Promise.resolve(window.L);
    loading ??= new Promise((resolve, reject) => {
      const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${LEAFLET}leaflet.css`, integrity: CSS_HASH, crossOrigin: 'anonymous' });
      const js = Object.assign(document.createElement('script'), { src: `${LEAFLET}leaflet.js`, integrity: JS_HASH, crossOrigin: 'anonymous' });
      js.onload = () => resolve(window.L);
      js.onerror = () => { loading = null; reject(new Error('Leaflet did not load')); };
      document.head.append(css, js);
    });
    return loading;
  }

  const style = () => {
    const [r, g, b] = (getComputedStyle(document.body).backgroundColor.match(/\d+/g) || [255, 255, 255]).map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128 ? 'dark-matter-brown' : 'osm-bright';
  };

  /* The arrow is the sprite's glyph copied in, since Chrome paints no `<use>`
     of the hidden sprite inside Leaflet's layers. */
  const ARROW = '#m-arrow_upward-fill';
  const glyph = () => document.getElementById(ARROW.slice(1))?.innerHTML ?? '';
  function pinHtml({ number, hue, heading, moving, chosen, light, tone }) {
    const arrow = heading != null && moving
      ? `<svg class="scheduler-live-pin__arrow" width="14" height="14" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" style="rotate:${heading}deg">${glyph()}</svg>` : '';
    const lit = `${light ? ` data-light="${light}"` : ''}${tone ? ` data-tone="${tone}"` : ''}`;
    return `<div class="scheduler-live-pin scheduler-bar--${hue}${chosen ? ' scheduler-live-pin--chosen' : ''}"${lit}>${arrow}<span>${number}</span></div>`;
  }

  function lightOf(bus) {
    const moving = bus.engine === 'on' && bus.mph > 0;
    const resting = !moving && bus.drivers?.some(d => d.duty === 'sleeper') && !bus.drivers?.some(d => d.duty === 'driving');
    return bus.engine == null ? 'scan' : moving ? 'run' : resting ? 'rest' : bus.engine === 'off' ? 'off' : 'idle';
  }

  function drawLeg(map, s) {
    const L = window.L;
    const layer = L.layerGroup().addTo(map);
    const path = (s.path || []).map(p => [p[0], p[1]]);
    if (path.length > 1) L.polyline(path, { className: 'scheduler-live-path', interactive: false }).addTo(layer);
    if (s.stop && !s.at && s.here && s.stop.point) {
      L.polyline([s.here, s.stop.point], { className: 'scheduler-live-ahead', interactive: false }).addTo(layer);
    }
    s.stops.forEach((stop, i) => {
      if (!stop.point) return;
      const reached = i <= s.reached;
      L.circleMarker(stop.point, { radius: 6, className: `scheduler-live-stop${reached ? ' scheduler-live-stop--reached' : ''}` })
        .bindTooltip(`${stop.name}${stop.due != null ? ` · ${s.clock(stop.due)}` : ''}`, { direction: 'top', offset: [0, -6] })
        .addTo(layer);
    });
    return layer;
  }

  const pointsOf = s => [s.here, ...(s.path || []).map(p => [p[0], p[1]]), ...s.stops.filter(x => x.point).map(x => x.point)].filter(Boolean);

  window.SchedulerLiveMap = { load, style, pinHtml, lightOf, drawLeg, pointsOf };
})();
