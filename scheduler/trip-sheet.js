/* ==========================================================================
   Rux Scheduler — TRIP SHEET, the selected trip on a phone
   --------------------------------------------------------------------------
   The phone's half sheet and its card: the trip's head, what is happening
   now, its bus and drivers and three large buttons, and pulled up, the rest
   of what a call or a change needs, the live card of a bus out, the trip's
   needs and updates, and Edit trip. data.js draws the selected trip's with
   it and places it, and components.html draws its samples with it, so the
   two cannot differ.

   `draw(trip, bar, board)` hands back the sheet's parts in order. `board` is
   what trip-tips.js reads, and two more:
     section     the card's part open, `route:` showing the leg's route in
                 the rest's place;
     action(id)  one of the bar menu's actions, `{ id, label, label_for,
                 short, icon, icon_for, blocked(bar) }`, which a press on its
                 button runs.

   Every value from the database is written with textContent.
   ========================================================================== */
(() => {
  'use strict';

  const Tips = window.SchedulerTripTips;
  const Bar = window.SchedulerBar;
  const { alertsOf, hhmm, updateStamp } = Bar;
  const { crewOf, tripContact, dayContactsOf } = window.SchedulerLegFacts;
  const { hueFor, legByKey } = window.SchedulerWeek;
  const { updatesOf, due: dueFollowUp, daysToGo } = window.SchedulerFollowUp;
  const { updateFace, ageShort, cardTitle, postTripOf, postTripRows, markSave, WARN_GO } = Tips;
  const { format: showPhone, dial } = window.SchedulerPhone;

  /* The sheet's three large buttons, by the bar menu's ids, as rux chose
     them: Itinerary, Call or text, whose window calls and texts everyone on
     the trip, and Route. Bus, Driver and Edit trip are the pulled-up rest's,
     and Forms is on the toolbar and in the ☰ menu. */
  const ROW = ['itinerary', 'contacts', 'route'];

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const svgUse = (href, size, box) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size); svg.setAttribute('height', size);
    svg.setAttribute('viewBox', box); svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  };
  // A day as the board keeps it, YYYY-MM-DD, and back, at its local midnight.
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const daysBetween = (a, b) => Math.round((b - a) / 864e5);
  // A vehicle as every screen names it, "Coach 218" or "Van 12"; vehicles.js.
  const vehicleName = bus => window.SchedulerVehicles?.label(bus) ?? (String(bus?.number ?? '').trim() || 'Unit');

  /* ── THE PHONE'S HALF SHEET ────────────────────────────────────────────────
     As rux decided: over the foot of the view, the view still showing above
     it with the trip marked in it, its handle, where the trip goes over its
     customer and times, a band in its colour, what is happening now, its bus
     and drivers, and three large buttons, Itinerary, Call or text and Route.
     A tap on another trip moves it there. Its handle, a press or a pull,
     takes it to the top for the rest, the view dimmed behind: the customer,
     the contacts, the pickup, the bus and the driver, each a press that
     changes it, the trip on the road, what it still needs and its updates,
     and Edit trip; Route shows the leg's stops in the rest's place. A tap on
     the dimmed view drops it back to half, a tap on the view closes it, and
     so does a pull down past half. */

  // A press of one of the sheet's actions, drawn as `kind`: a large button, a row or Edit trip.
  function sheetAction(id, bar, kind, words, board) {
    const action = board.action(id);
    const why = action.blocked(bar);
    const label = why ?? (action.label_for ? action.label_for(bar) : action.label);
    const btn = el('button', kind === 'edit' ? 'rux--btn rux--btn--primary rux--layout--size-lg scheduler-sheet__edit'
      : kind === 'row' ? 'scheduler-sheet__row scheduler-sheet__row--press' : 'scheduler-bar-shortcut');
    btn.type = 'button';
    btn.dataset.shortcut = action.id;
    if (why) btn.setAttribute('aria-disabled', 'true');
    if (kind === 'edit') { btn.textContent = why ?? 'Edit trip'; return btn; }
    if (kind === 'row') {
      btn.setAttribute('aria-label', `${label}: ${words.textContent}`);
      btn.append(words, svgUse('#m-keyboard_arrow_right', '16', '0 0 16 16'));
      return btn;
    }
    // Route is pressed while the route stands in the rest's place.
    if (action.id === 'route') btn.setAttribute('aria-pressed', String(board.section.startsWith('route:')));
    btn.setAttribute('aria-label', label);
    btn.append(svgUse(action.icon_for ? action.icon_for(bar) : action.icon, '20', '0 0 32 32'),
      el('span', 'scheduler-bar-shortcut__label', action.short));
    return btn;
  }
  // The leg's times, out and back, the days named where they are not one.
  function sheetTimes(trip, bar) {
    const leg = legByKey(trip, bar.dataset.legKey || bar.dataset.leg);
    const dep = bar.dataset.depart, back = bar.dataset.back;
    if (!leg || (!dep && !back)) return dep || back || '';
    const many = leg.from !== leg.to;
    const day = d => (many ? `${parseISO(d).toLocaleDateString(undefined, { weekday: 'short' })} ` : '');
    return [dep && `${day(leg.from)}${dep}`, back && `${day(leg.to)}${back}${leg.backDays ? ` +${leg.backDays}` : ''}`].filter(Boolean).join(' – ');
  }
  /* WHAT IS HAPPENING NOW, a dot and a line: out on the road, on time or
     how many minutes late to its pickup, and the worst of what Samsara
     warns; otherwise when it leaves, that it is on the road by the clock,
     or that it is back; and after either, the trip's first alert and how
     many more. */
  function sheetNow(trip, bar, board) {
    const facts = board.facts(bar);
    const alerts = alertsOf(trip, facts);
    const problems = facts?.problems ?? [];
    const first = problems[0] ?? alerts[0];
    const more = Math.max(problems.length, alerts.length) - 1;
    const words = [];
    let tone = 'quiet';
    const road = bar.dataset.road ? board.road(bar) : null;
    if (road) {
      const { next } = road;
      const warn = road.said.warnings[0];
      words.push(next?.late ? `On the road · ${next.late} min late` : 'On the road · on time');
      if (warn) words.push(warn.title);
      tone = warn?.tone === 'error' ? 'error' : next?.late || warn ? 'warning' : 'success';
    } else {
      const leg = legByKey(trip, bar.dataset.legKey || bar.dataset.leg);
      const now = Date.now();
      const out = leg ? window.SchedulerWeek.departAt(leg) : null, back = leg ? window.SchedulerWeek.backAt(leg) : null;
      if (out == null) words.push('No times yet');
      else if (now < out) {
        const min = Math.round((out - now) / 60e3);
        const day = daysBetween(parseISO(iso(new Date())), parseISO(iso(new Date(out))));
        words.push(day === 0 ? (min < 60 ? `Leaves in ${min} min` : `Leaves in ${Math.round(min / 60)}h`)
          : day === 1 ? 'Leaves tomorrow' : `Leaves in ${day} days`);
      } else if (now < back) words.push('On the road');
      else words.push(iso(new Date(back)) === iso(new Date()) ? 'Back at the yard' : 'Back');
    }
    if (first) {
      words.push(more > 0 ? `${first.words} +${more}` : first.words);
      if (tone === 'quiet' || tone === 'success') tone = problems.some(a => a.row === 'scheduler-card__error') ? 'error' : 'warning';
    }
    const line = el('div', `scheduler-sheet__now scheduler-sheet__now--${tone}`);
    line.append(el('span', 'scheduler-sheet__pip'), el('span', null, words.join(' · ')));
    return line;
  }
  // The bar's vehicle, and the partner covering it, if one does.
  const assignOf = (trip, bar) => (trip.trip_assignments || []).find(a => String(a.id) === bar.dataset.assignmentId);
  const partnerOf = (assign, board) => (assign?.partner_id != null ? board.partnersById?.get(assign.partner_id) ?? { name: 'A partner' } : null);
  /* The bar's bus and its seats, each driver by name with the bar's own
     mark, or the partner covering it with its answer's mark. */
  function sheetCrew(trip, bar, board) {
    const assign = assignOf(trip, bar);
    const due = Bar.staffingDue(legByKey(trip, bar.dataset.legKey || bar.dataset.leg) ?? { from: trip.start_date, to: trip.end_date });
    const done = window.SchedulerCloseOut.isBack(trip) && !window.SchedulerBilling.placeholder(trip);
    const partner = partnerOf(assign, board);
    if (partner) {
      const seat = el('span', 'scheduler-sheet__seat');
      const status = window.SchedulerLegFacts.DRIVER_STATUSES.find(s => s.value === (assign.partner_confirmed ? 'confirmed' : 'pending-response'));
      if (!done) seat.append(Bar.glyphEl({ href: status.icon, box: '0 0 32 32', indicator: status.indicator }));
      seat.append(el('span', null, partner.name));
      return [seat];
    }
    return (assign ? crewOf(trip, assign, board.driversById, board.statuses, { riders: true }) : []).map(c => {
      const seat = el('span', 'scheduler-sheet__seat');
      const glyph = Bar.crewGlyph(c, due, done);
      if (glyph) seat.append(Bar.glyphEl(glyph));
      seat.append(el('span', null, c.needed ? `No ${c.label.toLowerCase()}` : Bar.crewName(c)));
      return seat;
    });
  }
  function sheetKit(trip, bar, board) {
    const bus = bar.dataset.busId ? board.busesById.get(bar.dataset.busId) : null;
    const covered = bar.dataset.partnerId;
    const row = el('div', 'scheduler-sheet__kit');
    const which = el('span', 'scheduler-sheet__bus');
    which.append(svgUse('#m-directions_bus', '16', '0 0 32 32'), bus ? `Bus ${bus.number}` : covered ? 'Partner' : 'No bus');
    const crew = el('span', 'scheduler-sheet__crew');
    crew.append(...sheetCrew(trip, bar, board));
    row.append(which, crew);
    return row;
  }
  // A person and the number that dials them.
  function sheetPerson(c) {
    const who = el('span', 'scheduler-sheet__person');
    who.append(el('span', null, c.name));
    if (c.phone) {
      const call = el('a', 'scheduler-sheet__phone', showPhone(c.phone));
      call.href = `tel:${dial(c.phone)}`;
      who.append(call);
    }
    return who;
  }
  /* THE REST, under the handle once the sheet is pulled up: the facts a
     call or a change needs, then the trip on the road, its needs and its
     updates, as its card has them, and Edit trip. */
  function sheetRest(trip, bar, board) {
    const legKey = bar.dataset.legKey || bar.dataset.leg || 'outbound';
    const facts = el('dl', 'scheduler-sheet__facts');
    const fact = (name, ...values) => {
      const dd = el('dd');
      dd.append(...values);
      facts.append(el('dt', null, name), dd);
    };
    if (trip.customer) fact('Customer', trip.customer);
    const people = [tripContact(trip, 0), ...dayContactsOf(trip, legKey)].filter(c => c?.name)
      .filter((c, i, all) => all.findIndex(o => o.name === c.name && dial(o.phone || '') === dial(c.phone || '')) === i);
    if (people.length) fact(people.length > 1 ? 'Contacts' : 'Contact', ...people.map(sheetPerson));
    const stops = window.SchedulerWeek.stopsOfKey(trip, legKey);
    const pickup = stops.find(st => st.type === 'pickup') ?? stops[0];
    if (pickup) fact('Pickup', [pickup.spot ? hhmm(pickup.spot, true) : null, (pickup.name || pickup.address || '').trim()].filter(Boolean).join(' · '));
    const bus = bar.dataset.busId ? board.busesById.get(bar.dataset.busId) : null;
    const assign = assignOf(trip, bar);
    const partner = partnerOf(assign, board);
    /* A bus a partner covers is the partner's: its coach and its driver as
       the partner gave them, the driver dialling, and its price. It moves
       only on the Buses tab, where its partner is let go. */
    if (partner) {
      const crewWords = el('span', 'scheduler-sheet__crew');
      crewWords.append(...sheetCrew(trip, bar, board));
      fact('Partner', crewWords);
      if (assign.partner_vehicle) fact('Coach', assign.partner_vehicle);
      const driver = window.SchedulerLegFacts.partnerDriverOf(assign, partner);
      if (driver) fact('Driver', sheetPerson({ name: driver.name, phone: driver.phone }));
      if (partner.phone) fact('Call', sheetPerson({ name: partner.name, phone: partner.phone }));
    } else {
      const busWords = el('span', null, bus ? [vehicleName(bus), bus.capacity ? `${bus.capacity} seats` : null].filter(Boolean).join(' · ') : 'No bus');
      fact('Bus', sheetAction('move', bar, 'row', busWords, board));
      const crewWords = el('span', 'scheduler-sheet__crew');
      crewWords.append(...sheetCrew(trip, bar, board));
      if (!crewWords.childElementCount) crewWords.append('No driver seat');
      fact('Driver', sheetAction('driver', bar, 'row', crewWords, board));
    }
    return [facts, ...(bar.dataset.road ? [Tips.live(trip, bar, board)] : []), sheetCard(trip, bar, board), sheetAction('open', bar, 'edit', null, board)];
  }
  function drawSheet(trip, bar, board) {
    // Its state is written where data.js places it, `placeBarOpen`.
    const grab = el('button', 'scheduler-sheet__grab');
    grab.type = 'button';
    const head = el('div', 'scheduler-sheet__head');
    head.append(el('span', 'scheduler-sheet__dest', trip.destination || 'No destination'),
      el('span', 'scheduler-sheet__meta', [trip.customer, sheetTimes(trip, bar)].filter(Boolean).join(' · ')));
    const band = el('div', `scheduler-sheet__band scheduler-bar--${hueFor(trip)}`);
    const acts = el('div', 'scheduler-sheet__acts');
    acts.append(...ROW.map(id => sheetAction(id, bar, 'slot', null, board)));
    const rest = el('div', 'scheduler-sheet__rest');
    rest.append(...(board.section.startsWith('route:') ? [Tips.route(trip, bar, board, Infinity)] : sheetRest(trip, bar, board)));
    return [grab, head, band, sheetNow(trip, bar, board), sheetKit(trip, bar, board), acts, rest];
  }

  /* A part's own button, at its title's end: the updates' Add. A word in
     the link colour, with the whole action as its accessible name. */
  function cardAction(action, words, label) {
    /* Carbon's small ghost button, its word alone: on a card this small the
       word says the whole action, and an icon beside it is a second colour. */
    const btn = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm scheduler-card__action');
    btn.type = 'button';
    btn.dataset.cardAction = action;
    btn.setAttribute('aria-label', label);
    btn.append(words);
    return btn;
  }

  /* THE HALF SHEET'S CARD: the trip's needs and updates as bands of the
     sheet's pulled-up rest. The floating board draws each as a tip instead,
     trip-tips.js's `card`. */
  function sheetCard(trip, bar, board) {
    const card = el('div', 'scheduler-card');
    card.dataset.tripId = trip.id;
    const row = (cls, tag = 'div') => el(tag, `scheduler-card__row ${cls}`);
    const goes = (band, go, words) => {
      band.dataset.go = go;
      band.tabIndex = 0;
      band.setAttribute('role', 'button');
      band.setAttribute('aria-label', `${words}: open ${WARN_GO[go]}`);
      return band;
    };
    /* EVERY ALERT IS A LINE OF ITS OWN, a bell then its two or three words,
       so the list reads down the same way whatever kind each one is: the red
       bell with its mark for a bus that does not fit, the plain bell in the
       warning band for the rest. The words say which. None has a dismiss. A
       due trip also says when it leaves, once, at its first reminder's end. */
    /* THE NEEDS: what the trip still needs, under a title of its own with
       the count its bar carries, in the bar's colour, so the disc on the bar
       and the list it counts read as one thing, and the list in a box of its
       own under it, apart from the updates. */
    const facts = board.facts(bar);
    const problems = facts?.problems ?? [];
    const other = alertsOf(trip, facts).filter(a => !problems.some(p => p.words === a.words && p.go === a.go));
    const alerts = [...problems, ...other];
    const part = cls => row(cls);
    /* One plain list under one heading: the bar's count heads Alerts, and the
       broader needs follow in the same list, each its own icon: a mistake on
       the board is the red circle, an alert the triangle and a need the
       dashed circle. A trip with needs only is headed Other needs. Each row
       says where a press on it goes. */
    const needsLists = new Map();
    if (alerts.length) {
      const list = el('div', 'scheduler-card__needs-list');
      const needs = part('scheduler-card__needs');
      const [name, count] = problems.length ? ['Alerts', problems.length] : ['Other needs', other.length];
      needs.append(cardTitle(name, count), list);
      card.appendChild(needs);
      for (const item of alerts) needsLists.set(item, list);
    }
    let reminded = false;
    for (const a of alerts) {
      const band = goes(row(a.row), a.go, a.words);
      if (a.spot) band.dataset.spot = a.spot;
      const need = other.includes(a);
      if (need) band.classList.add('scheduler-card__row--need');
      band.append(svgUse(a.row === 'scheduler-card__error' ? '#i-warning--filled' : need ? '#i-circle-dash' : '#i-warning--alt--filled', '16', '0 0 32 32'),
        el('strong', null, a.words));
      if (a.row === 'scheduler-card__asks' && !reminded) {
        reminded = true;
        if (dueFollowUp(trip)) {
          const days = daysToGo(trip);
          band.appendChild(el('span', 'scheduler-card__asks-when',
            days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`));
        }
      }
      if (WARN_GO[a.go]) band.appendChild(el('span', 'scheduler-card__go', WARN_GO[a.go]));
      needsLists.get(a).appendChild(band);
    }
    /* THE UPDATES: Updates with their count, "Updates · 5", and Add, over
       the updates, newest first. Two show, each cut to one line, and the
       whole section is one press that opens every update in full and a
       second press closes; Add is its own button. Two updates that fit their
       lines have nothing more to show, which fitUpdates works out once they
       are drawn. With none, No updates and Add. */
    const all = updatesOf(trip);
    const { opened, editing, quick } = board.editor(trip);
    const open = all.length > 0 && opened;
    const shown = open ? all : all.slice(0, 2);
    const updates = part('scheduler-card__updates');
    updates.dataset.count = String(all.length);
    updates.dataset.shown = String(shown.length);
    updates.toggleAttribute('data-open', open);
    /* While the quick update's box is open, Add reads Save: it adds what is
       typed, as Enter does, and with nothing typed closes the box. */
    const add = quick != null ? cardAction('save', 'Save', 'Save the update') : cardAction('update', 'Add', 'Add an update');
    if (quick != null) markSave(add, !!quick.trim());
    /* An update is its author's 16px avatar, its words, and on its first
       line's end how long ago, always as a number, so every update's age
       stands in one column. The name is the avatar's tooltip and accessible
       name, and the full date the age's tooltip. */
    const canEdit = open;
    const editItem = u => {
      const item = el('li', 'scheduler-card__update scheduler-card__update--editing');
      item.dataset.updateId = u.id;
      item.dataset.editing = '';
      const face = updateFace(u, 'sm', board.staff);
      face.classList.add('scheduler-card__face');
      const edit = el('div', 'scheduler-card__edit');
      edit.dataset.updateEdit = '';
      const actions = el('div', 'scheduler-card__edit-actions');
      const small = (cls, text, act) => {
        const b = el('button', `rux--btn ${cls} rux--btn--sm rux--layout--size-sm`, text);
        b.type = 'button';
        b.dataset.editAct = act;
        return b;
      };
      if (editing.mode === 'delete') {
        edit.appendChild(el('span', 'scheduler-card__words', u.body));
        actions.append(el('span', 'scheduler-card__edit-ask', 'Delete this update?'),
          small('rux--btn--secondary', 'Cancel', 'cancel'), small('rux--btn--danger', 'Delete', 'delete'));
      } else {
        const box = el('textarea', 'rux--text-area');
        box.rows = 2;
        box.value = editing.draft ?? u.body;
        box.setAttribute('aria-label', 'Update');
        const wrap = el('div', 'rux--text-area__wrapper');
        wrap.appendChild(box);
        edit.appendChild(wrap);
        const keep = small('rux--btn--primary', 'Save', 'save');
        keep.disabled = !box.value.trim() || box.value.trim() === u.body;
        actions.append(small('rux--btn--danger--ghost', 'Delete', 'ask-delete'), small('rux--btn--secondary', 'Cancel', 'cancel'), keep);
      }
      edit.appendChild(actions);
      item.append(face, edit);
      return item;
    };
    const updateItem = u => {
      if (canEdit && editing?.id === u.id) return editItem(u);
      const item = el('li', 'scheduler-card__update');
      const face = updateFace(u, 'sm', board.staff);
      face.classList.add('scheduler-card__face');
      const when = el('span', 'scheduler-card__when', ageShort(u.created_at));
      when.title = updateStamp(u);
      /* An update is a press that opens it in its own row: a button laid over
         the whole row, so a pointer can press anywhere on it and Tab reaches
         it. */
      item.dataset.updateId = u.id;
      const open = el('button', 'scheduler-card__open');
      open.type = 'button';
      open.dataset.updateOpen = '';
      open.setAttribute('aria-label', `Edit update: ${u.body}`);
      open.title = `${updateStamp(u)}`;
      item.append(open, face, el('span', 'scheduler-card__words', u.body), when);
      return item;
    };
    /* With any updates, the title's words are the section's toggle, a real
       button with an arrow, so a keyboard and a screen reader reach what a
       press anywhere on the section does. */
    const title = cardTitle(all.length ? 'Updates' : 'No updates', all.length, add);
    if (all.length) {
      const toggle = el('button', 'scheduler-card__toggle');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', String(open));
      const heading = title.firstChild;
      heading.replaceWith(toggle);
      toggle.append(heading, svgUse('#m-keyboard_arrow_down', '16', '0 0 16 16'));
    }
    updates.appendChild(title);
    /* A quick update is typed into the card itself, in a box that Add opens
       under the title: Save or Enter adds it to the trip at once, as the
       Updates window's Add update does, and Escape clears it, or with nothing
       typed closes the box. It stays open, with what is typed, across a redraw. */
    if (quick != null) {
      const box = el('div', 'rux--text-input__field-wrapper rux--layout--size-sm scheduler-card__quick');
      box.dataset.quick = '';
      const quickInput = el('input', 'rux--text-input');
      quickInput.type = 'text';
      quickInput.placeholder = 'Add an update…';
      quickInput.setAttribute('aria-label', 'Add an update');
      quickInput.dataset.tripId = trip.id;
      quickInput.value = quick;
      box.appendChild(quickInput);
      updates.appendChild(box);
    }
    // A trip that is back opens on what it came to, each thing still to close a press as a need's row is.
    const post = postTripOf(trip);
    if (post) {
      updates.append(...postTripRows(post, 'scheduler-card', a => {
        const band = goes(row('scheduler-card__close scheduler-card__row--need'), a.go, a.words);
        band.dataset.spot = a.id;
        band.append(svgUse('#i-incomplete', '16', '0 0 32 32'), el('strong', null, a.words), el('span', 'scheduler-card__go', WARN_GO[a.go]));
        return band;
      }));
    }
    if (all.length) {
      const list = el('ol', 'scheduler-card__update-list');
      list.setAttribute('aria-label', 'Updates, newest first');
      list.append(...shown.map(updateItem));
      updates.appendChild(list);
    }
    card.appendChild(updates);
    return card;
  }

  window.SchedulerTripSheet = { draw: drawSheet };
})();
