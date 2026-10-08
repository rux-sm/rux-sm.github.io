/* ==========================================================================
   Rux Scheduler — THE WORDING A QUOTE CARRIES
   --------------------------------------------------------------------------
   The one line item's description, loaded by the board and by the forms page
   and owned by neither: the trip editor's Billing tab copies this block into
   a QuickBooks estimate, and the customer quote prints it on paper. One
   wording, two destinations, so a pasted estimate and a printed quote can
   never disagree.

   IT TAKES A TRIP, NOT A PAGE. The board reads the editor's controls, so a
   quote can be copied while it is still being written; the forms page reads
   the saved row. Both hand the same fields in, and neither spells a line.
   ========================================================================== */
(() => {
  'use strict';

  const TRIP_TYPES = { round_trip: 'round trip', one_way: 'one way', dropoff_pickup: 'drop-off and pickup' };
  // What each leg of a drop-off and pickup trip is, quoted as a line of its own.
  const LEG_TYPES = { outbound: 'drop-off', return: 'pickup' };

  /* State names as a quote abbreviates them: a stored address carries the name
     in full, "Texas 78504", when the map service returned it, and the code,
     "TX 78504", when it was typed or saved that way. */
  const STATES = Object.fromEntries('Alabama:AL,Alaska:AK,Arizona:AZ,Arkansas:AR,California:CA,Colorado:CO,Connecticut:CT,Delaware:DE,Florida:FL,Georgia:GA,Hawaii:HI,Idaho:ID,Illinois:IL,Indiana:IN,Iowa:IA,Kansas:KS,Kentucky:KY,Louisiana:LA,Maine:ME,Maryland:MD,Massachusetts:MA,Michigan:MI,Minnesota:MN,Mississippi:MS,Missouri:MO,Montana:MT,Nebraska:NE,Nevada:NV,New Hampshire:NH,New Jersey:NJ,New Mexico:NM,New York:NY,North Carolina:NC,North Dakota:ND,Ohio:OH,Oklahoma:OK,Oregon:OR,Pennsylvania:PA,Rhode Island:RI,South Carolina:SC,South Dakota:SD,Tennessee:TN,Texas:TX,Utah:UT,Vermont:VT,Virginia:VA,Washington:WA,West Virginia:WV,Wisconsin:WI,Wyoming:WY'
    .split(',').flatMap(pair => {
      const [name, code] = pair.split(':');
      return [[name, code], [code, code]];
    }));

  /* Split rather than passed to `new Date()`, which reads a bare date as UTC
     midnight and names the day before west of Greenwich. */
  const parseDay = s => {
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  /* A place as a quote names it, "Edinburg, TX": the last part that is a
     state, with or without its ZIP, and the city in the part before it. An
     address shaped otherwise is carried across whole, because a quote reads
     better with too much address than with none. */
  const stateOf = part => STATES[part.replace(/\s*\d{5}(-\d{4})?$/, '')] ?? null;
  function place(text) {
    const parts = String(text || '').split(',').map(part => part.trim()).filter(Boolean);
    const at = parts.findLastIndex(stateOf);
    return at > 0 ? `${parts[at - 1]}, ${stateOf(parts[at])}` : parts.join(', ');
  }

  /* A range as the office writes one: "December 11-13, 2026", the month named
     once inside a month and twice across two, and a single day left alone. */
  function dates(from, to) {
    if (!from) return '';
    const a = parseDay(from);
    const b = to ? parseDay(to) : a;
    const month = d => d.toLocaleDateString('en-US', { month: 'long' });
    if (a.getTime() === b.getTime()) return `${month(a)} ${a.getDate()}, ${a.getFullYear()}`;
    if (a.getFullYear() !== b.getFullYear()) {
      return `${month(a)} ${a.getDate()}, ${a.getFullYear()} to ${month(b)} ${b.getDate()}, ${b.getFullYear()}`;
    }
    return a.getMonth() === b.getMonth()
      ? `${month(a)} ${a.getDate()}-${b.getDate()}, ${b.getFullYear()}`
      : `${month(a)} ${a.getDate()} to ${month(b)} ${b.getDate()}, ${b.getFullYear()}`;
  }

  // "7:00 AM", the long form a quote takes, from a stored "07:00:00".
  const clock = t => {
    if (!t) return '';
    const [h, m] = String(t).split(':');
    const hr = Number(h);
    if (!Number.isFinite(hr) || m === undefined) return String(t).slice(0, 5);
    return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`;
  };

  /* The vehicle line, "(52 passengers)", with no count of buses because the
     line's Quantity carries it. A quote names the seats the customer asked
     for, never the assigned bus's: 52, and 56 only where a vehicle of the
     line carries the 56 passengers need on the Buses tab. */
  function vehicle(pax56) {
    return `(${pax56 ? 56 : 52} passengers)`;
  }

  /* A one-day trip that is back at an earlier hour than it left is back the
     next day, past midnight, and the quote says which day, so 1:00 AM is not
     read as the morning the trip starts. */
  const minutes = t => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(t ?? ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  function backDay(trip) {
    const from = trip.from || null;
    const left = minutes(trip.leave), back = minutes(trip.back);
    if (!from || (trip.to || from) !== from || left == null || back == null || back >= left) return null;
    const next = parseDay(from);
    next.setDate(next.getDate() + 1);
    return next.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }

  /* The block itself. A line the trip cannot answer yet is dropped, except the
     two times, which the office writes as TBD and settles with the customer.

     ONE LEG OF A DROP-OFF AND PICKUP TRIP (`leg`) IS A LINE OF ITS OWN, and
     says which it is: the way out is the drop-off, from the pickup to the
     destination, and the way back is the pickup, from the destination to
     where the group was picked up, so the two lines tell the legs apart by
     more than their dates. Each says only when it departs, because to the
     customer each leg is a departure. */
  function description(trip) {
    const leg = !trip.leg ? null : trip.leg === 'return' ? 'return' : 'outbound';
    const from = trip.from || null;
    const pickup = place(trip.pickup || '');
    const drop = String(trip.destination || '').trim();
    const [start, end] = leg === 'return' ? [drop, pickup] : [pickup, drop];
    return [
      `${vehicle(trip.pax56)} ${(leg && LEG_TYPES[leg]) || TRIP_TYPES[trip.type] || 'trip'}`,
      [start ? `from ${start}` : null, end ? `to ${end}` : null].filter(Boolean).join(' '),
      from ? `on ${dates(from, trip.to || from)}` : null,
      `departing at ${clock(trip.leave) || 'TBD'}`,
      leg ? null : `arriving at ${clock(trip.back) || 'TBD'}${backDay(trip) ? ` on ${backDay(trip)}` : ''}`,
    ].filter(Boolean).join('\n');
  }

  window.SchedulerQuoteText = { place, dates, clock, vehicle, description };
})();
