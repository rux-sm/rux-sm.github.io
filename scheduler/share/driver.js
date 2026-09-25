/* ==========================================================================
   share/driver.js — A DRIVER'S SCHEDULE LINK
   --------------------------------------------------------------------------
   driver.html?s=<token> shows a driver, without a log-in, the trip legs
   dispatch sent them, one card each, and lets them accept or decline. It is
   rux-ui's driver.html drawn with Design, feature for feature, plus two
   things: each trip's requirements, and a trip changed since it was accepted
   asks again, saying what changed.

   Everything comes through token-checked functions, so the page keeps
   working once the database admits only staff:
     get_driver_schedule_share       the driver, the legs and the link's dates
     get_driver_share_trips          the trips with stops, crew and documents
     get_driver_assignment_statuses  each answer
     get_driver_accepted_views       what each accepted card showed
     confirm_ / decline_trip_assignment, record_driver_accepted_view

   WHAT THE DRIVER ACCEPTED IS KEPT. Accept sends, with the answer, the card's
   view of the driver's own job (`jobView`). A later load compares that with
   the card now: a difference lists before and after and asks again. Edits
   that are not the driver's job, like price or colour, are not in the view,
   so they ask nothing. A leg accepted before views were kept asks again, with
   no list, when the trip was saved after the answer, which is rux-ui's rule.

   Two pages load this. The public page takes the token from its address.
   The staff page, driver-view.html, marks its body data-driver="staff" and
   draws the same cards through `SchedulerDriverPage` below, with Accept and
   Decline disabled, because staff answer from the trip; driver-view.js
   picks the driver and makes their link.
   ========================================================================== */
(() => {
  'use strict';

  const TZ = 'America/Chicago';
  const CHANNEL = 'scheduler-trips';
  const $ = id => document.getElementById(id);
  const staffPage = document.body.dataset.driver === 'staff';
  const client = window.Rux?.account?.client;
  const phone = value => window.SchedulerPhone?.format(value) ?? String(value ?? '');

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  // An icon from the page's sprite, named whole with its hash so the sprite
  // tool finds it: icon('#m-call').
  const icon = (id, size = 16) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', id);
    svg.appendChild(use);
    return svg;
  };
  const clean = v => String(v ?? '').trim();

  // -- the page's notice ------------------------------------------------------
  const NOTICE = {
    info: ['rux--inline-notification rux--inline-notification--info', '#m-info-fill'],
    error: ['rux--inline-notification rux--inline-notification--error', '#m-error-fill'],
    warning: ['rux--inline-notification rux--inline-notification--warning', '#m-warning-fill'],
  };
  let retry = null;
  const say = (kind, title, text, again) => {
    const wrap = $('scheduler-share-notice');
    if (!kind) { wrap.hidden = true; return; }
    $('scheduler-share-notice-box').className = NOTICE[kind][0];
    $('scheduler-share-notice-icon').setAttribute('href', NOTICE[kind][1]);
    $('scheduler-share-notice-title').textContent = title;
    $('scheduler-share-notice-text').textContent = text || '';
    retry = again || null;
    $('scheduler-share-retry').hidden = !again;
    wrap.hidden = false;
  };
  $('scheduler-share-retry')?.addEventListener('click', () => retry?.());

  const announce = text => {
    const live = $('scheduler-leg-announcer');
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = text; });
  };

  // -- dates and times, as the driver reads them --------------------------------
  const dateOnly = v => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(clean(v));
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  };
  const dayFmt = (opts) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts });
  const dayText = (v, year = true) => {
    const d = dateOnly(v);
    return d ? dayFmt({ weekday: 'short', month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}) }).format(d) : '';
  };
  const rangeText = (from, to) => {
    const a = dateOnly(from), b = dateOnly(to) || a;
    if (!a) return '';
    if (a.getTime() === b.getTime()) return dayText(from);
    const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
    return `${dayFmt({ weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) }).format(a)} – ${dayText(to)}`;
  };
  // A wall-clock time as it was typed, "06:00" or "6:00 am", as 6:00 AM.
  const timeText = v => {
    const t = clean(v);
    const clock = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(t);
    if (clock) {
      const h = +clock[1];
      return `${h % 12 || 12}:${clock[2]} ${h < 12 ? 'AM' : 'PM'}`;
    }
    return /^\d{1,2}:\d{2}\s*[ap]m$/i.test(t) ? t.replace(/\s+/g, ' ').toUpperCase() : t;
  };
  // When dispatch last touched the link, in the office's time.
  const updatedText = v => {
    const d = new Date(v);
    if (!v || Number.isNaN(d.getTime())) return '';
    const day = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
    const time = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(d);
    if (day.format(d) === day.format(new Date())) return `Updated today at ${time}`;
    return `Updated ${new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric' }).format(d)} at ${time}`;
  };
  // A leg stays until the end of its last day, in the office's time.
  const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

  // -- the trip, as rux-ui reads it -------------------------------------------
  const ROLE = { 'driver': 'Driver', 'co-driver': 'Co-driver', 'relief-start': 'Relief driver', 'relief-end': 'Relief driver', 'relief_driver': 'Relief driver' };
  const roleLabel = r => ROLE[r] || 'Driver';
  const isRelief = r => roleLabel(r) === 'Relief driver';
  // A seat other than the driver counts only while the bus lists its role.
  const activeSeats = a => {
    const roles = Array.isArray(a.active_roles) ? new Set(a.active_roles.map(e => String(e).split(':', 1)[0])) : null;
    return (a.trip_drivers || []).filter(d => (d.role || 'driver') === 'driver' || roles === null || roles.has(d.role));
  };

  // A drop-off-and-pickup trip saved as one list splits at its second pickup.
  const stopsForLeg = (trip, leg) => {
    const all = [...(trip.trip_stops || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    let out = all.filter(s => (s.leg || 'outbound') !== 'return');
    let back = all.filter(s => s.leg === 'return');
    if (trip.trip_type === 'dropoff_pickup' && !back.length) {
      const firstReturn = out.findIndex(s => s.type === 'return');
      const second = out.findIndex((s, i) => i > firstReturn && s.type === 'pickup');
      if (firstReturn >= 0 && second > firstReturn) { back = out.slice(second); out = out.slice(0, second); }
    }
    return leg === 'return' ? back : out;
  };

  const LEGACY_REQS = [['sleeper', 'req_sleeper'], ['pax56', 'req_56pax'], ['adaLift', 'req_ada'], ['hotel', 'need_hotel'], ['fuelCard', 'need_fuel_card']];
  const LEGACY_NAMES = { sleeper: 'Sleeper bus', pax56: '56-passenger bus', adaLift: 'Wheelchair lift', hotel: 'Hotel', fuelCard: 'Fuel card' };
  let requirementNames = new Map();
  const requirementsOf = trip => {
    const ids = trip.trip_reqs && Object.keys(trip.trip_reqs).length
      ? Object.entries(trip.trip_reqs).filter(([, on]) => on).map(([id]) => id)
      : LEGACY_REQS.filter(([, col]) => trip[col]).map(([id]) => id);
    return ids.map(id => requirementNames.get(id) || LEGACY_NAMES[id] || id);
  };

  // The day-of contact first, then the second, then whoever booked.
  const contactOf = trip => [
    [trip.trip_contact_1_name, trip.trip_contact_1_phone],
    [trip.trip_contact_2_name, trip.trip_contact_2_phone],
    [trip.booking_contact_name, trip.booking_contact_phone],
  ].map(([name, tel]) => ({ name: clean(name), phone: clean(tel) })).find(c => c.name || c.phone) || null;

  // The newest file of each itinerary label, marked Updated when it replaced one.
  const itinerariesOf = trip => {
    const docs = trip.trip_documents || [];
    const labels = [...new Set(docs.map(d => d.label).filter(l => /(^|[^a-z])itinerary([^a-z]|$)/i.test(l || '')))];
    return labels.map(label => {
      const same = docs.filter(d => d.label === label);
      const newest = same.reduce((a, b) => (new Date(b.created_at || 0) > new Date(a.created_at || 0) ? b : a));
      return { id: newest.id, label, path: newest.file_path, updated: same.length > 1 };
    }).sort((a, b) => (/^itinerary$/i.test(a.label) ? -1 : /^itinerary$/i.test(b.label) ? 1 : a.label.localeCompare(b.label)));
  };
  // A public address until share/document asks for a short-lived link.
  const fileUrl = path => (path && client ? client.storage.from('trip-documents').getPublicUrl(path).data?.publicUrl : '');

  /* One leg of one trip, as this driver works it. */
  function legOf(ref, trip, driverId) {
    const leg = ref.leg || 'outbound';
    const assignments = (trip.trip_assignments || []).filter(a => (a.leg || 'outbound') === leg);
    const mine = assignments.find(a => activeSeats(a).some(d => String(d.driver_id) === String(driverId)));
    if (!mine) return { error: 'This assignment is no longer assigned to you.' };
    const seat = activeSeats(mine).find(d => String(d.driver_id) === String(driverId));
    const role = seat.role || 'driver';
    const inbound = leg === 'return' && trip.trip_type === 'dropoff_pickup';
    const stops = stopsForLeg(trip, leg);
    const pickup = stops.find(s => s.type === 'pickup') || {};
    const back = [...stops].reverse().find(s => s.type === 'return') || {};
    const start = inbound ? trip.return_start_date : trip.start_date;
    const end = inbound ? (trip.return_end_date || trip.return_start_date) : (trip.end_date || trip.start_date);
    const crew = assignments.map(a => ({
      bus: a.buses?.number != null ? String(a.buses.number) : '',
      mine: a === mine,
      people: activeSeats(a).filter(d => String(d.driver_id) !== String(driverId)).map(d => ({
        name: d.drivers?.short_name || d.drivers?.name || 'Crew member',
        role: roleLabel(d.role),
        phone: clean(d.drivers?.phone),
      })),
    })).filter(b => b.people.length).sort((a, b) => (a.mine ? -1 : b.mine ? 1 : 0));
    return {
      trip, leg, role, start, end,
      destination: inbound ? (back.name || back.address || 'Yard') : (trip.destination || 'Destination'),
      customer: clean(trip.customer),
      bus: mine.buses?.number != null ? String(mine.buses.number) : '',
      time: isRelief(role) ? (seat.report_time || pickup.spot || trip.spot_time) : (pickup.spot || trip.spot_time),
      place: { name: clean(pickup.name), address: clean(pickup.address) },
      stops,
      relief: isRelief(role) ? {
        at: clean(seat.report_time),
        instructions: clean(seat.instructions),
        // Who they take over from, to agree the handoff with when no time is set.
        from: clean(activeSeats(mine).find(d => (d.role || 'driver') === 'driver' && String(d.driver_id) !== String(driverId))?.drivers?.short_name
          || activeSeats(mine).find(d => (d.role || 'driver') === 'driver' && String(d.driver_id) !== String(driverId))?.drivers?.name),
      } : null,
      instructions: clean(seat.instructions),
      requirements: requirementsOf(trip),
      notes: clean(trip.notes),
      contact: contactOf(trip),
      crew,
      itineraries: itinerariesOf(trip),
      activeRoles: mine.active_roles || [],
    };
  }

  /* THE DRIVER'S JOB, AS THE CARD SHOWS IT. What Accept keeps and a later
     load compares. Every value is text as the card writes it, so a change
     reads as the driver would read it. */
  const stopText = s => [clean(s.name) || clean(s.address) || clean(s.label) || 'Stop',
    s.arrive && `arrive ${timeText(s.arrive)}`, s.depart_prev && `leave ${timeText(s.depart_prev)}`].filter(Boolean).join(' · ');
  function jobView(l) {
    return {
      dates: rangeText(l.start, l.end),
      time: timeText(l.time),
      place: [l.place.name, l.place.address].filter(Boolean).join(', '),
      destination: l.destination,
      stops: l.stops.map(stopText),
      bus: l.bus,
      role: roleLabel(l.role),
      relief: l.relief ? [l.relief.at && `Handoff at ${timeText(l.relief.at)}`, l.relief.instructions].filter(Boolean).join(' · ') : '',
      requirements: [...l.requirements].sort(),
      notes: l.notes,
      itinerary: l.itineraries[0]?.id || '',
    };
  }
  const VIEW_LABELS = {
    dates: 'Dates', time: 'Time', place: 'Pickup', destination: 'Destination', stops: 'Stops', bus: 'Bus',
    role: 'Role', relief: 'Relief details', requirements: 'Requirements', notes: 'Notes', itinerary: 'Itinerary',
  };
  // Each difference as one line the driver reads.
  function changesBetween(was, now, l) {
    const lines = [];
    for (const key of Object.keys(VIEW_LABELS)) {
      const a = was?.[key] ?? (Array.isArray(now[key]) ? [] : '');
      const b = now[key];
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      if (key === 'itinerary') lines.push(b ? 'New itinerary' : 'Itinerary removed');
      else if (key === 'notes') lines.push('Notes changed');
      else if (key === 'stops') lines.push('Stops changed');
      else if (key === 'requirements') {
        const added = b.filter(x => !a.includes(x)), gone = a.filter(x => !b.includes(x));
        if (added.length) lines.push(`Added: ${added.join(', ')}`);
        if (gone.length) lines.push(`Removed: ${gone.join(', ')}`);
      } else {
        const label = key === 'time' ? (isRelief(l.role) ? 'Report time' : 'Spot time') : VIEW_LABELS[key];
        lines.push(`${label}: ${a || 'none'} → ${b || 'none'}`);
      }
    }
    return lines;
  }

  // -- the answer ---------------------------------------------------------------
  let token = '';
  let statuses = new Map();
  let views = new Map();
  const keyOf = (tripId, leg, role) => `${tripId}:${leg || 'outbound'}:${role || 'driver'}`;

  function stateOf(l) {
    const row = statuses.get(keyOf(l.trip.id, l.leg, l.role)) || statuses.get(keyOf(l.trip.id, l.leg, 'driver'));
    const legacy = String(l.activeRoles.find(e => String(e).split(':', 1)[0] === l.role) || '').split(':', 2)[1] || '';
    const byDispatch = ['confirmed', 'success'].includes(legacy);
    if (row?.status === 'declined') return { status: 'declined' };
    if (!(row?.status === 'confirmed' || row?.confirmedAt || byDispatch)) return { status: 'pending' };
    const kept = views.get(keyOf(l.trip.id, l.leg, l.role));
    if (kept) {
      const lines = changesBetween(kept, jobView(l), l);
      return lines.length ? { status: 'changed', lines } : { status: 'accepted' };
    }
    const at = row?.confirmedAt || row?.acceptedAt;
    const stale = at && l.trip.updated_at && new Date(l.trip.updated_at) > new Date(at);
    return stale ? { status: 'changed', lines: [] } : { status: 'accepted' };
  }

  let channel = null;
  async function answer(l, action) {
    const { data, error } = await client.rpc(action === 'accept' ? 'confirm_trip_assignment' : 'decline_trip_assignment',
      { p_token: token, p_trip_id: l.trip.id, p_leg: l.leg });
    if (error || !data) throw error || new Error('No answer');
    const key = keyOf(l.trip.id, l.leg, data.role || l.role);
    statuses.set(key, { status: action === 'accept' ? 'confirmed' : 'declined', confirmedAt: data.confirmedAt || data.acceptedAt || null });
    if (action === 'accept') {
      const view = jobView(l);
      // Kept for the next load; a database without the column keeps nothing.
      const kept = await client.rpc('record_driver_accepted_view', { p_token: token, p_trip_id: l.trip.id, p_leg: l.leg, p_view: view });
      if (!kept.error) views.set(key, view);
    } else {
      views.delete(key);
    }
    // rux-ui's board listens here and redraws the driver's status.
    channel?.send({ type: 'broadcast', event: 'driver-status-changed',
      payload: { tripId: l.trip.id, driverId: data.driverId, leg: l.leg, role: data.role || l.role } }).catch(() => {});
  }

  // -- decline, confirmed first -------------------------------------------------
  const declineModal = $('scheduler-leg-decline-modal');
  let declineResolve = null;
  const confirmDecline = trigger => new Promise(resolve => {
    declineResolve = resolve;
    window.Rux?.modal?.open(declineModal, trigger);
  });
  $('scheduler-leg-decline-confirm')?.addEventListener('click', () => {
    const done = declineResolve; declineResolve = null;
    window.Rux?.modal?.close(declineModal);
    done?.(true);
  });
  // Escape, Cancel or the close button: the modal says it closed.
  declineModal?.addEventListener('rux:modal-closed', () => { const done = declineResolve; declineResolve = null; done?.(false); });

  // -- a card -------------------------------------------------------------------
  // Whole class names, so the check can find each one in this file.
  const TAG = { blue: 'rux--tag rux--tag--blue rux--layout--size-sm', gray: 'rux--tag rux--tag--gray rux--layout--size-sm', purple: 'rux--tag rux--tag--purple rux--layout--size-sm' };
  const tag = (text, color, iconId) => {
    const t = el('span', TAG[color]);
    if (iconId) { const i = icon(iconId); i.setAttribute('class', 'rux--tag__custom-icon'); t.appendChild(i); }
    t.appendChild(el('span', 'rux--tag__label', text));
    return t;
  };
  const linkButton = (label, href, iconId, aria) => {
    const a = el('a', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', label);
    a.href = href;
    if (aria) a.setAttribute('aria-label', aria);
    if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
    if (iconId) { const i = icon(iconId); i.setAttribute('class', 'rux--btn__icon'); a.appendChild(i); }
    return a;
  };
  const callAndText = (name, tel) => {
    const wrap = el('div', 'scheduler-leg-card__actions');
    if (!tel) return wrap;
    const digits = tel.replace(/[^\d+]/g, '');
    wrap.append(linkButton('Call', `tel:${digits}`, '#m-call', `Call ${name}`), linkButton('Text', `sms:${digits}`, '#m-chat', `Text ${name}`));
    return wrap;
  };
  const section = (title, ...children) => {
    const s = el('section', 'scheduler-leg-card__section');
    if (title) s.appendChild(el('h3', 'scheduler-leg-card__label', title));
    s.append(...children.filter(Boolean));
    return s;
  };

  function responseOf(l, card) {
    const state = stateOf(l);
    const wrap = el('div', 'scheduler-leg-card__response');
    if (state.status === 'accepted' || state.status === 'declined') {
      const accepted = state.status === 'accepted';
      const s = el('p', `scheduler-leg-card__state scheduler-leg-card__state--${state.status}`);
      s.append(icon(accepted ? '#m-check_circle-fill' : '#m-cancel-fill', 20), el('span', null, accepted ? 'Accepted' : 'Declined'));
      wrap.appendChild(s);
      return wrap;
    }
    if (state.status === 'changed') {
      const box = el('div', 'rux--inline-notification rux--inline-notification--warning rux--inline-notification--low-contrast scheduler-leg-card__changed');
      box.setAttribute('role', 'status');
      const details = el('div', 'rux--inline-notification__details');
      const i = icon('#m-warning-fill', 20); i.setAttribute('class', 'rux--inline-notification__icon');
      const text = el('div', 'rux--inline-notification__text-wrapper');
      text.appendChild(el('div', 'rux--inline-notification__title', 'This trip changed since you accepted it'));
      const sub = el('div', 'rux--inline-notification__subtitle');
      if (state.lines.length) {
        const ul = el('ul', 'scheduler-leg-card__changes');
        for (const line of state.lines) ul.appendChild(el('li', null, line));
        sub.appendChild(ul);
      } else {
        sub.textContent = 'Check the details below, then answer again.';
      }
      text.appendChild(sub);
      details.append(i, text);
      box.appendChild(details);
      wrap.appendChild(box);
    }
    const buttons = el('div', 'scheduler-leg-card__buttons');
    const decline = el('button', 'rux--btn rux--btn--danger--ghost rux--btn--md rux--layout--size-md', 'Decline');
    const accept = el('button', 'rux--btn rux--btn--primary rux--btn--md rux--layout--size-md', 'Accept');
    decline.type = accept.type = 'button';
    const error = el('p', 'rux--form-requirement scheduler-leg-card__error');
    error.setAttribute('role', 'alert');
    error.hidden = true;
    if (staffPage) {
      decline.disabled = accept.disabled = true;
      buttons.title = 'Drivers answer here. Set a driver status from the trip.';
    }
    const act = async (button, action) => {
      if (action === 'decline' && !(await confirmDecline(button))) return;
      error.hidden = true;
      decline.disabled = accept.disabled = true;
      button.textContent = action === 'accept' ? 'Accepting…' : 'Declining…';
      try {
        await answer(l, action);
        card.replaceWith(cardOf(l));
        announce(action === 'accept' ? 'Assignment accepted' : 'Assignment declined');
      } catch {
        decline.disabled = accept.disabled = false;
        decline.textContent = 'Decline';
        accept.textContent = 'Accept';
        error.textContent = `We couldn't ${action} this assignment. Check your connection and try again.`;
        error.hidden = false;
      }
    };
    decline.addEventListener('click', () => act(decline, 'decline'));
    accept.addEventListener('click', () => act(accept, 'accept'));
    buttons.append(decline, accept);
    wrap.append(buttons, error);
    return wrap;
  }

  function cardOf(l) {
    const card = el('article', 'rux--tile scheduler-leg-card');
    const id = `scheduler-leg-${l.trip.id}-${l.leg}`;
    card.setAttribute('aria-labelledby', id);

    const head = el('header', 'scheduler-leg-card__head');
    const title = el('h2', 'rux--type-productive-heading-03', rangeText(l.start, l.end) || 'Assignment');
    title.id = id;
    head.appendChild(title);
    head.appendChild(el('p', 'rux--type-body-compact-02 scheduler-leg-card__where', l.destination));
    if (l.customer) head.appendChild(el('p', 'rux--type-body-compact-01 scheduler-leg-card__customer', l.customer));
    const tags = el('div', 'scheduler-leg-card__tags');
    tags.append(tag(l.bus ? `Bus ${l.bus}` : 'Bus not set', 'blue', '#m-directions_bus'), tag(roleLabel(l.role), 'gray', '#m-person'));
    for (const r of l.requirements) tags.appendChild(tag(r, 'purple'));
    head.appendChild(tags);
    card.appendChild(head);
    card.appendChild(responseOf(l, card));

    // Where to be, and when.
    const where = [l.place.name, l.place.address].filter(Boolean).join(', ');
    if (where || l.time) {
      const body = el('div', 'scheduler-leg-card__row');
      const lines = el('div');
      if (l.time) lines.appendChild(el('p', 'rux--type-heading-compact-02', `${isRelief(l.role) ? 'Report' : 'Spot'} at ${timeText(l.time)}`));
      if (where) lines.appendChild(el('address', 'rux--type-body-compact-01', where));
      body.appendChild(lines);
      if (where) body.appendChild(linkButton('Navigate', `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`, '#m-location_on', `Navigate to ${where}`));
      card.appendChild(section('Where to be', body));
    }

    if (l.contact) {
      const body = el('div', 'scheduler-leg-card__row');
      const lines = el('div');
      if (l.contact.name) lines.appendChild(el('p', 'rux--type-body-compact-02', l.contact.name));
      if (l.contact.phone) lines.appendChild(el('p', 'rux--type-body-compact-01', phone(l.contact.phone)));
      body.append(lines, callAndText(l.contact.name || 'the trip contact', l.contact.phone));
      card.appendChild(section('Trip contact', body));
    }

    if (l.relief) {
      // With no time set, relief drivers agree the handoff between themselves.
      const lines = [
        l.relief.at ? `Handoff at ${timeText(l.relief.at)}`
          : l.relief.from ? `Coordinate the handoff time with ${l.relief.from}.` : '',
        l.relief.instructions,
      ].filter(Boolean);
      card.appendChild(section('Relief assignment', ...(lines.length ? lines : ['Dispatch will send the handoff details.'])
        .map(t => el('p', 'rux--type-body-compact-01', t))));
    } else if (l.instructions) {
      card.appendChild(section('Role details', el('p', 'rux--type-body-compact-01', l.instructions)));
    }

    if (l.crew.length) {
      const list = el('div', 'scheduler-leg-card__crew');
      l.crew.forEach((bus, i) => {
        const group = el('div', 'scheduler-leg-card__bus');
        group.appendChild(el('p', 'rux--type-label-01 scheduler-leg-card__bus-name', bus.mine ? 'Your bus' : `Bus ${bus.bus || 'not set'}`));
        for (const p of bus.people) {
          const row = el('div', 'scheduler-leg-card__row');
          const lines = el('div');
          lines.append(el('p', 'rux--type-body-compact-02', p.name), el('p', 'rux--type-body-compact-01 scheduler-leg-card__muted', p.role));
          row.append(lines, callAndText(p.name, p.phone));
          group.appendChild(row);
        }
        group.hidden = i > 1;
        list.appendChild(group);
      });
      const more = l.crew.length > 2 ? el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm',
        `View all crew (${l.crew.reduce((n, b) => n + b.people.length, 0)})`) : null;
      if (more) {
        more.type = 'button';
        more.setAttribute('aria-expanded', 'false');
        more.addEventListener('click', () => {
          const open = more.getAttribute('aria-expanded') !== 'true';
          more.setAttribute('aria-expanded', String(open));
          [...list.children].forEach((g, i) => { if (i > 1) g.hidden = !open; });
          more.textContent = open ? 'Show less crew' : `View all crew (${l.crew.reduce((n, b) => n + b.people.length, 0)})`;
        });
      }
      card.appendChild(section('Crew', list, more));
    }

    if (l.notes) {
      const notes = el('p', 'rux--type-body-compact-01 scheduler-leg-card__notes', l.notes);
      let more = null;
      if (l.notes.length > 240) {
        notes.classList.add('scheduler-leg-card__notes--folded');
        more = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', 'View full notes');
        more.type = 'button';
        more.setAttribute('aria-expanded', 'false');
        more.addEventListener('click', () => {
          const open = more.getAttribute('aria-expanded') !== 'true';
          more.setAttribute('aria-expanded', String(open));
          notes.classList.toggle('scheduler-leg-card__notes--folded', !open);
          more.textContent = open ? 'Show less' : 'View full notes';
        });
      }
      card.appendChild(section('Notes', notes, more));
    }

    if (l.itineraries.length) {
      const docs = el('div', 'scheduler-leg-card__actions');
      for (const d of l.itineraries) {
        const url = fileUrl(d.path);
        if (url) docs.appendChild(linkButton(d.updated ? `${d.label} (updated)` : d.label, url, '#m-description'));
      }
      if (docs.childElementCount) card.appendChild(section('Documents', docs));
    }
    return card;
  }

  function problemCard(text) {
    const card = el('article', 'rux--tile scheduler-leg-card');
    card.append(el('h2', 'rux--type-productive-heading-03', 'Assignment unavailable'), el('p', 'rux--type-body-compact-01', text));
    return card;
  }

  // -- loading ------------------------------------------------------------------
  const listEl = $('scheduler-leg-list');
  const introEl = $('scheduler-leg-intro');
  const clear = () => { listEl.replaceChildren(); introEl.hidden = true; };

  async function load() {
    say(null);
    const share = await client.rpc('get_driver_schedule_share', { p_token: token });
    if (share.error) { clear(); say('error', "Your schedule can't be loaded right now", 'Check your connection and try again.', load); return; }
    if (!share.data) {
      clear();
      say('error', 'This link is no longer active', staffPage ? 'Make a new link for this driver in rux-ui.' : 'Contact dispatch if you still need your schedule.', load);
      return;
    }
    const s = share.data;
    const [trips, answers, kept] = await Promise.all([
      client.rpc('get_driver_share_trips', { p_token: token }),
      client.rpc('get_driver_assignment_statuses', { p_token: token }),
      client.rpc('get_driver_accepted_views', { p_token: token }),
    ]);
    if (trips.error || !trips.data) { clear(); say('error', "Your schedule can't be loaded right now", 'Check your connection and try again.', load); return; }
    requirementNames = new Map((Array.isArray(trips.data.requirements) ? trips.data.requirements : []).map(r => [r.id, r.label]));
    statuses = new Map((answers.data || []).map(a => [keyOf(a.tripId, a.leg, a.role), a]));
    // A database without kept views answers with an error; nothing is kept.
    views = new Map((kept.error ? [] : kept.data || []).map(v => [keyOf(v.tripId, v.leg, v.role), v.view]));

    const today = todayIso();
    const items = (s.assignmentRefs || []).map(ref => {
      const trip = (trips.data.trips || []).find(t => String(t.id) === String(ref.tripId));
      if (!trip) return { error: 'This assignment could not be loaded.' };
      if (trip.cancelled_at) return null;
      return legOf(ref, trip, s.driver.id);
    }).filter(Boolean).filter(i => i.error || String(i.end || i.start || '').slice(0, 10) >= today)
      // Soonest first, and a leg that would not load after the rest.
      .sort((a, b) => (!!a.error - !!b.error) || String(a.start || '').localeCompare(String(b.start || '')));

    $('scheduler-leg-hello').textContent = `Hello ${s.driver.shortName || s.driver.name}`;
    $('scheduler-leg-range').textContent = rangeText(s.rangeStart, s.rangeEnd);
    const updated = updatedText(s.updatedAt);
    $('scheduler-leg-updated').textContent = updated;
    $('scheduler-leg-updated-tag').hidden = !updated;
    introEl.hidden = false;
    listEl.replaceChildren(...items.map(i => (i.error ? problemCard(i.error) : cardOf(i))));
    if (!items.length) say('info', 'No current assignments', 'New assignments will appear here after dispatch schedules them.');
  }

  /* The staff page, driver-view.html, draws a driver's page through this:
     driver-view.js picks the driver and their link, and hands over the token. */
  window.SchedulerDriverPage = {
    show: t => { token = t; return load().catch(() => say('error', 'Something went wrong', 'Check your connection and try again.', load)); },
    clear: () => { clear(); say(null); },
    say,
  };

  // -- start ------------------------------------------------------------------------
  if (!client) {
    say('info', 'This preview has no connection', 'Open http://localhost:8641/, the cloud preview, to load a schedule.');
    return;
  }
  const run = f => f().catch(() => say('error', 'Something went wrong', 'Check your connection and try again.', () => run(f)));
  if (!staffPage) {
    token = (new URLSearchParams(location.search).get('s') ?? '').trim().toLowerCase();
    if (!token) { say('error', 'This link has no schedule in it', 'Ask dispatch for a new driver schedule link.'); return; }
    channel = client.channel(CHANNEL);
    channel.subscribe();
    run(load);
  }
})();
