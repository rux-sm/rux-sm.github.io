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
   `pinHtml({ number, hue, heading, moving, chosen, light, tone, parked,
   stale })` is a bus's pin: its number on its trip's colour, with an arrow
   turned the way it heads while it moves, ringed by the light its bar casts,
   `light` the bar's `data-light` and `tone` its worst warning's, error or
   warning, as app.css draws them; a bus on no trip is `parked`, small and
   grey, and one Samsara has no fresh reading of is `stale`, faded.
   `groupHtml({ members, hue, tone, parked, stale })` is one pin for buses
   too close to tell apart: each number in it, `members` { id, number,
   chosen }, a press on a number being a press on that bus.
   `groups(points, [w, h])` joins the buses whose pins overlap, standing
   less than `w` pixels apart across and `h` down, `points` { id, xy } in
   screen pixels, into lists of ids.
   `lightOf(bus)` is that light from samsara-now's bus, as road-bar.js
   works it out for the board.
   `drawLeg(map, s)` draws a bus's leg in a layer of its own and hands the
   layer back: the path driven, a dashed line from the bus on to its next
   stop, and each stop a ring, filled once reached. `s` is { path, here,
   stop, at, stops, reached, clock, ahead }, road.js's reading of the leg;
   `ahead`, when there is one, is the road on from the bus through every stop
   still to come: the dashed line follows its drive to the next stop in place
   of a straight one, and the drives after are a fainter dotted line under
   it, since a way home that retraces the road would otherwise hide the
   dashes.
   `aheadOf(s)` works that road out from places.js's drives, resolving to
   one line of [lat, lng] points for each drive, or null when one is missing;
   the first, from where the bus was, is drawn from the bus on.
   `trailOf(path, now)` is the last `TRAIL_MS` of a path, the faint tail
   every bus out leaves on the Live map.
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

  const TRAIL_MS = 3600e3;

  const style = () => {
    const [r, g, b] = (getComputedStyle(document.body).backgroundColor.match(/\d+/g) || [255, 255, 255]).map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128 ? 'dark-matter-brown' : 'osm-bright';
  };

  /* The arrow is the sprite's glyph copied in, since Chrome paints no `<use>`
     of the hidden sprite inside Leaflet's layers. */
  const ARROW = '#m-arrow_upward-fill';
  const glyph = () => document.getElementById(ARROW.slice(1))?.innerHTML ?? '';
  const pinClass = ({ hue, chosen, parked, stale }) => ['scheduler-live-pin',
    parked ? 'scheduler-live-pin--parked' : `scheduler-bar--${hue}`,
    chosen && 'scheduler-live-pin--chosen', stale && 'scheduler-live-pin--stale'].filter(Boolean).join(' ');
  function pinHtml({ number, hue, heading, moving, chosen, light, tone, parked, stale }) {
    const arrow = heading != null && moving
      ? `<svg class="scheduler-live-pin__arrow" width="14" height="14" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" style="rotate:${heading}deg">${glyph()}</svg>` : '';
    const lit = `${light ? ` data-light="${light}"` : ''}${tone ? ` data-tone="${tone}"` : ''}`;
    return `<div class="${pinClass({ hue, chosen, parked, stale })}"${lit}>${arrow}<span>${number}</span></div>`;
  }
  function groupHtml({ members, hue, tone, parked, stale }) {
    const numbers = members.map(m => `<span class="scheduler-live-pin__member${m.chosen ? ' scheduler-live-pin__member--chosen' : ''}" data-bus-id="${m.id}">${m.number}</span>`).join('');
    return `<div class="${pinClass({ hue, parked, stale })} scheduler-live-pin--group"${tone ? ` data-tone="${tone}"` : ''}>${numbers}</div>`;
  }

  /* Each pin joins the first group with a pin it overlaps, so a convoy
     reads as one pin. */
  function groups(points, [w, h]) {
    const out = [];
    for (const p of points) {
      const g = out.find(list => list.some(q => Math.abs(q.xy[0] - p.xy[0]) < w && Math.abs(q.xy[1] - p.xy[1]) < h));
      if (g) g.push(p); else out.push([p]);
    }
    return out.map(list => list.map(p => p.id));
  }

  function lightOf(bus) {
    const moving = bus.engine === 'on' && bus.mph > 0;
    return bus.engine == null ? 'scan' : moving ? 'run' : bus.engine === 'off' ? 'off' : 'idle';
  }

  /* The drive to the next stop from the point on it nearest the bus, since
     it was worked out from where the bus was a few minutes before. */
  function fromBus(line, here) {
    let best = 0, least = Infinity;
    line.forEach((p, i) => {
      const d = (p[0] - here[0]) ** 2 + ((p[1] - here[1]) * Math.cos(here[0] * Math.PI / 180)) ** 2;
      if (d < least) { least = d; best = i; }
    });
    return [here, ...line.slice(best + 1)];
  }

  function drawLeg(map, s) {
    const L = window.L;
    const layer = L.layerGroup().addTo(map);
    const path = (s.path || []).map(p => [p[0], p[1]]);
    if (path.length > 1) L.polyline(path, { className: 'scheduler-live-path', interactive: false }).addTo(layer);
    const later = s.ahead?.slice(1).flat() ?? [];
    if (later.length > 1) L.polyline(later, { className: 'scheduler-live-later', interactive: false }).addTo(layer);
    if (s.here && s.ahead?.length) L.polyline(fromBus(s.ahead[0], s.here), { className: 'scheduler-live-ahead', interactive: false }).addTo(layer);
    else if (s.stop && !s.at && s.here && s.stop.point) {
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

  /* The road from the bus on through each stop still to come, a stop it is
     at counted as passed: places.js's drive between each two, each asked once
     and kept there, but for the first, from wherever the bus is. */
  async function aheadOf(s) {
    if (!s.here) return null;
    const from = s.at ? s.reached + 1 : s.stops.indexOf(s.stop);
    const rest = from < 0 ? [] : s.stops.slice(from).filter(x => x.point);
    if (!rest.length) return null;
    const legs = [s.here, ...rest.map(x => x.point)];
    const lines = await Promise.all(legs.slice(1).map((to, i) => window.SchedulerPlaces
      .drive({ lat: legs[i][0], lng: legs[i][1] }, { lat: to[0], lng: to[1] }).catch(() => null)));
    if (lines.some(d => !d?.line?.length)) return null;
    return lines.map(d => d.line);
  }

  const trailOf = (path, now = Date.now()) => (path || []).filter(p => p[2] >= now - TRAIL_MS).map(p => [p[0], p[1]]);

  window.SchedulerLiveMap = { TRAIL_MS, load, style, pinHtml, groupHtml, groups, lightOf, drawLeg, pointsOf, aheadOf, trailOf };
})();
