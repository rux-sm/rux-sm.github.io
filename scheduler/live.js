/* ==========================================================================
   live.js — THE LIVE MAP
   --------------------------------------------------------------------------
   live.html is a map of every bus Samsara has, where it is now, with a list
   beside it. A bus out on a trip is a tag in its trip's colour with an arrow
   the way it is heading, and its line in the list says what its bar says:
   its driver and the hours they may still drive, its speed, and its next stop
   with the time it is due, amber with the minutes over when it will be late.
   A bus that is not out is grey, where it was last seen.

   Pressing a bus, on the map or in the list, shows its leg: the path it has
   driven since it left the yard, its stops, filled once reached, and a dashed
   line on to the next. live.html?bus=<bus id> opens on that bus, as the
   board's Show on map does. road.js says which stop is next and when the bus
   gets there, so the map and the board always agree.

   samsara-now is asked once a minute while the page is in view, and the
   trips around today are read again every five minutes.
   ========================================================================== */
(() => {
  'use strict';

  const { $, el } = window.SchedulerPair;
  const pair = window.SchedulerPair.page({ list: 'buses', one: 'bus' });
  const { say } = pair;
  const Road = window.SchedulerRoad;
  const W = window.SchedulerWeek;
  const Places = window.SchedulerPlaces;

  const ASK_EVERY = 60e3;
  const TRIPS_EVERY = 5 * 60e3;
  const HOUR = 3600e3;

  let client = null, road = null, map = null, slow = 0;
  let busesById = new Map(), legsByBus = new Map(), answer = null;
  let tripsRead = 0, asked = 0, asking = false, stopped = false;
  let chosen = new URLSearchParams(location.search).get('bus');
  const pins = new Map();
  let legLayer = null, fitted = false;

  const clock = ms => {
    const [h, m] = Road.clockOf(ms).split(':');
    return `${Number(h) % 12 || 12}:${m}${Number(h) < 12 ? 'a' : 'p'}`;
  };
  const hours = ms => `${Math.floor(ms / HOUR)}:${String(Math.floor((ms % HOUR) / 60e3)).padStart(2, '0')}`;
  const short = name => {
    const words = String(name || '').trim().split(/\s+/);
    return words.length > 1 ? `${words[0]} ${words.at(-1)[0]}.` : words[0];
  };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayFrom = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

  const arrivals = Road.arrivals(
    (a, b) => Places.drive(a, b).then(d => (d ? Math.round(d.min * (1 + slow / 100)) : null)),
    () => draw());

  // ── reading ─────────────────────────────────────────────────────────────
  const TRIP_COLUMNS = 'id,destination,customer,confirmed,trip_bar_color,trip_type,start_date,end_date,'
    + 'return_start_date,return_end_date,departure_time,return_time,bus_count,return_bus_count,'
    + 'trip_stops(id,position,leg,type,name,address,lat,lng,depart_prev,depart_prev_date,arrive,arrive_date,spot,spot_date),'
    + 'trip_assignments(id,bus_id,leg)';

  /* Each bus's legs from yesterday to tomorrow, with when it counts as out
     on each, so a bus is matched to the leg it is out on now. */
  async function readTrips() {
    const from = dayFrom(-2), to = dayFrom(1);
    const { data, error } = await client.from('trips').select(TRIP_COLUMNS)
      .is('cancelled_at', null)
      .lte('start_date', to)
      .or(`end_date.gte.${from},return_end_date.gte.${from},start_date.gte.${from}`);
    if (error) throw error;
    const legs = new Map();
    for (const trip of data || []) {
      for (const leg of W.legsOf(trip)) {
        const span = Road.span(leg);
        if (!span) continue;
        for (const a of trip.trip_assignments || []) {
          if (!a.bus_id || (a.leg || 'outbound') !== leg.leg) continue;
          if (!legs.has(a.bus_id)) legs.set(a.bus_id, []);
          legs.get(a.bus_id).push({ trip, leg: leg.leg, span });
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
     trip, the driver at the wheel, and its next stop with when it gets there. */
  function stateOf(bus) {
    const leg = legNow(bus.bus_id);
    const out = !!leg && Road.isOut(bus, leg.span);
    const here = bus.lat != null ? [bus.lat, bus.lng] : null;
    const wheel = bus.drivers?.find(d => d.wheel) ?? null;
    const s = { bus, number: busesById.get(bus.bus_id)?.number ?? '?', out, leg: out ? leg : null, here, wheel };
    if (!out) return s;
    s.hue = W.hueFor(leg.trip);
    s.stops = Road.stopsOf(leg.trip, leg.leg);
    s.where = Road.whereOn(s.stops, bus.path);
    if (s.where.at) s.stop = s.stops[s.where.reached];
    else if (s.where.next >= 0) {
      s.stop = s.stops[s.where.next];
      s.arrival = arrivals.get(bus.bus_id, s.stop, here);
      s.late = Road.lateBy(s.stop.due, s.arrival);
    }
    return s;
  }

  const motion = b => (b.engine === 'idle' ? 'Idle' : b.engine === 'off' ? 'Off'
    : b.mph ? `${b.mph} mph` : b.mph === 0 ? 'Stopped' : b.engine === 'on' ? 'Running' : 'No reading');

  // ── the map ─────────────────────────────────────────────────────────────
  /* The tiles follow the theme: the light street map on a light page and
     the dark one on a dark page, read off the page's own background. */
  const darkPage = () => {
    const [r, g, b] = (getComputedStyle(document.body).backgroundColor.match(/\d+/g) || [255, 255, 255]).map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
  };
  let style = null;
  function styleMap() {
    const want = darkPage() ? 'dark-matter-brown' : 'osm-bright';
    if (map && want !== style) { style = want; map.style(want); }
  }

  /* A bus's pin: its number on its trip's colour, or grey when it is not
     out, with an arrow turned the way it heads while it moves. Buses not out
     within a tenth of a mile of each other, as at the yard, share one pin
     with every number on it, which presses as the first. The arrow is the
     sprite's glyph copied in, since Chrome paints no `<use>` of the hidden
     sprite inside Leaflet's layers. */
  const ARROW = '#m-arrow_upward-fill';
  const arrowGlyph = () => document.getElementById(ARROW.slice(1))?.innerHTML ?? '';
  const TOGETHER_MILES = 0.1;
  function pinsOf(states) {
    const out = [];
    for (const s of states) {
      if (!s.here) continue;
      const near = !s.out && out.find(p => !p.out && Road.miles(p.here, s.here) <= TOGETHER_MILES);
      if (near) { near.members.push(s); continue; }
      out.push({ here: s.here, out: s.out, members: [s] });
    }
    return out.map(p => {
      const s = p.members[0];
      const moving = s.out && s.bus.heading != null && s.bus.mph > 0;
      const arrow = moving
        ? `<svg class="scheduler-live-pin__arrow" width="14" height="14" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" style="rotate:${s.bus.heading}deg">${arrowGlyph()}</svg>` : '';
      const isChosen = p.members.some(m => m.bus.bus_id === chosen);
      const cls = ['scheduler-live-pin', s.out ? `scheduler-bar--${s.hue}` : 'scheduler-live-pin--yard',
        isChosen ? 'scheduler-live-pin--chosen' : ''].filter(Boolean).join(' ');
      return { key: s.bus.bus_id, here: p.here, busId: s.bus.bus_id, z: isChosen ? 2000 : s.out ? 1000 : 0,
        html: `<div class="${cls}">${arrow}<span>${p.members.map(m => m.number).join(' · ')}</span></div>` };
    });
  }

  function drawPins(states) {
    const L = window.L;
    const want = pinsOf(states);
    for (const w of want) {
      let pin = pins.get(w.key);
      if (!pin) {
        pin = L.marker(w.here, { keyboard: false, riseOnHover: true,
          icon: L.divIcon({ className: 'scheduler-live-pin-box', html: w.html, iconSize: null }) }).addTo(map);
        pin.on('click', () => choose(pin.busId));
        pins.set(w.key, pin);
      } else {
        pin.setLatLng(w.here);
        if (pin.html !== w.html) pin.setIcon(L.divIcon({ className: 'scheduler-live-pin-box', html: w.html, iconSize: null }));
      }
      pin.html = w.html;
      pin.busId = w.busId;
      pin.setZIndexOffset(w.z);
    }
    for (const [key, pin] of pins) if (!want.some(w => w.key === key)) { pin.remove(); pins.delete(key); }
  }

  /* The chosen bus's leg: the path it has driven, its stops, a ring for
     each and filled once reached, and a dashed line from the bus on to its
     next stop. Each draws in a class app.css colours. */
  function drawLeg(s) {
    const L = window.L;
    legLayer?.remove();
    legLayer = null;
    if (!s?.out) return;
    legLayer = L.layerGroup().addTo(map);
    const path = (s.bus.path || []).map(p => [p[0], p[1]]);
    if (path.length > 1) L.polyline(path, { className: 'scheduler-live-path', interactive: false }).addTo(legLayer);
    if (s.stop && !s.where.at && s.here && s.stop.point) {
      L.polyline([s.here, s.stop.point], { className: 'scheduler-live-ahead', interactive: false }).addTo(legLayer);
    }
    s.stops.forEach((stop, i) => {
      if (!stop.point) return;
      const reached = i <= s.where.reached;
      L.circleMarker(stop.point, { radius: 6, className: `scheduler-live-stop${reached ? ' scheduler-live-stop--reached' : ''}` })
        .bindTooltip(`${stop.name}${stop.due != null ? ` · ${clock(stop.due)}` : ''}`, { direction: 'top', offset: [0, -6] })
        .addTo(legLayer);
    });
  }

  // ── the list ────────────────────────────────────────────────────────────
  function rowOf(s) {
    const item = el('li');
    const button = el('button', 'scheduler-live__bus');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(s.bus.bus_id === chosen));
    button.addEventListener('click', () => choose(s.bus.bus_id));
    const num = el('span', `scheduler-live__num ${s.out ? `scheduler-bar--${s.hue}` : 'scheduler-live__num--yard'}`, s.number);
    const said = el('span', 'scheduler-live__said');
    if (s.out) {
      said.appendChild(el('span', 'scheduler-live__dest', s.leg.trip.destination || 'Trip'));
      const who = el('span', 'scheduler-live__line');
      if (s.wheel) {
        who.append(short(s.wheel.name));
        if (s.wheel.left_ms != null) who.appendChild(el('span', `scheduler-live__hours${s.wheel.left_ms < HOUR ? ' scheduler-live__hours--low' : ''}`, ` ${hours(s.wheel.left_ms)}`));
        who.append(' · ');
      }
      who.append(motion(s.bus));
      said.appendChild(who);
      if (s.stop) {
        const next = el('span', 'scheduler-live__line');
        if (s.where.at) next.append(`At ${s.stop.name}`);
        else {
          next.append(`→ ${s.stop.name}`);
          const when = s.stop.due ?? s.arrival;
          if (when != null) next.appendChild(el('span', `scheduler-live__due${s.late ? ' scheduler-live__due--late' : ''}`,
            ` ${clock(when)}${s.late ? ` +${s.late}` : ''}`));
        }
        said.appendChild(next);
      }
    } else {
      /* A bus not out: where it is while it reports, or when it last did. */
      const seen = s.bus.seen ? new Date(s.bus.seen).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : null;
      said.appendChild(el('span', 'scheduler-live__dest', s.bus.place || (seen ? `Seen ${seen}` : 'Not reporting')));
      said.appendChild(el('span', 'scheduler-live__line', s.bus.place ? motion(s.bus) : 'Not reporting now'));
    }
    button.append(num, said);
    item.appendChild(button);
    return item;
  }

  // The buses out first, then the rest, each by number.
  const byNumber = (a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
  function draw() {
    if (!map || !answer) return;
    styleMap();
    const states = (answer.buses || []).map(stateOf).sort((a, b) => b.out - a.out || byNumber(a, b));
    drawPins(states);
    $('scheduler-live-list').replaceChildren(...states.map(rowOf));
    drawLeg(states.find(s => s.bus.bus_id === chosen));
    if (!fitted) {
      fitted = true;
      const chosenState = states.find(s => s.bus.bus_id === chosen && s.here);
      if (chosenState) focus(chosenState);
      else {
        const points = states.filter(s => s.here).map(s => s.here);
        if (points.length) map.fitBounds(points, { padding: [48, 48], maxZoom: 13 });
      }
    }
  }

  // The map moves to a bus: its whole leg when it is out, the bus alone when not.
  function focus(s) {
    const points = s.out ? [s.here, ...(s.bus.path || []).map(p => [p[0], p[1]]), ...s.stops.filter(x => x.point).map(x => x.point)] : [s.here];
    if (points.length > 1) map.fitBounds(points, { padding: [48, 48], maxZoom: 15 });
    else map.setView(s.here, 15);
  }

  function choose(busId) {
    chosen = chosen === busId ? null : busId;
    history.replaceState(null, '', chosen ? `live.html?bus=${encodeURIComponent(chosen)}` : 'live.html');
    draw();
    const s = chosen && answer?.buses?.find(b => b.bus_id === chosen);
    if (s) { const st = stateOf(s); if (st.here) focus(st); }
  }

  // ── start ───────────────────────────────────────────────────────────────
  pair.start(async signedIn => {
    client = signedIn;
    const [busRows, settings] = await Promise.all([
      client.from('buses').select('id,number'),
      client.from('settings').select('key,value').in('key', ['route-times-v1']),
      Places.init(client),
    ]);
    if (busRows.error) throw busRows.error;
    busesById = new Map((busRows.data || []).map(b => [b.id, b]));
    slow = Number(settings.data?.find(r => r.key === 'route-times-v1')?.value?.drive_slowdown_percent) || 0;
    map = Places.baseMap($('scheduler-live-map'), darkPage() ? 'dark-matter-brown' : 'osm-bright');
    if (!map) { say('error', "The map didn't load", Places.unavailable() || 'Reload the page to try again.'); return; }
    style = darkPage() ? 'dark-matter-brown' : 'osm-bright';
    map.setView([26.2, -98.2], 9);
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
