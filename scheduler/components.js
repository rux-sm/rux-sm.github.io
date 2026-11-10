/* ==========================================================================
   Rux Scheduler — COMPONENTS, the page of every state a bar can be in
   --------------------------------------------------------------------------
   Draws components-data.js's invented samples with the board's own code:
   each bar by bar.js, and a bus out on its trip by road-bar.js from what
   live-trip.js says of it. So a change to the board shows here at once.

   Each sample is a board of its own a few days wide, a bus to a row, under
   its name and a sentence saying what it shows. Above them, Motion, the
   board and the rows are the view menu's, opening as the board was last
   left and changing only this page: Motion is `data-motion` on the page,
   the compact board `data-board`, and a row the board's own class on each
   sample. The theme is the account's, from the header, as on the board.
   A sample that plays once has a button to play it again, drawn afresh.
   A sample with a tip draws, under its bar, what a press on the bar opens,
   by trip-tips.js or the phone's half sheet by trip-sheet.js, each handed
   the sample in place of the board.
   The last section, Bus drawings, is the fleet's own: each active bus from
   the database as its tile on the board, rux's side view standing at its
   foot where the board will stand it, and the Live map's eight views, all
   painted by bus-paint.js with the figures picked above them, which start
   at its LOOK and change nothing outside the page, to tune the paint rule.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.getElementById('scheduler-components');
  if (!root) return;
  const Bar = window.SchedulerBar;
  const RoadBar = window.SchedulerRoadBar;
  const Live = window.SchedulerLiveTrip;
  const Tips = window.SchedulerTripTips;
  const Sheet = window.SchedulerTripSheet;
  const BusHead = window.SchedulerBusHead;
  const { legsOf, assignLanes, legByKey, legKeyOfVehicle } = window.SchedulerWeek;
  const page = root.closest('.scheduler-page') ?? root;
  // A sprite icon at 16px, as the board draws its marks.
  const icon = href => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '16'); svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 32 32'); svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  };

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // The view menu's rows and the class that hides each, as data.js names them.
  const ROWS = ['client', 'contact', 'time', 'update', 'drivers'];
  const HIDE_ROW = {
    client: 'scheduler-week--no-client',
    contact: 'scheduler-week--no-contact',
    time: 'scheduler-week--no-time',
    update: 'scheduler-week--no-update',
    drivers: 'scheduler-week--no-drivers',
  };
  const MOTIONS = ['full', 'calm', 'off'];
  /* The board's view as it was last left, read and never written, so the
     page opens as the board looks and changing it here changes nothing
     there. */
  const view = { client: true, contact: true, time: true, update: true, drivers: true, compact: false,
    motion: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'calm' : 'full' };
  try {
    const saved = JSON.parse(localStorage.getItem('scheduler.view') || '{}');
    for (const k of ROWS) if (typeof saved[k] === 'boolean') view[k] = saved[k];
    if (MOTIONS.includes(saved.motion)) view.motion = saved.motion;
  } catch { /* no storage: the defaults stand */ }

  /* What the board hands bar.js for one sample bar: the trip, its leg, the
     bus's assignment on that leg, or none for a bar in the No bus row, and
     where it sits in the sample's days. */
  function placed(spec) {
    const leg = legsOf(spec.trip).find(l => l.leg === spec.leg);
    const assigns = (spec.trip.trip_assignments || []).filter(a => (a.leg || 'outbound') === spec.leg)
      .sort((x, y) => (x.position ?? 0) - (y.position ?? 0));
    return {
      // A sample's rows run in slot order, so its slot counts its buses down the board.
      spec, trip: spec.trip, leg, slot: spec.slot, nth: (spec.slot ?? 0) + 1,
      assign: 'assign' in spec ? spec.assign : assigns[spec.slot] ?? null,
      place: { start: spec.start, span: spec.span, fromPrev: !!spec.fromPrev, toNext: !!spec.toNext },
    };
  }

  // What bar.js handed back for each bar drawn, and the sample's bar it was drawn from.
  const drawnBars = new WeakMap();
  function barOf(b, data) {
    const { spec } = b;
    const { bar, facts } = Bar.draw(b, {
      driversById: data.driversById, busesById: data.busesById, statuses: data.statuses, partnersById: data.partnersById,
      saving: () => !!spec.state?.saving,
    });
    if (spec.state?.pressed) bar.setAttribute('aria-current', 'true');
    for (const c of spec.state?.classes ?? []) bar.classList.add(c);
    if (spec.live) {
      const { bus, look, before } = spec.live;
      const said = Live.saidOf;
      if (before) RoadBar.draw(bar, before, { next: look.next, said: said({ ...look, bus: before }), at: look.now, motion: view.motion });
      RoadBar.draw(bar, bus, { next: look.next, said: said(look), at: look.now, motion: view.motion, day: look.day });
    }
    drawnBars.set(bar, { spec, facts });
    return bar;
  }

  /* The bar menu's actions as the half sheet draws them, their words and
     icons as data.js's menu has them; on this page a press does nothing. */
  const ACTIONS = Object.fromEntries([
    ['itinerary', 'Upload itinerary', 'Itinerary', '#m-upload'], ['contacts', 'Call or text', 'Call or text', '#m-call'],
    ['route', 'Route', 'Route', '#m-route'], ['move', 'Move to bus', 'Bus', '#m-directions_bus'],
    ['driver', 'Change driver', 'Driver', '#m-person'], ['open', 'Open trip', 'Open', '#m-open_in_new'],
  ].map(([id, label, short, icon]) => [id, { id, label, short, icon, blocked: () => null }]));

  /* What a tip reads from the board, trip-tips.js's `board`, answered from
     the sample: its drivers, buses and answers, its bar's facts, its bus out
     as components-data.js wrote it, and the updates open as `tip.editor`
     says. No other trip stands near it, no photo is signed and no staff are
     read, so a seat clashes with nothing and a face is its initial; what
     stands in the way is only a sample's own, such as a partner's paper. */
  function tipBoard(sample, data) {
    return {
      driversById: data.driversById, busesById: data.busesById, statuses: data.statuses, partnersById: data.partnersById,
      facts: bar => drawnBars.get(bar)?.facts ?? null,
      road: bar => {
        const look = drawnBars.get(bar)?.spec.live?.look;
        return look ? { bus: look.bus, next: look.next, said: Live.saidOf(look) } : null;
      },
      seat: (bar, role) => {
        const { trip } = drawnBars.get(bar).spec;
        const assign = trip.trip_assignments.find(a => String(a.id) === bar.dataset.assignmentId);
        return assign ? { trip, assign, role, range: legByKey(trip, legKeyOfVehicle(trip, assign)) } : null;
      },
      standing: (trip, leg) => window.SchedulerClashes.standing(trip, leg, { trips: [], off: [], oos: [] }, data),
      near: () => null,
      photo: () => Promise.resolve(''),
      staff: () => null,
      editor: () => ({ opened: false, editing: null, quick: null, ...sample.tip.editor }),
      map: {},
      section: sample.tip.section ?? '',
      action: id => ACTIONS[id],
    };
  }

  /* The tip in the board's own frame, as data.js draws it: a tip in
     Carbon's toggletip container, the live card in the card's frame, or the
     half sheet pulled up. */
  function tipOf(sample, board, data) {
    const bar = board.querySelector('.scheduler-bar');
    const { trip } = drawnBars.get(bar).spec;
    const { kind, section = '' } = sample.tip;
    const said = tipBoard(sample, data);
    if (kind === 'card' || kind === 'driver' || kind === 'partner' || kind === 'route') {
      const frame = el('div', `${Tips.CONTAINER} scheduler-components__tip`);
      const tip = kind === 'card' ? Tips.card(trip, bar, section, said) : kind === 'driver' ? Tips.driver(trip, bar, section, said)
        : kind === 'partner' ? Tips.partner(trip, bar, said) : Tips.route(trip, bar, said);
      frame.appendChild(Tips.surface(tip));
      return frame;
    }
    const frame = el('div', 'scheduler-bar-shortcuts scheduler-components__tip');
    frame.toggleAttribute('data-card', true);
    if (kind === 'sheet') {
      frame.toggleAttribute('data-docked', true);
      frame.dataset.sheet = 'full';
      frame.append(...Sheet.draw(trip, bar, said));
    } else frame.appendChild(Tips.live(trip, bar, said));
    return frame;
  }

  // The rows the view shows, on one sample's board.
  // A compact board draws the destination, the times and the drivers whatever the view holds, as data.js's `rowShown` does.
  const COMPACT = { client: false, contact: false, time: true, update: false, drivers: true };
  const shows = r => (view.compact ? COMPACT[r] : view[r]);
  function showRows(board) {
    for (const r of ROWS) board.classList.toggle(HIDE_ROW[r], !shows(r));
    // The count and the attribute app.css keys each view's parts to, as data.js sets both.
    const rows = String(1 + ROWS.filter(shows).length);
    board.style.setProperty('--scheduler-bar-rows', rows);
    board.dataset.barRows = rows;
  }

  /* A bus's tile as the board draws it, its number and alert on line 1,
     bus-head.js's readings and its kit. */
  function tileOf(head, bus, live) {
    const top = el('div', 'scheduler-row-head__top');
    // A button, as the board's number is the button of its tip.
    const num = el('button', 'scheduler-row-head__num', bus.number);
    num.type = 'button';
    top.append(num, BusHead.alertEl());
    head.appendChild(top);
    head.dataset.busId = bus.id;
    head.title = [bus.number, `${bus.capacity} pax`, bus.type].join(' · ');
    BusHead.draw(head, bus, live);
    head.appendChild(BusHead.equipEl(bus));
  }

  function boardOf(sample, data) {
    // A sample of the Mac's bus tile is drawn on a board of the Mac's own kind.
    const board = el('div', `scheduler-week scheduler-components__board${sample.tiles ? ' scheduler-week--scroll' : ''}`);
    board.style.setProperty('--scheduler-days', sample.days);
    const grid = el('div', 'scheduler-grid');
    for (const r of sample.rows) {
      const none = r.head === 'No bus';
      const row = el('div', `scheduler-row${none ? ' scheduler-row--unassigned' : r.partner ? ' scheduler-row--partner' : ''}`);
      const head = el('div', 'scheduler-row-head');
      if (r.bus) tileOf(head, data.busesById.get(r.bus), r.live);
      else {
        // A partner's and No bus's tiles, as data.js draws them: the name, and the partner's mark or the buses still wanting one.
        const top = el('div', 'scheduler-row-head__top');
        top.appendChild(el('div', 'scheduler-row-head__num', none ? 'No\nbus' : r.head));
        head.appendChild(top);
      }
      if (none) {
        head.title = 'Trips with no bus yet';
        head.dataset.unassigned = '';
        const open = el('span', 'scheduler-row-head__open');
        open.setAttribute('role', 'img');
        open.setAttribute('aria-label', `${r.bars.length} ${r.bars.length === 1 ? 'bus' : 'buses'} with no bus yet`);
        open.append(icon('#m-bus_alert'), el('span', 'scheduler-row-head__open-count', String(r.bars.length)));
        open.hidden = !r.bars.length;
        head.appendChild(open);
      }
      if (r.partner) {
        head.title = `${r.head}, a partner covering buses with its own coach and driver`;
        head.dataset.partner = r.head;
        const mark = el('span', 'scheduler-row-head__partner');
        mark.appendChild(icon('#i-collaborate'));
        head.appendChild(mark);
      }
      const track = el('div', 'scheduler-track');
      const bars = r.bars.map(placed);
      track.style.setProperty('--scheduler-lanes', assignLanes(bars));
      for (const b of bars) track.appendChild(barOf(b, data));
      row.append(head, track);
      grid.appendChild(row);
    }
    board.appendChild(grid);
    showRows(board);
    return board;
  }

  function sampleOf(sample, data, where) {
    const figure = el('figure', 'scheduler-components__sample');
    const caption = el('figcaption', 'scheduler-components__caption');
    caption.append(el('span', 'scheduler-components__name rux--type-heading-compact-01', sample.name),
      el('span', 'scheduler-components__note rux--type-body-compact-01', sample.note));
    const board = boardOf(sample, data);
    figure.append(caption, board);
    if (sample.tip) figure.appendChild(tipOf(sample, board, data));
    if (sample.replay) {
      const again = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm scheduler-components__again', 'Play again');
      again.type = 'button';
      again.dataset.where = where;
      caption.appendChild(again);
    }
    return figure;
  }

  function draw() {
    const data = window.SchedulerComponentsData.build();
    const nav = el('nav', 'scheduler-components__nav');
    nav.setAttribute('aria-label', 'Component sections');
    for (const section of data.sections) {
      const link = el('a', 'rux--link', section.title);
      link.href = `#scheduler-components-${section.id}`;
      nav.appendChild(link);
    }
    const out = [nav];
    data.sections.forEach((section, s) => {
      const box = el('section', 'scheduler-components__section');
      box.setAttribute('aria-labelledby', `scheduler-components-${section.id}`);
      const title = el('h2', 'rux--type-heading-03', section.title);
      title.id = `scheduler-components-${section.id}`;
      const list = el('div', 'scheduler-components__samples');
      section.samples.forEach((sample, i) => list.appendChild(sampleOf(sample, data, `${s}:${i}`)));
      box.append(title, el('p', 'rux--type-body-01 scheduler-components__intro', section.intro), list);
      out.push(box);
    });
    root.replaceChildren(...out);
  }

  // ── Bus drawings ──────────────────────────────────────────────────────────
  const Paint = window.SchedulerBusPaint;
  const VIEWS = ['bus-1-up', 'bus-2-up-right', 'bus-3-right', 'bus-4-down-right', 'bus-5-down'];
  // A reading for the tile, so it shows its state as on the board.
  const RESTING = () => ({ engine: 'off', mph: 0, fuel: 75, engine_at: new Date(Date.now() - 2 * 3600e3).toISOString() });
  const lookFrom = inputs => {
    const look = { ...Paint.LOOK };
    for (const input of inputs) {
      const key = input.dataset.look;
      look[key] = input.type === 'color' ? input.value : key === 'floor' ? Number(input.value) || 0 : (Number(input.value) || 0) / 100;
    }
    return look;
  };
  const sayLook = look => [`lift ${look.floor}`, `side ${Math.round(look.side * 100)}%`, `front and back ${Math.round(look.end * 100)}%`,
    `roof details ${Math.round(look.detail * 100)}%`, `glass and tyres ${look.black}`, `hubs ${look.hub}`].join(' · ');

  async function drawBuses(client) {
    const [{ data: buses }, side, ...views] = await Promise.all([
      client.from('buses').select('id,number,capacity,type,status,sort_order,ada_lift,sleeper,equipment,color,insurance_exp,registration_exp,inspection_exp')
        .eq('status', 'active').order('sort_order'),
      Paint.read('bus-side'), ...VIEWS.map(Paint.read)]);
    if (!buses?.length) return;
    const data = { busesById: new Map(buses.map(b => [b.id, b])) };
    const box = el('section', 'scheduler-components__section');
    box.setAttribute('aria-labelledby', 'scheduler-components-buses');
    const title = el('h2', 'rux--type-heading-03', 'Bus drawings');
    title.id = 'scheduler-components-buses';
    const controls = document.getElementById('scheduler-components-paint').content.cloneNode(true);
    const inputs = [...controls.querySelectorAll('[data-look]')];
    const figures = controls.querySelector('.scheduler-components__figures');
    const list = el('div', 'scheduler-components__buses');
    const drawn = buses.map(bus => {
      const figure = el('figure', 'scheduler-components__sample scheduler-components__bus');
      const caption = el('figcaption', 'scheduler-components__caption');
      caption.append(el('span', 'scheduler-components__name rux--type-heading-compact-01', bus.number),
        el('span', 'scheduler-components__note rux--type-body-compact-01', bus.color ?? 'No paint'));
      const board = boardOf({ tiles: true, days: 1, rows: [{ bus: bus.id, live: RESTING(), bars: [] }] }, data);
      const foot = el('span', 'scheduler-components__foot');
      foot.setAttribute('aria-hidden', 'true');
      board.querySelector('.scheduler-row-head').appendChild(foot);
      const turns = el('div', 'scheduler-components__views');
      turns.setAttribute('aria-hidden', 'true');
      const row = el('div', 'scheduler-components__drawn');
      row.append(board, turns);
      figure.append(caption, row);
      list.appendChild(figure);
      return { bus, foot, turns };
    });
    // Each view facing its way: up, the four turning right, then the three left, mirrored.
    const paint = () => {
      const look = lookFrom(inputs);
      figures.textContent = sayLook(look);
      for (const { bus, foot, turns } of drawn) {
        foot.innerHTML = Paint.painted(side, bus.color, look);
        turns.innerHTML = [0, 1, 2, 3, 4, 5, 6, 7].map(t => `<span class="scheduler-live-bus${t > 4 ? ' scheduler-live-bus--mirrored' : ''}">${Paint.painted(views[t <= 4 ? t : 8 - t], bus.color, look)}</span>`).join('');
      }
    };
    controls.querySelector('.scheduler-components__look').addEventListener('input', paint);
    controls.querySelector('.scheduler-components__look').addEventListener('change', paint);
    controls.querySelector('.scheduler-components__reset').addEventListener('click', () => {
      for (const input of inputs) {
        const v = Paint.LOOK[input.dataset.look];
        input.value = input.type === 'color' ? v : input.dataset.look === 'floor' ? v : Math.round(v * 100);
      }
      paint();
    });
    box.append(title, el('p', 'rux--type-body-01 scheduler-components__intro',
      'Every active bus in its own paint: its tile with the side view at its foot, and the Live map\'s eight directions. The figures change this page alone.'), controls, list);
    root.appendChild(box);
    const link = el('a', 'rux--link', 'Bus drawings');
    link.href = '#scheduler-components-buses';
    root.querySelector('.scheduler-components__nav')?.appendChild(link);
    paint();
  }

  // Play again: the sample drawn from fresh samples, so it starts as new.
  root.addEventListener('click', e => {
    const again = e.target.closest('.scheduler-components__again');
    if (!again) return;
    const [s, i] = again.dataset.where.split(':').map(Number);
    const data = window.SchedulerComponentsData.build();
    const old = again.closest('.scheduler-components__sample');
    old.replaceWith(sampleOf(data.sections[s].samples[i], data, again.dataset.where));
  });

  // ── The view ──────────────────────────────────────────────────────────────
  const motionSwitch = document.getElementById('scheduler-components-motion');
  const boardSwitch = document.getElementById('scheduler-components-board');
  const select = (switcher, value, key) => {
    const option = switcher?.querySelector(`[data-${key}="${value}"]`);
    if (option) window.Rux?.contentSwitcher?.select?.(switcher, option, { focus: false, silent: true });
  };
  function applyView() {
    page.dataset.motion = view.motion;
    if (view.compact) page.dataset.board = 'compact'; else delete page.dataset.board;
    if (view.compact) document.documentElement.dataset.schedulerBoard = 'compact'; else delete document.documentElement.dataset.schedulerBoard;
    for (const board of root.querySelectorAll('.scheduler-components__board')) showRows(board);
  }
  motionSwitch?.addEventListener('rux:content-switcher-selected', e => {
    view.motion = e.detail?.option?.dataset.motion ?? view.motion;
    applyView();
  });
  boardSwitch?.addEventListener('rux:content-switcher-selected', e => {
    view.compact = e.detail?.option?.dataset.board === 'compact';
    applyView();
  });
  for (const r of ROWS) {
    const box = document.getElementById(`scheduler-components-row-${r}`);
    if (!box) continue;
    box.checked = view[r];
    box.addEventListener('change', () => { view[r] = box.checked; applyView(); });
  }

  /* The live card's map draws Geoapify's streets with the key the office
     keeps, so the page is drawn once it is read, or refused. */
  const client = window.Rux?.account?.client;
  Promise.resolve(client && window.SchedulerPlaces.init(client)).finally(() => {
    draw();
    select(motionSwitch, view.motion, 'motion');
    applyView();
    if (client) drawBuses(client).then(applyView);
  });
})();
