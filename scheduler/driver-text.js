/* ==========================================================================
   Rux Scheduler — THE WORDING A DRIVER IS SENT
   --------------------------------------------------------------------------
   One leg as a driver reads it in a text, loaded by the Driver week info
   page and by the board and owned by neither: the week info message lists a
   driver's legs over their link, and the Contacts window's reminder sends one
   leg on its own. One wording, so a reminder and the week's message never
   describe the same leg two ways.

   IT TAKES A LEG, NOT A PAGE. Each page reads its own rows and hands in the
   same shape: { trip, leg, role, start, end, bus, spot, swap, instructions,
   partner, from, to, itinerary }, dates as Date and times as stored.
   ========================================================================== */
(() => {
  'use strict';

  // Always the published site: a link goes to a driver's phone, which cannot
  // reach a preview running on this Mac.
  const SITE = 'https://rux-sm.github.io';
  const DRIVER_LINK = `${SITE}/scheduler/share/driver.html?s=`;
  const DOCUMENT_LINK = `${SITE}/scheduler/share/document.html?id=`;

  const clean = v => String(v ?? '').trim();
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const short = (d, opts) => d.toLocaleDateString('en-US', opts);
  // "THU 10/1", or "THU 10/1–SUN 10/4" across days.
  const messageDate = (a, b) => {
    const day = d => short(d, { weekday: 'short' }).toUpperCase();
    const num = d => `${d.getMonth() + 1}/${d.getDate()}`;
    return iso(a) === iso(b) ? `${day(a)} ${num(a)}` : `${day(a)} ${num(a)}–${day(b)} ${num(b)}`;
  };
  // "11:43 AM", from a stored "11:43:00".
  const timeText = v => {
    const t = clean(v);
    if (/[ap]m$/i.test(t)) return t.toUpperCase();
    const m = /^(\d{1,2}):(\d{2})/.exec(t);
    if (!m) return t;
    const h = +m[1];
    return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
  };
  // "Invented High School, 1 Main St, Brownsville, TX 78520" as "Brownsville".
  const town = v => {
    const parts = clean(v).split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) return clean(v);
    if (/^(united states|usa|us)$/i.test(parts.at(-1))) parts.pop();
    if (parts.length > 1 && /^(texas|tx|oklahoma|ok)(\s+\d{5}(?:-\d{4})?)?$/i.test(parts.at(-1))) parts.pop();
    return parts.at(-1);
  };
  const ROLE = { 'driver': 'Driver', 'co-driver': 'Co-driver', 'relief-start': 'Relief driver', 'relief-end': 'Relief driver' };
  const roleLabel = r => ROLE[r] || 'Driver';
  const isRelief = r => r === 'relief-start' || r === 'relief-end';

  /* A leg's stops, in route order. A drop-off and pickup trip saved before
     stops carried their leg keeps both legs in one run, split at the second
     pickup after the first return. */
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

  /* One leg's lines: the day, bus, role and which way a split trip's leg
     runs; then a relief driver's swap, and their instructions, or everyone
     else's spot time; then where the leg runs from and to. `itinerary` adds
     the leg's itinerary link, which a message without a driver link carries. */
  function legLines(l, { itinerary = false } = {}) {
    const lines = [];
    const legWord = l.trip.trip_type === 'dropoff_pickup' ? (l.leg === 'return' ? 'Inbound' : 'Outbound') : '';
    lines.push([messageDate(l.start, l.end), `Bus ${l.bus}`, roleLabel(l.role), legWord].filter(Boolean).join(' • '));
    if (isRelief(l.role)) {
      lines.push(l.swap ? `${timeText(l.swap)} swap` : l.partner ? `Swap: coordinate with ${l.partner}` : 'Swap time not set');
      if (l.instructions) lines.push(l.instructions);
    } else if (l.spot) {
      lines.push(`${timeText(l.spot)} spot`);
    }
    const a = town(l.from), b = town(l.to);
    if (a || b) lines.push(`${a || 'Pickup'} → ${b || 'Destination'}`);
    if (itinerary && l.itinerary) lines.push(`Itinerary: ${DOCUMENT_LINK}${encodeURIComponent(l.itinerary)}`);
    return lines;
  }

  /* The reminder for one leg, to one driver by their first name: today,
     tomorrow, or coming up, from `today` as yyyy-mm-dd on the office's
     calendar, then the leg's lines and its itinerary. */
  function reminder(first, l, today) {
    const [y, m, d] = today.split('-').map(Number);
    const next = iso(new Date(y, m - 1, d + 1));
    const when = iso(l.start) === today ? 'today' : iso(l.start) === next ? 'tomorrow' : 'coming up';
    return [`Hi ${first}, a reminder for your trip ${when}:`, '', ...legLines(l, { itinerary: true })].join('\n');
  }

  window.SchedulerDriverText = {
    SITE, DRIVER_LINK, DOCUMENT_LINK,
    messageDate, timeText, town, roleLabel, isRelief, stopsForLeg, legLines, reminder,
  };
})();
