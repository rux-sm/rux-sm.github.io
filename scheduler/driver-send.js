/* ==========================================================================
   driver-send.js — SENDING A DRIVER THEIR TRIPS (drivers.html?id=, Send trips)
   --------------------------------------------------------------------------
   The Send trips tab of a driver's record. Staff switch each of the
   driver's current and upcoming trip legs on or off their page. A switch
   saves as it is flipped, so the driver's link always shows what the
   toggles say, and a trip still being worked out stays off it until it is
   switched on; a new trip starts off. The driver's own page, drawn beside
   the list by share/driver.js, redraws after each save, so staff read what
   the driver will read.

   drivers.js says which driver the record holds, when it loads and after
   each save, and the tab reads that driver's trips and link when it is next
   open; drivers.html?id=<id>#send
   opens the record on this tab, as the board's Send trips does.

   The link functions: create_driver_schedule_share makes a link, or brings
   back the driver's last one so the address stays the same, the first time
   a trip is switched on; update_driver_schedule_share saves each switch
   after, and takes an empty list, which leaves the link showing no trips;
   revoke_driver_schedule_share stops it, and replace_driver_schedule_share
   gives it a new address, which stops the old one. A link's dates run from
   the first leg on it to the last. Copy only copies, because a copied text
   is not a sent one. Mark as sent, enabled while the driver has not
   answered a trip on their page, sets each such leg to Pending response
   through sync_trip_driver_statuses, which takes the trip's whole crew,
   read again for the mark, and changes only the rows marked dirty.
   ========================================================================== */
(() => {
  'use strict';

  const TZ = 'America/Chicago';
  const MAX_LEGS = 50;
  // The wording a driver is sent, shared with the board's reminder.
  const { DRIVER_LINK: PUBLIC, messageDate, messageRange, roleLabel, legLines, wordsFor } = window.SchedulerDriverText;
  const $ = id => document.getElementById(id);
  const client = window.Rux?.account?.client;
  const page = window.SchedulerDriverPage;
  const clean = v => String(v ?? '').trim();
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // -- words the message uses ----------------------------------------------------
  const dateOf = v => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(clean(v)); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  const nameOf = d => clean(d?.short_name || d?.name) || 'Driver';
  const activeSeats = a => {
    const roles = Array.isArray(a.active_roles) ? new Set(a.active_roles.map(e => String(e).split(':', 1)[0])) : null;
    return (a.trip_drivers || []).filter(d => d.driver_id && ((d.role || 'driver') === 'driver' || roles === null || roles.has(d.role)));
  };

  // -- the driver's legs --------------------------------------------------------------
  /* Each trip is read with its legs, routes and papers, as trip-shape.js
     reads them, and a leg is named by its id; `leg` keeps the old word the
     message's words are still chosen by. */
  const LEG_QUERY = 'id,role,report_time,instructions,trip_assignments(id,leg,route_id,active_roles,buses(number),'
    + 'trip_drivers(driver_id,role,drivers(name,short_name)),'
    + 'trips(id,destination,confirmed,trip_type,start_date,end_date,return_start_date,return_end_date,spot_time,cancelled_at,'
    + 'trip_legs(id,leg,kind,start_date,end_date,bus_count,created_at,trip_routes(id,position,name)),'
    + 'trip_contacts(id,position,leg_id,contact_id,name,phone),'
    + 'trip_stops(leg,route_id,type,name,address,spot,depart_prev,position),trip_documents(id,label,created_at,leg,leg_id)))';
  const Shape = window.SchedulerTripShape;

  let driver = null;
  let legs = [];            // [{ key, assignmentId, trip, legId, leg, role, start, end, ... }]
  let onPage = new Set();   // leg keys switched on
  let link = null;          // the driver's active link, or null
  let statuses = new Map(); // tripId:driverId:legId:role -> status

  const statusKey = (tripId, driverId, legId, role) => [tripId, driverId, legId, role || 'driver'].join(':');

  async function loadLegs() {
    const { data, error } = await client.from('trip_drivers').select(LEG_QUERY).eq('driver_id', driver.id);
    if (error) throw error;
    const now = today();
    legs = (data || []).map(row => {
      const a = row.trip_assignments;
      const trip = a?.trips;
      if (!trip || trip.cancelled_at) return null;
      const shaped = Shape.legOfRoute(trip, a.route_id);
      if (!shaped) return null;
      const leg = shaped.word || 'outbound';
      // A split trip's pickup is every leg after its first.
      const inbound = Shape.isPickup(trip, shaped.id);
      const start = shaped.start;
      const end = shaped.end || start;
      if (!dateOf(start) || String(end).slice(0, 10) < now) return null;
      if (!activeSeats(a).some(d => String(d.driver_id) === String(driver.id) && (d.role || 'driver') === (row.role || 'driver'))) return null;
      const stops = Shape.stopsOfRoute(trip, a.route_id);
      const pickup = stops.find(s => s.type === 'pickup') || {};
      const back = [...stops].reverse().find(s => s.type === 'return') || {};
      const itinerary = Shape.itineraryFor(trip, shaped.id);
      const partner = activeSeats(a).find(d => (d.role || 'driver') === 'driver' && String(d.driver_id) !== String(driver.id));
      return {
        key: `${trip.id}:${shaped.id}`, assignmentId: a.id, trip, legId: shaped.id, leg, inbound, role: row.role || 'driver',
        start: dateOf(start), end: dateOf(end) || dateOf(start),
        bus: a.buses?.number != null ? String(a.buses.number) : '',
        spot: pickup.spot || trip.spot_time, dropoff: back.depart_prev, swap: row.report_time, instructions: clean(row.instructions),
        partner: partner ? nameOf(partner.drivers) : '',
        from: pickup.address || pickup.name, to: inbound ? (back.address || back.name || '') : trip.destination, toYard: inbound,
        itinerary: itinerary?.id || '',
      };
    }).filter(Boolean).sort((x, y) => x.start - y.start || String(x.spot || '').localeCompare(String(y.spot || '')));
    statuses = await readStatuses();
  }
  /* Every answer on the driver's trips, read fresh. A read that fails throws:
     an empty answer would draw every leg as Not sent, and a mark made from
     that would turn an accepted trip back into Pending response. */
  async function readStatuses() {
    const ids = [...new Set(legs.map(l => l.trip.id))];
    const found = new Map();
    if (!ids.length) return found;
    const r = await client.rpc('get_trip_driver_statuses', { p_trip_ids: ids });
    if (r.error) throw r.error;
    for (const s of r.data || []) found.set(statusKey(s.tripId, s.driverId, s.legId, s.role), s.status);
    return found;
  }
  // Each trip's crew as it stands now, by trip: its buses, and who is in their seats.
  async function readCrews(tripIds) {
    const crews = new Map(tripIds.map(id => [id, []]));
    if (!tripIds.length) return crews;
    const { data, error } = await client.from('trip_assignments')
      .select('trip_id,leg,active_roles,trip_routes(leg_id),trip_drivers(driver_id,role)').in('trip_id', tripIds);
    if (error) throw error;
    for (const a of data || []) crews.get(a.trip_id)?.push(a);
    return crews;
  }
  const statusOf = l => statuses.get(statusKey(l.trip.id, driver.id, l.legId, l.role)) || 'off';
  // The driver's answer as a tag: its words, and the colour that says whether to act.
  const STATUS_TAGS = {
    confirmed: ['Accepted', 'rux--tag--green'], declined: ['Declined', 'rux--tag--red'],
    'pending-response': ['Pending response', 'rux--tag--blue'], off: ['Not sent', 'rux--tag--gray'],
  };
  const tag = (words, tone) => {
    const t = el('div', `rux--tag ${tone} rux--layout--size-sm`);
    t.appendChild(el('span', 'rux--tag__label', words));
    return t;
  };

  // -- the list -------------------------------------------------------------------------
  const onPageLegs = () => legs.filter(l => onPage.has(l.key));
  /* A table row a leg: its switch first, where a phone's width still shows
     it, then its day, where, the bus, the role and its tags, the driver's
     answer and, in red, Not confirmed while the customer has not confirmed
     the trip. The
     switch is Carbon's small one, whose check says On; its label is read by
     a screen reader and hidden, as Carbon's hideLabel hides it. */
  const CHECK = '<svg class="rux--toggle__check" width="6px" height="5px" viewBox="0 0 6 5"><path d="M2.2 2.7L5 0 6 1 2.2 5 0 2.7 1 1.5z"/></svg>';
  function drawList() {
    const list = $('scheduler-send-list');
    list.replaceChildren();
    $('scheduler-send-table').hidden = !legs.length;
    for (const l of legs) {
      const id = `scheduler-send-${l.key.replace(/[^a-z0-9]/gi, '-')}`;
      const date = messageDate(l.start, l.end);
      const where = clean(l.trip.destination) || 'Trip';
      const row = el('tr');
      const cell = (...kids) => { const td = el('td'); td.append(...kids); row.appendChild(td); return td; };
      const on = onPage.has(l.key);
      const toggle = el('div', 'rux--toggle');
      const button = el('button', 'rux--toggle__button');
      Object.assign(button, { id, type: 'button' });
      button.setAttribute('role', 'switch');
      button.setAttribute('aria-checked', String(on));
      button.setAttribute('aria-labelledby', `${id}-l`);
      const label = el('label', 'rux--toggle__label');
      label.htmlFor = id;
      label.id = `${id}-l`;
      const look = el('div', 'rux--toggle__appearance rux--toggle__appearance--sm');
      const knob = el('div', on ? 'rux--toggle__switch rux--toggle__switch--checked' : 'rux--toggle__switch');
      knob.innerHTML = CHECK;
      look.appendChild(knob);
      label.append(el('span', 'rux--toggle__label-text rux--visually-hidden', `On ${nameOf(driver)}'s page: ${date} · ${where}`), look);
      toggle.append(button, label);
      // Design's form-controls.js flips the switch and says so; the save follows it.
      toggle.addEventListener('rux:toggle', e => switched(l, e.detail.on));
      cell(toggle);
      cell(date).className = 'scheduler-send__date';
      cell(where);
      cell(l.bus || 'Not set');
      cell(roleLabel(l.role));
      const tags = el('div', 'scheduler-send__tags');
      tags.appendChild(tag(...(STATUS_TAGS[statusOf(l)] || STATUS_TAGS.off)));
      if (l.trip.confirmed === false) tags.appendChild(tag('Not confirmed', 'rux--tag--red'));
      cell(tags);
      list.appendChild(row);
    }
  }

  // -- the message ----------------------------------------------------------------------
  function message() {
    const chosen = onPageLegs();
    const first = nameOf(driver).split(/\s+/)[0];
    // In the driver's language, which their profile holds.
    const lang = driver?.language;
    const w = wordsFor(lang);
    if (!chosen.length) return w.noneTicked(first);
    const from = chosen.reduce((a, l) => (l.start < a ? l.start : a), chosen[0].start);
    const to = chosen.reduce((a, l) => (l.end > a ? l.end : a), chosen[0].end);
    const url = link ? PUBLIC + encodeURIComponent(link.token) : '';
    const lines = [w.week(first, messageRange(from, to, lang))];
    // Without a link, each trip carries its itinerary; the link carries them all.
    for (const l of chosen) lines.push('', ...legLines(l, { itinerary: !url, lang }));
    if (url) lines.push('', w.details, url);
    return lines.join('\n');
  }

  // -- the link -------------------------------------------------------------------------
  // The message goes while any trip is on the driver's page.
  const sendable = () => onPage.size > 0 && !!link;
  // The legs on the page a mark would change: not answered, and not marked already.
  const unanswered = () => onPageLegs().filter(l => !['confirmed', 'declined', 'pending-response'].includes(statusOf(l)));
  // Mark as sent works while the message can go and a mark would change a
  // trip, however the text was copied.
  const offerMark = () => { $('scheduler-send-mark').disabled = !sendable() || !unanswered().length; };
  function refresh() {
    const count = onPage.size;
    $('scheduler-send-state').textContent = !legs.length ? 'No current or upcoming trips.'
      : count ? `${count} ${count === 1 ? 'trip is' : 'trips are'} on ${nameOf(driver)}'s page.`
      : link ? `${nameOf(driver)}'s page shows no trips. Switch on the ones they should see.`
        : 'No link yet. Switch on a trip to make one.';
    $('scheduler-send-text').value = message();
    $('scheduler-send-copy').disabled = !sendable();
    // A change of trips or of the link changes the message, so what was said
    // of the last copy goes.
    $('scheduler-send-copied').textContent = '';
    offerMark();
    $('scheduler-leg-link').hidden = !link;
    $('scheduler-send-preview').hidden = !link;
    $('scheduler-send-preview-h').textContent = `${nameOf(driver)}'s page`;
    if (link) {
      $('scheduler-leg-link-url').textContent = PUBLIC + encodeURIComponent(link.token);
      $('scheduler-leg-link-open').href = PUBLIC + encodeURIComponent(link.token);
    }
  }
  const problem = text => { const e = $('scheduler-send-error'); e.textContent = text || ''; e.hidden = !text; };

  /* A SWITCH SAVES AT ONCE. Saves run one after another, each sending the
     whole list as it stands when it runs, so a quick run of switches ends
     with the page showing the last of them. A switch past the link's limit,
     or a save that fails, puts the switches back as the link has them. */
  let saving = Promise.resolve();
  function switched(l, on) {
    problem('');
    if (on && onPage.size >= MAX_LEGS) {
      problem(`A driver's page holds at most ${MAX_LEGS} trips. Switch one off first.`);
      drawList();
      return;
    }
    on ? onPage.add(l.key) : onPage.delete(l.key);
    refresh();
    saving = saving.then(save).catch(() => {
      problem("The change didn't save. The switches show the driver's page as it is.");
      onPage = new Set(legs.filter(x => (link?.assignmentRefs || []).some(r => refKey(r) === x.key)).map(x => x.key));
      drawList();
      refresh();
    });
  }
  const refKey = r => `${r.tripId}:${r.legId}`;
  async function save() {
    const chosen = onPageLegs();
    // No link and nothing on: there is nothing to keep.
    if (!link && !chosen.length) return;
    const from = chosen.length ? iso(chosen.reduce((a, l) => (l.start < a ? l.start : a), chosen[0].start)) : today();
    const to = chosen.length ? iso(chosen.reduce((a, l) => (l.end > a ? l.end : a), chosen[0].end)) : today();
    const ids = chosen.map(l => l.assignmentId);
    const r = link
      ? await client.rpc('update_driver_schedule_share', { p_token: link.token, p_assignment_ids: ids, p_range_start: from, p_range_end: to })
      : await client.rpc('create_driver_schedule_share', { p_driver_id: driver.id, p_assignment_ids: ids, p_range_start: from, p_range_end: to });
    if (r.error || !r.data?.token) throw r.error || new Error('No link');
    link = r.data;
    refresh();
    await page.show(link.token);
  }

  /* A link that has gone further than it should gets a new address: the old
     one stops opening the driver's trips, and the trips on it stay. */
  async function replace() {
    const r = await client.rpc('replace_driver_schedule_share', { p_token: link.token });
    window.Rux?.modal?.close($('scheduler-send-replace-modal'));
    if (r.error || !r.data?.token) { problem("The link wasn't replaced, so the old address still works. Try again."); return; }
    link = r.data;
    refresh();
    await page.show(link.token);
  }

  async function revoke() {
    const r = await client.rpc('revoke_driver_schedule_share', { p_token: link.token });
    window.Rux?.modal?.close($('scheduler-send-revoke-modal'));
    if (r.error) { problem("The link wasn't revoked, so it still works. Try again."); return; }
    link = null;
    page.clear();
    refresh();
  }

  const tripsWord = n => `${n} ${n === 1 ? 'trip' : 'trips'}`;

  /* Copies the message and marks nothing. The answers are read again, so
     the list and the offer of Mark as sent are current; answers that cannot
     be read end the offer. */
  async function copy() {
    const note = $('scheduler-send-copied');
    try { await navigator.clipboard.writeText($('scheduler-send-text').value); } catch {
      $('scheduler-send-text').select();
      note.textContent = "The message couldn't be copied here. It is selected; copy it yourself.";
      return;
    }
    try { statuses = await readStatuses(); } catch {
      note.textContent = "Copied. The driver's answers could not be read, so no trip can be marked here; set them from the trip.";
      $('scheduler-send-mark').disabled = true;
      return;
    }
    drawList();
    offerMark();
    const n = unanswered().length;
    note.textContent = n ? `Copied. Once the text has gone, mark ${tripsWord(n)} as sent.` : 'Copied.';
  }

  /* Marks each leg on the driver's page they have not answered Pending response. The
     answers are read once more first, since the driver may have answered
     since the page read them. The whole crew of each trip is sent, as
     sync_trip_driver_statuses asks, with only those legs marked dirty, and
     the crew is read now too, because the function deletes the status of a
     seat its list leaves out and a seat may have been filled since the
     driver was picked. A leg whose seat is no longer this driver's is left
     alone and said. A trip that could not be marked keeps the offer. */
  async function mark() {
    const note = $('scheduler-send-copied');
    try { statuses = await readStatuses(); } catch {
      note.textContent = "The driver's answers could not be read, so no trip was marked. Try again.";
      return;
    }
    const chosen = unanswered();
    let crews;
    try { crews = await readCrews([...new Set(chosen.map(l => l.trip.id))]); } catch {
      note.textContent = "The trips' crews could not be read, so no trip was marked. Try again.";
      return;
    }
    const targets = new Set(chosen.map(l => statusKey(l.trip.id, driver.id, l.legId, l.role)));
    const sent = new Set();   // the targets found in a seat, and so marked dirty
    let failed = false;
    for (const [tripId, crew] of crews) {
      const list = crew.flatMap(a => activeSeats(a).map(d => {
        const legId = a.trip_routes?.leg_id ?? null;
        const key = statusKey(tripId, d.driver_id, legId, d.role);
        const dirty = targets.has(key);
        if (dirty) sent.add(key);
        return { driverId: d.driver_id, legId, leg: a.leg || 'outbound', role: d.role || 'driver', status: dirty ? 'pending-response' : statuses.get(key) || 'off', dirty };
      }));
      if (!list.some(s => s.dirty)) continue;
      const r = await client.rpc('sync_trip_driver_statuses', { p_trip_id: tripId, p_statuses: list });
      if (r.error) failed = true;
      else for (const s of list) if (s.dirty) statuses.set(statusKey(tripId, s.driverId, s.legId, s.role), 'pending-response');
    }
    const marked = sent.size;
    const gone = chosen.filter(l => !sent.has(statusKey(l.trip.id, driver.id, l.legId, l.role))).length;
    const lost = gone ? ` The driver's seat has changed on ${tripsWord(gone)}, which ${gone === 1 ? 'was' : 'were'} not marked. Reload the page to read their trips again.` : '';
    note.textContent = failed ? 'Some trips could not be marked Pending response. Try again, or set them from the trip.'
      : marked ? `${marked} ${marked === 1 ? 'trip is' : 'trips are'} marked Pending response.${lost}`
      : gone ? `Nothing was marked.${lost}`
      : 'Nothing was marked: the driver has answered.';
    offerMark();
    drawList();
  }

  // -- the driver's record ----------------------------------------------------------------
  /* Reads the record's driver: their link and their legs. The legs on the
     link start on; a new leg, or every leg with no link, starts off. A
     record that has moved on to another driver while this one was read
     draws nothing. */
  async function read() {
    const id = driver.id;
    page.clear();
    problem('');
    $('scheduler-send-copied').textContent = '';
    $('scheduler-send').hidden = true;
    $('scheduler-leg-link').hidden = true;
    $('scheduler-send-preview').hidden = true;
    const [share] = await Promise.all([client.rpc('get_driver_schedule_share_for_driver', { p_driver_id: id }), loadLegs()]);
    if (driver?.id !== id) return;
    if (share.error) { page.say('error', "The driver's link didn't load", 'Try again.', open); return; }
    const s = share.data;
    const live = s?.token && (!s.expiresAt || new Date(s.expiresAt) > new Date());
    link = live ? s : null;
    const onLink = new Set((link?.assignmentRefs || []).map(refKey));
    onPage = new Set(legs.filter(l => onLink.has(l.key)).map(l => l.key));
    drawList();
    refresh();
    $('scheduler-send').hidden = false;
    // With no link, the list's own line says so.
    if (link) await page.show(link.token);
  }
  const open = () => read().catch(() => page.say('error', 'Something went wrong', 'Try again.', open));

  if (!client || !page) {
    page?.say('info', 'This preview has no connection', 'Open http://localhost:8641/, the cloud preview, to send a driver their trips.');
    return;
  }
  const tab = $('scheduler-driver-tab-send');
  let stale = true;   // the record's driver has not been read since it was last said
  const show = () => {
    if (!driver || !stale || tab.getAttribute('aria-selected') !== 'true') return;
    stale = false;
    open();
  };
  /* drivers.js says which driver the record holds, when it loads and after
     each save. A save can change the name and the language the message is
     written in, or set the driver Inactive, so the tab reads again. */
  document.addEventListener('scheduler:driver-loaded', e => {
    driver = e.detail?.id ? e.detail : null;
    stale = true;
    show();
  });
  tab.closest('[role="tablist"]').addEventListener('rux:tab-selected', show);
  $('scheduler-send-copy').addEventListener('click', () => copy().catch(() => { $('scheduler-send-copied').textContent = "The message couldn't be copied. Try again."; }));
  $('scheduler-send-mark').addEventListener('click', () => mark().catch(() => { $('scheduler-send-copied').textContent = 'The trips could not be marked. Set them from the trip.'; }));
  // The link's overflow menu. design/js/menu.js closes the menu on a click
  // and puts focus back on its trigger, so a dialog opens after that and
  // keeps the focus it takes; closing it returns focus to the trigger.
  const ask = modal => () => setTimeout(() => window.Rux?.modal?.open($(modal), $('scheduler-send-menu-trigger')), 0);
  $('scheduler-send-revoke').addEventListener('click', ask('scheduler-send-revoke-modal'));
  $('scheduler-send-replace').addEventListener('click', ask('scheduler-send-replace-modal'));
  $('scheduler-send-replace-confirm').addEventListener('click', () => replace().catch(() => problem("The link wasn't replaced, so the old address still works. Try again.")));
  $('scheduler-send-revoke-confirm').addEventListener('click', () => revoke().catch(() => problem("The link wasn't revoked, so it still works. Try again.")));
})();
