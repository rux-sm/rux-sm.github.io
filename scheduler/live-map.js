/* ==========================================================================
   Rux Scheduler — LIVE MAP, a bus and its leg on a street map
   --------------------------------------------------------------------------
   Shared by the Live map page and the board's live card, so both draw a bus
   and its leg alike. places.js's baseMap makes the map; this draws on it,
   in classes app.css colours.

   `load()` loads Leaflet the first time a page without it asks, from
   jsdelivr at the version and hash live.html links, and the bus drawings,
   and resolves once both are there.
   THE BUS DRAWINGS are five pixel views of the coach in `brand/`, up,
   up-right, right, down-right and down, the three facing left their
   mirrors, picked by heading to the nearest 45°, so a drawing is never
   turned and stays sharp; a bus with no heading keeps the last it had, and
   faces right until it has one. bus-paint.js reads them and paints each in
   its bus's own paint from the Fleet page. app.css rings each with a 1px
   outline in the page's icon ink, light on the dark map and dark on the
   light one.
   `style()` is the tiles for the page's own background: the light street
   map on a light page and the dark one on a dark page.
   `pinHtml({ id, number, paint, heading, hue, chosen, light, tone, parked,
   stale })` is a bus's pin: its drawing in its paint, centred on where it
   is, and beside it its number on its trip's colour, ringed by the light its
   bar casts, `light` the bar's `data-light` and `tone` its worst warning's,
   error or warning, as app.css draws them; a bus on no trip is `parked`,
   its number small and grey, and one Samsara has no fresh reading of is
   `stale`, faded.
   `groupHtml({ members, hue, tone, parked, stale })` is one pin for buses
   too close to tell apart: their drawings one behind the next and every
   number in one label, `members` { id, number, paint, heading, chosen }, a
   press on a drawing or a number being a press on that bus.
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
   `ahead(busId, s, redraw)` is that road for a bus, one line of [lat, lng]
   points for each drive from places.js, or null until it comes or when a
   drive is missing; it is kept for the bus and worked out again when its
   next stop changes or every `AHEAD_MS`, as road.js's arrivals are, and
   `redraw` is called when new lines come. The first line, from where the
   bus was, is drawn from the bus on.
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
  function leaflet() {
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

  // The five views, read once by bus-paint.js, or '' where one did not come.
  const VIEWS = ['bus-1-up', 'bus-2-up-right', 'bus-3-right', 'bus-4-down-right', 'bus-5-down'];
  let views = null, viewing = null;
  const readViews = () => (viewing ??= Promise.all(VIEWS.map(window.SchedulerBusPaint.read)).then(list => { views = list; }));
  const load = () => Promise.all([leaflet(), readViews()]).then(() => window.L);

  // The way each bus last faced, by its id, for a reading with no heading.
  const facing = new Map();
  function busHtml(id, paint, heading) {
    if (heading != null) facing.set(id, heading);
    const turn = Math.round((facing.get(id) ?? 90) / 45) % 8;
    const view = views?.[turn <= 4 ? turn : 8 - turn];
    if (!view) return '';
    return `<span class="scheduler-live-bus${turn > 4 ? ' scheduler-live-bus--mirrored' : ''}" data-bus-id="${id}">${window.SchedulerBusPaint.painted(view, paint)}</span>`;
  }

  const TRAIL_MS = 3600e3;
  const AHEAD_MS = 5 * 60e3;

  const style = () => {
    const [r, g, b] = (getComputedStyle(document.body).backgroundColor.match(/\d+/g) || [255, 255, 255]).map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128 ? 'dark-matter-brown' : 'osm-bright';
  };

  const pinClass = ({ hue, chosen, parked }) => ['scheduler-live-pin',
    parked ? 'scheduler-live-pin--parked' : `scheduler-bar--${hue}`,
    chosen && 'scheduler-live-pin--chosen'].filter(Boolean).join(' ');
  const markClass = (stale, more = '') => `scheduler-live-mark${more}${stale ? ' scheduler-live-mark--stale' : ''}`;
  function pinHtml({ id, number, paint, heading, hue, chosen, light, tone, parked, stale }) {
    const lit = `${light ? ` data-light="${light}"` : ''}${tone ? ` data-tone="${tone}"` : ''}`;
    return `<div class="${markClass(stale)}">${busHtml(id, paint, heading)}<div class="${pinClass({ hue, chosen, parked })}"${lit}><span>${number}</span></div></div>`;
  }
  function groupHtml({ members, hue, tone, parked, stale }) {
    const buses = members.map(m => busHtml(m.id, m.paint, m.heading)).join('');
    const numbers = members.map(m => `<span class="scheduler-live-pin__member${m.chosen ? ' scheduler-live-pin__member--chosen' : ''}" data-bus-id="${m.id}">${m.number}</span>`).join('');
    return `<div class="${markClass(stale, ' scheduler-live-mark--group')}"><span class="scheduler-live-mark__buses">${buses}</span>`
      + `<div class="${pinClass({ hue, parked })} scheduler-live-pin--group"${tone ? ` data-tone="${tone}"` : ''}>${numbers}</div></div>`;
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

  const aheads = new Map();
  function ahead(busId, s, redraw) {
    const key = `${s.stop?.key ?? ''}|${s.at ? 'at' : ''}`;
    const had = aheads.get(busId);
    if (had && had.key === key && Date.now() - had.at < AHEAD_MS) return had.lines;
    const entry = { key, at: Date.now(), lines: had?.key === key ? had.lines : null };
    aheads.set(busId, entry);
    aheadOf(s).then(lines => {
      if (aheads.get(busId) !== entry) return;
      entry.lines = lines;
      redraw();
    }, () => {});
    return entry.lines;
  }

  const trailOf = (path, now = Date.now()) => (path || []).filter(p => p[2] >= now - TRAIL_MS).map(p => [p[0], p[1]]);

  window.SchedulerLiveMap = { TRAIL_MS, load, style, pinHtml, groupHtml, groups, lightOf, drawLeg, pointsOf, ahead, trailOf };
})();
