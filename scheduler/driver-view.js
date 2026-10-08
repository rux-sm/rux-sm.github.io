/* ==========================================================================
   driver-view.js — SENDING A DRIVER THEIR TRIPS (driver-view.html)
   --------------------------------------------------------------------------
   Staff pick a driver, tick which of their current and upcoming trip legs
   go on the driver's link, copy the message to send them, and make, update
   or revoke the link, as rux-ui's Driver week info window does. The
   driver's own page, drawn below by share/driver.js, redraws from the link
   once it is saved, so staff read what the driver will read.

   The link functions are the ones rux-ui calls: create_driver_schedule_share
   makes a link, or brings back the driver's last one so the address stays
   the same; update_driver_schedule_share saves a new choice to the same
   address; revoke_driver_schedule_share stops it. A link's dates run from
   the first ticked leg to the last. Copy only copies, and only while the
   link shows the ticked trips, because a copied text is not a sent one. Mark
   as sent, offered after a copy, sets each ticked leg the driver has not
   answered to Pending response through sync_trip_driver_statuses, which
   takes the trip's whole crew and changes only the rows marked dirty.
   ========================================================================== */
(() => {
  'use strict';

  const TZ = 'America/Chicago';
  const MAX_LEGS = 50;
  // The wording a driver is sent, shared with the board's reminder.
  const { DRIVER_LINK: PUBLIC, messageDate, roleLabel, stopsForLeg, legLines } = window.SchedulerDriverText;
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

  // -- words the message uses, as rux-ui writes them -----------------------------
  const dateOf = v => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(clean(v)); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  const short = (d, opts) => d.toLocaleDateString('en-US', opts);
  const rangeText = (a, b) => (iso(a) === iso(b) ? short(a, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : `${short(a, { month: 'short', day: 'numeric' })} – ${short(b, { month: 'short', day: 'numeric', year: 'numeric' })}`);
  const nameOf = d => clean(d?.short_name || d?.name) || 'Driver';
  const activeSeats = a => {
    const roles = Array.isArray(a.active_roles) ? new Set(a.active_roles.map(e => String(e).split(':', 1)[0])) : null;
    return (a.trip_drivers || []).filter(d => d.driver_id && ((d.role || 'driver') === 'driver' || roles === null || roles.has(d.role)));
  };

  // -- the driver's legs --------------------------------------------------------------
  const LEG_QUERY = 'id,role,report_time,instructions,trip_assignments(id,leg,active_roles,buses(number),'
    + 'trip_drivers(driver_id,role,drivers(name,short_name)),'
    + 'trips(id,destination,trip_type,start_date,end_date,return_start_date,return_end_date,spot_time,cancelled_at,'
    + 'trip_stops(leg,type,name,address,spot,position),trip_documents(id,label,created_at),trip_assignments(id,leg,active_roles,trip_drivers(driver_id,role))))';

  let driver = null;
  let legs = [];            // [{ key, assignmentId, trip, leg, role, start, end, ... }]
  let ticked = new Set();   // leg keys
  let link = null;          // the driver's active link, or null
  let statuses = new Map(); // tripId:driverId:leg:role -> status

  const statusKey = (tripId, driverId, leg, role) => [tripId, driverId, leg || 'outbound', role || 'driver'].join(':');

  async function loadLegs() {
    const { data, error } = await client.from('trip_drivers').select(LEG_QUERY).eq('driver_id', driver.id);
    if (error) throw error;
    const now = today();
    legs = (data || []).map(row => {
      const a = row.trip_assignments;
      const trip = a?.trips;
      if (!trip || trip.cancelled_at) return null;
      const leg = a.leg || 'outbound';
      const inbound = leg === 'return' && trip.trip_type === 'dropoff_pickup';
      const start = inbound ? trip.return_start_date : trip.start_date;
      const end = (inbound ? (trip.return_end_date || trip.return_start_date) : (trip.end_date || trip.start_date)) || start;
      if (!dateOf(start) || String(end).slice(0, 10) < now) return null;
      if (!activeSeats(a).some(d => String(d.driver_id) === String(driver.id) && (d.role || 'driver') === (row.role || 'driver'))) return null;
      const stops = stopsForLeg(trip, leg);
      const pickup = stops.find(s => s.type === 'pickup') || {};
      const back = [...stops].reverse().find(s => s.type === 'return') || {};
      const itinerary = (trip.trip_documents || []).filter(d => /^itinerary$/i.test(clean(d.label)))
        .sort((x, y) => new Date(y.created_at || 0) - new Date(x.created_at || 0))[0];
      const partner = activeSeats(a).find(d => (d.role || 'driver') === 'driver' && String(d.driver_id) !== String(driver.id));
      return {
        key: `${trip.id}:${leg}`, assignmentId: a.id, trip, leg, role: row.role || 'driver',
        start: dateOf(start), end: dateOf(end) || dateOf(start),
        bus: a.buses?.number != null ? String(a.buses.number) : 'not set',
        spot: pickup.spot || trip.spot_time, swap: row.report_time, instructions: clean(row.instructions),
        partner: partner ? nameOf(partner.drivers) : '',
        from: pickup.address || pickup.name, to: inbound ? (back.address || back.name || 'Yard') : trip.destination,
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
    for (const s of r.data || []) found.set(statusKey(s.tripId, s.driverId, s.leg, s.role), s.status);
    return found;
  }
  const statusOf = l => statuses.get(statusKey(l.trip.id, driver.id, l.leg, l.role)) || 'off';
  const STATUS_WORDS = { confirmed: 'Accepted', declined: 'Declined', 'pending-response': 'Pending response' };

  // -- the list -------------------------------------------------------------------------
  const tickedLegs = () => legs.filter(l => ticked.has(l.key));
  function drawList() {
    const list = $('scheduler-send-list');
    list.replaceChildren();
    if (!legs.length) { list.appendChild(el('p', 'rux--type-body-compact-01 scheduler-send__note', 'No current or upcoming trips.')); return; }
    let month = '';
    for (const l of legs) {
      const m = short(l.start, { month: 'long', year: 'numeric' });
      if (m !== month) { month = m; list.appendChild(el('p', 'rux--type-label-01 scheduler-send__month', m)); }
      const id = `scheduler-send-${l.key.replace(/[^a-z0-9]/gi, '-')}`;
      const item = el('div', 'rux--form-item rux--checkbox-wrapper');
      const box = el('input', 'rux--checkbox');
      Object.assign(box, { type: 'checkbox', id, checked: ticked.has(l.key) });
      box.addEventListener('change', () => { box.checked ? ticked.add(l.key) : ticked.delete(l.key); refresh(); });
      const label = el('label', 'rux--checkbox-label');
      label.htmlFor = id;
      const text = el('div', 'rux--checkbox-label-text scheduler-send__leg');
      text.append(el('span', null, `${messageDate(l.start, l.end)} · ${clean(l.trip.destination) || 'Trip'}`),
        el('span', 'scheduler-send__meta', [`Bus ${l.bus}`, roleLabel(l.role), STATUS_WORDS[statusOf(l)] || 'Not sent'].join(' · ')));
      label.appendChild(text);
      item.append(box, label);
      list.appendChild(item);
    }
  }

  // -- the message ----------------------------------------------------------------------
  function message() {
    const chosen = tickedLegs();
    const first = nameOf(driver).split(/\s+/)[0];
    if (!chosen.length) return `Hi ${first}, no trips are ticked yet.`;
    const from = chosen.reduce((a, l) => (l.start < a ? l.start : a), chosen[0].start);
    const to = chosen.reduce((a, l) => (l.end > a ? l.end : a), chosen[0].end);
    const url = link ? PUBLIC + encodeURIComponent(link.token) : '';
    const lines = [`Hi ${first}, here are your assignments for ${rangeText(from, to)}:`];
    // Without a link, each trip carries its itinerary; the link carries them all.
    for (const l of chosen) lines.push('', ...legLines(l, { itinerary: !url }));
    if (url) lines.push('', 'Trip details and itineraries:', url);
    return lines.join('\n');
  }

  // -- the link -------------------------------------------------------------------------
  const refKey = r => `${r.tripId}:${r.leg || 'outbound'}`;
  const matchesLink = () => {
    if (!link) return false;
    const a = [...ticked].sort().join('|');
    const b = (link.assignmentRefs || []).map(refKey).sort().join('|');
    return a === b;
  };
  function refresh() {
    const count = ticked.size;
    const save = $('scheduler-send-save');
    save.textContent = link ? 'Update link' : 'Create link';
    save.disabled = !count || count > MAX_LEGS || matchesLink();
    $('scheduler-send-revoke').hidden = !link;
    $('scheduler-send-state').textContent = count > MAX_LEGS ? `A link holds at most ${MAX_LEGS} trips. Untick some.`
      : !link ? (count ? `No link yet. ${count} ${count === 1 ? 'trip is' : 'trips are'} ticked.` : 'No link yet. Tick the trips to send.')
      : matchesLink() ? 'The link shows these trips.'
      : 'The link shows different trips. Update it to match.';
    $('scheduler-send-text').value = message();
    // A link that shows other trips would send the driver to a page without
    // these, so the message waits for the link to be updated.
    $('scheduler-send-copy').disabled = !count || (!!link && !matchesLink());
    // A change of ticks or of the link ends the offer to mark the last copy.
    $('scheduler-send-mark').hidden = true;
    $('scheduler-leg-link').hidden = !link;
    if (link) {
      $('scheduler-leg-link-url').textContent = PUBLIC + encodeURIComponent(link.token);
      $('scheduler-leg-link-open').href = PUBLIC + encodeURIComponent(link.token);
    }
  }
  const problem = text => { const e = $('scheduler-send-error'); e.textContent = text || ''; e.hidden = !text; };

  async function save() {
    const chosen = tickedLegs();
    if (!chosen.length) return;
    const from = iso(chosen.reduce((a, l) => (l.start < a ? l.start : a), chosen[0].start));
    const to = iso(chosen.reduce((a, l) => (l.end > a ? l.end : a), chosen[0].end));
    const ids = chosen.map(l => l.assignmentId);
    const button = $('scheduler-send-save');
    button.disabled = true;
    problem('');
    const r = link
      ? await client.rpc('update_driver_schedule_share', { p_token: link.token, p_assignment_ids: ids, p_range_start: from, p_range_end: to })
      : await client.rpc('create_driver_schedule_share', { p_driver_id: driver.id, p_assignment_ids: ids, p_range_start: from, p_range_end: to });
    if (r.error || !r.data?.token) {
      problem("The link didn't save. Try again.");
      refresh();
      return;
    }
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
    page.say('info', 'This driver has no link', 'Tick their trips and create one.');
    refresh();
  }

  // The ticked legs a mark would change: not answered, and not marked already.
  const unanswered = () => tickedLegs().filter(l => !['confirmed', 'declined', 'pending-response'].includes(statusOf(l)));
  const tripsWord = n => `${n} ${n === 1 ? 'trip' : 'trips'}`;

  /* Copies the message and marks nothing. The answers are read again, so
     the list is current, and Mark as sent is offered for the legs the driver
     has not answered. */
  async function copy() {
    const note = $('scheduler-send-copied');
    const markBtn = $('scheduler-send-mark');
    markBtn.hidden = true;
    try { await navigator.clipboard.writeText($('scheduler-send-text').value); } catch {
      $('scheduler-send-text').select();
      note.textContent = "The message couldn't be copied here. It is selected; copy it yourself.";
      return;
    }
    try { statuses = await readStatuses(); } catch {
      note.textContent = "Copied. The driver's answers could not be read, so no trip can be marked here; set them from the trip.";
      return;
    }
    drawList();
    const n = unanswered().length;
    note.textContent = n ? `Copied. Once the text has gone, mark ${tripsWord(n)} as sent.` : 'Copied.';
    markBtn.hidden = !n;
  }

  /* Marks each ticked leg the driver has not answered Pending response. The
     answers are read once more first, since the driver may have answered
     since the copy. The whole crew of each trip is sent, as
     sync_trip_driver_statuses asks, with only those legs marked dirty. */
  async function mark() {
    const note = $('scheduler-send-copied');
    const markBtn = $('scheduler-send-mark');
    try { statuses = await readStatuses(); } catch {
      note.textContent = "The driver's answers could not be read, so no trip was marked. Try again.";
      return;
    }
    const chosen = unanswered();
    const targets = new Set(chosen.map(l => statusKey(l.trip.id, driver.id, l.leg, l.role)));
    let marked = 0;
    let failed = false;
    for (const trip of new Map(chosen.map(l => [l.trip.id, l.trip])).values()) {
      const list = (trip.trip_assignments || []).flatMap(a => activeSeats(a).map(d => {
        const key = statusKey(trip.id, d.driver_id, a.leg, d.role);
        const now = statuses.get(key) || 'off';
        const dirty = targets.has(key) && now !== 'pending-response';
        if (dirty) marked++;
        return { driverId: d.driver_id, leg: a.leg || 'outbound', role: d.role || 'driver', status: dirty ? 'pending-response' : now, dirty };
      }));
      if (!list.some(s => s.dirty)) continue;
      const r = await client.rpc('sync_trip_driver_statuses', { p_trip_id: trip.id, p_statuses: list });
      if (r.error) failed = true;
      else for (const s of list) if (s.dirty) statuses.set(statusKey(trip.id, s.driverId, s.leg, s.role), 'pending-response');
    }
    if (marked && !failed) {
      const channel = client.channel('scheduler-trips');
      channel.subscribe(state => {
        if (state === 'SUBSCRIBED') channel.send({ type: 'broadcast', event: 'driver-status-changed', payload: { driverId: driver.id, status: 'pending-response' } })
          .finally(() => client.removeChannel(channel));
      });
    }
    note.textContent = failed ? 'Some trips could not be marked Pending response; set them from the trip.'
      : marked ? `${marked} ${marked === 1 ? 'trip is' : 'trips are'} marked Pending response.`
      : 'Nothing was marked: the driver has answered.';
    markBtn.hidden = true;
    drawList();
  }

  // -- picking a driver -------------------------------------------------------------------
  async function pick(id, drivers) {
    page.clear();
    problem('');
    $('scheduler-send-copied').textContent = '';
    $('scheduler-send').hidden = true;
    $('scheduler-leg-link').hidden = true;
    driver = drivers.find(d => d.id === id) || null;
    if (!driver) { page.say('info', 'Pick a driver', 'Tick their trips to send, and read their page as they will see it.'); return; }
    history.replaceState(null, '', `driver-view.html?driver=${encodeURIComponent(id)}`);
    const [share] = await Promise.all([client.rpc('get_driver_schedule_share_for_driver', { p_driver_id: id }), loadLegs()]);
    if (share.error) { page.say('error', "The driver's link didn't load", 'Try again.', () => pick(id, drivers)); return; }
    const s = share.data;
    const live = s?.token && (!s.expiresAt || new Date(s.expiresAt) > new Date());
    link = live ? s : null;
    // The legs already on the link start ticked; with no link, every leg does.
    const onLink = new Set((link?.assignmentRefs || []).map(refKey));
    ticked = new Set(legs.filter(l => (link ? onLink.has(l.key) : true)).map(l => l.key));
    drawList();
    refresh();
    $('scheduler-send').hidden = false;
    if (link) await page.show(link.token);
    else page.say('info', 'This driver has no link', 'Tick their trips and create one.');
  }

  async function start() {
    const account = window.Rux.account;
    let staff = null;
    try { staff = await account.staffProfile(); } catch { /* said below */ }
    if (!staff) { page.say('error', "This account isn't set up as staff yet", 'Ask the owner to set it up.'); return; }
    const picker = $('scheduler-leg-driver');
    const { data, error } = await client.from('drivers').select('id,name,short_name').order('name');
    if (error) { page.say('error', "The drivers didn't load", 'Reload the page to try again.'); return; }
    const drivers = data || [];
    for (const d of drivers) picker.appendChild(Object.assign(el('option', 'rux--select-option', d.name || d.short_name), { value: d.id }));
    picker.addEventListener('change', () => pick(picker.value, drivers).catch(() => page.say('error', 'Something went wrong', 'Pick the driver again.')));
    $('scheduler-send-save').addEventListener('click', () => save().catch(() => { problem("The link didn't save. Try again."); refresh(); }));
    $('scheduler-send-copy').addEventListener('click', () => copy().catch(() => { $('scheduler-send-copied').textContent = "The message couldn't be copied. Try again."; }));
    $('scheduler-send-mark').addEventListener('click', () => mark().catch(() => { $('scheduler-send-copied').textContent = 'The trips could not be marked. Set them from the trip.'; }));
    $('scheduler-send-revoke').addEventListener('click', e => window.Rux?.modal?.open($('scheduler-send-revoke-modal'), e.currentTarget));
    $('scheduler-send-revoke-confirm').addEventListener('click', () => revoke().catch(() => problem("The link wasn't revoked, so it still works. Try again.")));
    const wanted = new URLSearchParams(location.search).get('driver') || '';
    if (wanted && drivers.some(d => d.id === wanted)) picker.value = wanted;
    await pick(picker.value, drivers);
  }

  if (!client || !page) {
    page?.say('info', 'This preview has no connection', 'Open http://localhost:8641/, the cloud preview, to send a driver their trips.');
    return;
  }
  start().catch(() => page.say('error', 'Something went wrong', 'Reload the page to try again.'));
})();
