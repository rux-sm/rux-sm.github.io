/* ==========================================================================
   live.js — THE LIVE MAP
   --------------------------------------------------------------------------
   live.html answers at a glance whether anything is wrong: every bus Samsara
   has is on the map, and the panel beside it opens with one line, how many
   buses are out, how many need attention and how many are on no trip, and
   when Samsara last answered.

   A bus out is a pin in its trip's colour with an arrow the way it is
   heading, a faint tail of where it went in the last hour, and a tile under
   On the road. The tile says what its bar on the board says: its warnings,
   live-trip.js's, worst first, its driver with the hours they may still
   drive, its speed, and its next stop. On the way to a pickup it gives the
   spot and when the bus arrives; on the way to any other stop, only when it
   arrives, since only the spot is held to. Buses with a warning come first,
   and a pin takes its worst warning's colour. A bus on no trip is a small
   grey pin, and a small tile under Not on a trip. A bus Samsara has heard
   nothing fresh from since it was last seen running, which the board says
   is No signal, is faded, and says when it was last seen; a bus last seen
   with its engine off is parked, however old the reading, as samsara-now
   counts it.
   Pins too close to tell apart are one pin with every number in it.

   The map opens fitted to every bus and then stays where it is put; Show
   all fits them again. Pressing a bus, on the map or its tile, shows it:
   for a bus out, its leg, the path it has driven since it left the yard,
   its stops, filled once reached, and the road on through every stop still
   to come, dashed. live.html?bus=<bus id> opens on that bus, as the board's
   Show on map does. road.js says which stop is next and when the bus gets
   there, so the map and the board always agree.

   samsara-now is asked once a minute while the page is in view, and the
   trips around today are read again every five minutes.
   ========================================================================== */
(() => {
  'use strict';

  const { $, el } = window.SchedulerPair;
  const pair = window.SchedulerPair.page({ list: 'buses', one: 'bus' });
  const { say } = pair;
  const Road = window.SchedulerRoad;
  const Live = window.SchedulerLiveTrip;
  const W = window.SchedulerWeek;
  const Places = window.SchedulerPlaces;
  const LiveMap = window.SchedulerLiveMap;

  const ASK_EVERY = 60e3;
  const TRIPS_EVERY = 5 * 60e3;
  // The road ahead of the pressed bus is worked out again this often, as road.js's arrivals are.
  const AHEAD_EVERY = 5 * 60e3;
  // A pin's size, near enough, so pins that would overlap are joined.
  const PIN_BOX = [56, 26];
  const TONE_RANK = { error: 0, warning: 1 };

  let client = null, road = null, map = null, slow = 0, yard = null;
  let busesById = new Map(), legsByBus = new Map(), answer = null;
  let tripsRead = 0, asked = 0, asking = false, stopped = false;
  let chosen = new URLSearchParams(location.search).get('bus');
  const pins = new Map();
  let legLayer = null, trailLayer = null, fitted = false, states = [];
  let ahead = { busId: null, key: null, at: 0, lines: null };

  const { clock, hours } = Live;
  // A driver by their first name, so their hours and the speed fit the tile.
  const short = name => String(name || '').trim().split(/\s+/)[0];
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayFrom = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  // When a bus was last heard from: the time today, the weekday before.
  const seenWords = at => (new Date(at).toDateString() === new Date().toDateString()
    ? clock(at) : new Date(at).toLocaleDateString([], { weekday: 'short' }));

  const arrivals = Road.arrivals(
    (a, b) => Places.drive(a, b).then(d => (d ? Math.round(d.min * (1 + slow / 100)) : null)),
    () => draw());

  // ── reading ─────────────────────────────────────────────────────────────
  /* A trip with its legs and routes, as trip-shape.js reads them, its crew
     and stop drives, as live-trip.js's lookOf reads them, and `ends`, an
     embed that returns nothing, which the read below tests. */
  const TRIP_COLUMNS = 'id,destination,customer,confirmed,trip_bar_color,trip_type,start_date,end_date,'
    + 'departure_time,return_time,'
    + 'trip_legs(id,leg,kind,start_date,end_date,bus_count,created_at,trip_routes(id,position,name)),'
    + 'trip_stops(id,position,leg,route_id,type,name,address,lat,lng,depart_prev,depart_prev_date,arrive,arrive_date,spot,spot_date,drive,dwell_status),'
    + 'trip_assignments(id,bus_id,leg,route_id,partner_id,active_roles,trip_drivers(id,driver_id,role,also_on)),ends:trip_legs!inner()';

  /* Each bus's legs from yesterday to tomorrow, with when it counts as out
     on each, so a bus is matched to the leg it is out on now: a trip that
     starts by tomorrow, or as many days on as a bus can leave the yard
     before its leg, with a leg that ends, or with no end starts, since two
     days ago. A leg is named by its key, week.js's. */
  async function readTrips() {
    const from = dayFrom(-2), to = dayFrom(Math.max(1, W.AHEAD_DAYS));
    const { data, error } = await client.from('trips').select(TRIP_COLUMNS)
      .is('cancelled_at', null)
      .lte('start_date', to)
      .or(`end_date.gte.${from},start_date.gte.${from}`, { referencedTable: 'ends' });
    if (error) throw error;
    const legs = new Map();
    for (const trip of data || []) {
      for (const leg of W.legsOf(trip)) {
        const span = Road.span(leg);
        if (!span) continue;
        for (const a of trip.trip_assignments || []) {
          if (!a.bus_id || W.legKeyOfVehicle(trip, a) !== leg.key) continue;
          if (!legs.has(a.bus_id)) legs.set(a.bus_id, []);
          legs.get(a.bus_id).push({ trip, assign: a, leg: leg.key, span });
        }
      }
    }
    legsByBus = legs;
    tripsRead = Date.now();
  }

  // The leg a bus is inside the span of now, the latest to start of two.
  const legNow = busId => (legsByBus.get(busId) || [])
    .filter(l => l.span[0] <= Date.now() && Date.now() <= l.span[1])
    .sort((a, b) => b.span[0] - a.span[0])[0] ?? null;

  async function ask() {
    if (stopped || asking || !client || document.hidden) return;
    asking = true;
    try {
      if (Date.now() - tripsRead > TRIPS_EVERY) await readTrips();
      const since = {};
      for (const busId of legsByBus.keys()) {
        const leg = legNow(busId);
        if (leg) since[busId] = leg.span[0];
      }
      road ??= Road.live(client);
      answer = await road.ask(since);
      say(null);
    } catch (error) {
      const status = error?.context?.status;
      if (status === 503) { stopped = true; say('info', 'Samsara is not connected', 'Its key has not been set.'); }
      else if (status === 404) { stopped = true; say('info', 'No buses to show', 'This account cannot read the fleet.'); }
      else say('error', "Samsara didn't answer", 'The map asks again in a minute.');
    } finally {
      asking = false;
      asked = Date.now();
    }
    draw();
  }

  // ── what a bus is doing ─────────────────────────────────────────────────
  /* One bus as the map and the list draw it: whether it is out, its leg and
     trip, the driver at the wheel, whether its reading is old, and, out, its
     next stop and what live-trip.js warns of, as the board reads them. */
  function stateOf(bus) {
    const leg = legNow(bus.bus_id);
    const out = !!leg && Live.outOn(bus, leg.span);
    const here = bus.lat != null ? [bus.lat, bus.lng] : null;
    const wheel = bus.drivers?.find(d => d.wheel) ?? null;
    // Samsara has heard nothing fresh from a bus last seen running, as the board's No signal.
    const stale = bus.engine == null;
    const s = { bus, number: busesById.get(bus.bus_id)?.number ?? '?', out, leg: out ? leg : null, here, wheel, stale, warnings: [] };
    if (!out) return s;
    s.hue = W.hueFor(leg.trip);
    s.stops = Road.stopsOf(leg.trip, leg.leg);
    s.next = Road.nextOn(s.stops, bus, arrivals);
    s.warnings = Live.warningsOf(Live.lookOf({
      trip: leg.trip, assign: leg.assign, span: leg.span, bus, next: s.next,
      others: answer?.buses ?? [], numberOf: id => busesById.get(id)?.number ?? null, yard,
    }));
    s.tone = s.warnings[0]?.tone ?? null;
    return s;
  }

  const motion = b => (b.engine === 'idle' ? 'Idle' : b.engine === 'off' ? 'Off'
    : b.mph ? `${b.mph} mph` : b.mph === 0 ? 'Stopped' : b.engine === 'on' ? 'Running' : 'No reading');
  // What a bus is doing, or when it was last heard from once that is old.
  const doing = s => (s.stale ? (s.bus.seen ? `Last seen ${seenWords(Date.parse(s.bus.seen))}` : 'Not reporting') : motion(s.bus));

  // ── the map ─────────────────────────────────────────────────────────────
  /* live-map.js draws the pins and the leg, as the board's live card does.
     The tiles follow the theme, read off the page's own background. */
  let style = null;
  function styleMap() {
    const want = LiveMap.style();
    if (map && want !== style) { style = want; map.style(want); }
  }

  const pinOf = s => LiveMap.pinHtml({ number: s.number, hue: s.hue, heading: s.bus.heading, moving: s.bus.mph > 0,
    chosen: s.bus.bus_id === chosen, light: s.out ? LiveMap.lightOf(s.bus) : null, tone: s.tone, parked: !s.out, stale: s.stale });
  const worst = list => list.map(s => s.tone).filter(Boolean).sort((a, b) => TONE_RANK[a] - TONE_RANK[b])[0] ?? null;
  function groupOf(list) {
    const sorted = [...list].sort(byNumber);
    return LiveMap.groupHtml({
      members: sorted.map(s => ({ id: s.bus.bus_id, number: s.number, chosen: s.bus.bus_id === chosen })),
      hue: sorted[0].hue, tone: worst(sorted), parked: !sorted[0].out, stale: sorted.every(s => s.stale),
    });
  }

  /* Every bus with a position, the buses out and those on no trip joined
     apart, each join one pin at the middle of its buses. A pin is kept by the
     buses in it, so it moves rather than being made again. */
  function drawPins() {
    const L = window.L;
    const placed = states.filter(s => s.here);
    const want = new Map();
    for (const out of [true, false]) {
      const kind = placed.filter(s => s.out === out);
      const byId = new Map(kind.map(s => [s.bus.bus_id, s]));
      const points = kind.map(s => ({ id: s.bus.bus_id, xy: (({ x, y }) => [x, y])(map.latLngToContainerPoint(s.here)) }));
      for (const ids of LiveMap.groups(points, PIN_BOX)) {
        const list = ids.map(id => byId.get(id));
        const at = [list.reduce((n, s) => n + s.here[0], 0) / list.length, list.reduce((n, s) => n + s.here[1], 0) / list.length];
        want.set(ids.slice().sort().join(' '), { list, at, html: list.length > 1 ? groupOf(list) : pinOf(list[0]) });
      }
    }
    for (const [key, pin] of pins) if (!want.has(key)) { pin.remove(); pins.delete(key); }
    for (const [key, { list, at, html }] of want) {
      let pin = pins.get(key);
      if (!pin) {
        pin = L.marker(at, { keyboard: false, riseOnHover: true,
          icon: L.divIcon({ className: 'scheduler-live-pin-box', html, iconSize: null }) }).addTo(map);
        pin.on('click', e => {
          const id = e.originalEvent?.target?.closest?.('[data-bus-id]')?.dataset.busId ?? pin.ids[0];
          choose(id);
        });
        pins.set(key, pin);
      } else {
        pin.setLatLng(at);
        if (pin.html !== html) pin.setIcon(L.divIcon({ className: 'scheduler-live-pin-box', html, iconSize: null }));
      }
      pin.ids = list.map(s => s.bus.bus_id);
      pin.html = html;
      pin.setZIndexOffset(pin.ids.includes(chosen) ? 1000 : list[0].out ? 500 : 0);
    }
  }

  // The last hour's tail of every bus out, under the pins.
  function drawTrails() {
    trailLayer?.remove();
    trailLayer = window.L.layerGroup().addTo(map);
    for (const s of states) {
      const line = s.out ? LiveMap.trailOf(s.bus.path) : [];
      if (line.length > 1) window.L.polyline(line, { className: 'scheduler-live-trail', interactive: false }).addTo(trailLayer);
    }
  }

  // The chosen bus's leg, as live-map.js draws it.
  const legOf = s => ({ path: s.bus.path, here: s.here, stop: s.next?.stop ?? null, at: !!s.next?.at, stops: s.stops,
    reached: s.next?.where?.reached ?? -1, clock, ahead: ahead.busId === s.bus.bus_id ? ahead.lines : null });

  /* The road ahead of the chosen bus, worked out again when its next stop
     changes or every AHEAD_EVERY, and drawn once it comes. */
  function askAhead(s) {
    const key = `${s.next?.stop?.key ?? ''}|${s.next?.at ? 'at' : ''}`;
    if (ahead.busId === s.bus.bus_id && ahead.key === key && Date.now() - ahead.at < AHEAD_EVERY) return;
    const mine = { busId: s.bus.bus_id, key, at: Date.now(), lines: ahead.busId === s.bus.bus_id ? ahead.lines : null };
    ahead = mine;
    LiveMap.aheadOf(legOf(s)).then(lines => {
      if (ahead !== mine) return;
      mine.lines = lines;
      drawLeg();
    }, () => {});
  }

  function drawLeg() {
    legLayer?.remove();
    const s = states.find(x => x.out && x.bus.bus_id === chosen);
    legLayer = s?.next ? LiveMap.drawLeg(map, legOf(s)) : null;
    if (s?.next) askAhead(s);
  }

  // ── the panel ───────────────────────────────────────────────────────────
  // A warning as a line of its tile: its sign in its colour, its title and its few words.
  const ALERT_ICON = { error: '#i-warning--filled', warning: '#i-warning--alt--filled' };
  function warningLine(w) {
    const line = el('span', `scheduler-live__line scheduler-live__warning scheduler-live__warning--${w.tone}`);
    line.append(window.SchedulerPair.svgUse(ALERT_ICON[w.tone], '16', '0 0 32 32'), el('span', 'scheduler-live__warning-words', `${w.title} · ${w.detail}`));
    line.title = w.sentence;
    return line;
  }

  /* The next stop as two lines: where, and when. A pickup gives its spot and
     when the bus arrives, bold once that is late; any other stop only when
     the bus arrives. */
  function nextLines(s) {
    const n = s.next;
    if (!n?.stop) return n ? [el('span', 'scheduler-live__line', '→ Yard')] : [];
    const name = n.stop.type === 'return' ? 'Yard' : n.stop.name;
    if (n.at) return [el('span', 'scheduler-live__line', `At ${name}`)];
    const lines = [el('span', 'scheduler-live__line', `→ ${name}`)];
    const when = el('span', 'scheduler-live__line scheduler-live__when');
    if (n.stop.type === 'pickup' && n.stop.due != null) when.append(`Spot ${clock(n.stop.due)}`);
    if (n.arrival != null) {
      if (when.childNodes.length) when.append(' · ');
      when.appendChild(el('span', n.late ? 'scheduler-live__late' : '', `arrives ${clock(n.arrival)}`));
    }
    if (when.childNodes.length) lines.push(when);
    return lines;
  }

  /* A bus out on a trip, as a tile that presses to show it on the map: its
     number on its trip's colour, the destination, its warnings, the driver
     at the wheel with their hours, what the bus is doing, and its next stop. */
  function roadTile(s) {
    const item = el('li');
    const chosenNow = s.bus.bus_id === chosen;
    const tile = el('button', `rux--tile rux--tile--selectable scheduler-live__tile${chosenNow ? ' rux--tile--is-selected' : ''}${s.stale ? ' scheduler-live__tile--stale' : ''}`);
    tile.type = 'button';
    tile.setAttribute('aria-pressed', String(chosenNow));
    tile.addEventListener('click', () => choose(s.bus.bus_id));
    const said = el('span', 'scheduler-live__said');
    said.appendChild(el('span', 'scheduler-live__dest', s.leg.trip.destination || 'Trip'));
    said.append(...s.warnings.map(warningLine));
    const who = el('span', 'scheduler-live__line');
    if (s.wheel) {
      who.append(short(s.wheel.name));
      if (s.wheel.left_ms != null) who.appendChild(el('span', `scheduler-live__hours${s.wheel.left_ms < Road.LOW_LEFT ? ' scheduler-live__hours--low' : ''}`, ` ${hours(s.wheel.left_ms)}`));
      who.append(' · ');
    }
    who.append(doing(s));
    said.append(who, ...nextLines(s));
    tile.append(el('span', `scheduler-live__num scheduler-bar--${s.hue}`, s.number), said);
    item.appendChild(tile);
    return item;
  }

  // A bus on no trip, as a small tile that presses to show it: its number, and what it is doing.
  function parkedTile(s) {
    const item = el('li');
    const chosenNow = s.bus.bus_id === chosen;
    const tile = el('button', `rux--tile rux--tile--selectable scheduler-live__yard-tile${chosenNow ? ' rux--tile--is-selected' : ''}`);
    tile.type = 'button';
    tile.setAttribute('aria-pressed', String(chosenNow));
    tile.disabled = !s.here;
    tile.addEventListener('click', () => choose(s.bus.bus_id));
    tile.append(el('span', 'scheduler-live__yard-num', s.number), el('span', 'scheduler-live__line', doing(s)));
    item.appendChild(tile);
    return item;
  }

  const group = words => el('h2', 'scheduler-to-do__group', words);
  // "6 out · 1 needs attention · 3 not on a trip", and when Samsara answered.
  function summary(out, parked) {
    const need = out.filter(s => s.warnings.length).length;
    const box = el('div', 'scheduler-live__summary');
    const line = el('p', 'scheduler-live__counts');
    line.append(`${out.length} out · `,
      el('span', need ? 'scheduler-live__need' : '', `${need} ${need === 1 ? 'needs' : 'need'} attention`),
      ` · ${parked.length} not on a trip`);
    const at = answer?.at ? Date.parse(answer.at) : asked;
    box.append(line, el('p', 'scheduler-live__line', `Updated ${clock(at)}`));
    return box;
  }

  function drawPanel(out, parked) {
    const parts = [summary(out, parked), group('On the road')];
    if (out.length) {
      const list = el('ul', 'scheduler-live__tiles');
      list.append(...out.map(roadTile));
      parts.push(list);
    } else parts.push(el('p', 'rux--tile scheduler-to-do__none', 'No bus is out.'));
    if (parked.length) {
      const list = el('ul', 'scheduler-live__yard');
      list.append(...parked.map(parkedTile));
      parts.push(group('Not on a trip'), list);
    }
    $('scheduler-live-panel').replaceChildren(...parts);
  }

  // Each group by bus number, and On the road with its warned buses first, the worst first.
  const byNumber = (a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
  const byWarning = (a, b) => (TONE_RANK[a.tone] ?? 2) - (TONE_RANK[b.tone] ?? 2) || byNumber(a, b);
  function draw() {
    if (!map || !answer) return;
    styleMap();
    states = (answer.buses || []).map(stateOf).sort(byNumber);
    const out = states.filter(s => s.out).sort(byWarning);
    drawTrails();
    drawPins();
    drawPanel(out, states.filter(s => !s.out));
    drawLeg();
    $('scheduler-live-all').hidden = !states.some(s => s.here);
    if (!fitted) {
      fitted = true;
      const chosenState = states.find(s => s.bus.bus_id === chosen && s.here);
      if (chosenState) focus(chosenState);
      else showAll();
    }
  }

  // The map fitted to every bus with a position.
  function showAll() {
    const points = states.filter(s => s.here).map(s => s.here);
    if (points.length) map.fitBounds(points, { padding: [48, 48], maxZoom: 13 });
  }

  // The map moves to a bus: one out, with its whole leg; one on no trip, to where it is.
  function focus(s) {
    const points = s.out ? LiveMap.pointsOf(legOf(s)) : [];
    if (points.length > 1) map.fitBounds(points, { padding: [48, 48], maxZoom: 15 });
    else map.setView(s.here, 15);
  }

  function choose(busId) {
    chosen = chosen === busId ? null : busId;
    history.replaceState(null, '', chosen ? `live.html?bus=${encodeURIComponent(chosen)}` : 'live.html');
    draw();
    const s = chosen && states.find(x => x.bus.bus_id === chosen);
    if (s?.here) focus(s);
  }

  // ── start ───────────────────────────────────────────────────────────────
  pair.start(async signedIn => {
    client = signedIn;
    const [busRows, settings] = await Promise.all([
      client.from('buses').select('id,number'),
      client.from('settings').select('key,value').in('key', ['route-times-v1', 'yard-location-v1']),
      Places.init(client),
    ]);
    if (busRows.error) throw busRows.error;
    busesById = new Map((busRows.data || []).map(b => [b.id, b]));
    const setting = key => settings.data?.find(r => r.key === key)?.value;
    slow = Number(setting('route-times-v1')?.drive_slowdown_percent) || 0;
    const yardRow = setting('yard-location-v1');
    yard = yardRow?.lat != null && yardRow?.lng != null ? [Number(yardRow.lat), Number(yardRow.lng)] : null;
    map = Places.baseMap($('scheduler-live-map'), LiveMap.style());
    // The pins move as much as the board's Motion says, which the board keeps with its view.
    let moving = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'calm' : 'full';
    try { moving = JSON.parse(localStorage.getItem('scheduler.view') || '{}').motion || moving; } catch { /* the default stands */ }
    $('scheduler-live-map').dataset.motion = moving;
    if (!map) { say('error', "The map didn't load", Places.unavailable() || 'Reload the page to try again.'); return; }
    style = LiveMap.style();
    map.setView(yard ?? [26.2, -98.2], 9);
    // Pins join and part as the map zooms.
    map.on('zoomend', () => { if (answer) drawPins(); });
    $('scheduler-live-all').addEventListener('click', showAll);
    new ResizeObserver(() => map.invalidateSize()).observe($('scheduler-live-map'));
    // A theme picked while the page is open turns the tiles with it.
    new MutationObserver(() => requestAnimationFrame(styleMap))
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    await ask();
  });

  setInterval(ask, ASK_EVERY);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - asked > ASK_EVERY) ask();
  });
})();
