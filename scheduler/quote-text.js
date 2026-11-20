/* ==========================================================================
   Rux Scheduler — THE WORDING A QUOTE CARRIES
   --------------------------------------------------------------------------
   The one line item's description, loaded by the board and by the forms page
   and owned by neither: the trip editor's Billing tab copies this block into
   a QuickBooks estimate, the customer quote prints it on paper, and the
   QuickBooks invoice export writes it on the invoice. One wording, three
   destinations, so an estimate, a quote and an invoice never disagree. It
   is short enough for the invoice, whose import keeps only 99 characters of
   a line's description.

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

  /* A range as the office writes one: "Dec 11–13, 2026", the month named
     once inside a month, "Nov 30 – Dec 2, 2026" across two, and a single day
     left alone, the month abbreviated and the days joined by an en dash. */
  function dates(from, to) {
    if (!from) return '';
    const a = parseDay(from);
    const b = to ? parseDay(to) : a;
    const month = d => d.toLocaleDateString('en-US', { month: 'short' });
    if (a.getTime() === b.getTime()) return `${month(a)} ${a.getDate()}, ${a.getFullYear()}`;
    if (a.getFullYear() !== b.getFullYear()) {
      return `${month(a)} ${a.getDate()}, ${a.getFullYear()} – ${month(b)} ${b.getDate()}, ${b.getFullYear()}`;
    }
    return a.getMonth() === b.getMonth()
      ? `${month(a)} ${a.getDate()}–${b.getDate()}, ${b.getFullYear()}`
      : `${month(a)} ${a.getDate()} – ${month(b)} ${b.getDate()}, ${b.getFullYear()}`;
  }

  // "7:00 AM", the long form a quote takes, from a stored "07:00:00".
  const clock = t => {
    if (!t) return '';
    const [h, m] = String(t).split(':');
    const hr = Number(h);
    if (!Number.isFinite(hr) || m === undefined) return String(t).slice(0, 5);
    return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`;
  };

  /* The vehicle, "52-seat", as the coach trade sizes a bus, with no count of
     buses because the line's Quantity carries it. A quote names the seats
     the customer asked for, never the assigned bus's: 52, and 56 only where
     a vehicle of the line carries the 56 passengers need on the Buses tab. */
  const vehicle = pax56 => `${pax56 ? 56 : 52}-seat`;

  /* The day a trip is back: its own last day, or the next on a one-day trip
     back at an earlier hour than it left, past midnight by past-midnight.js's
     rule, so 1:00 AM is not read as the morning the trip starts. */
  function backOn(trip) {
    const from = trip.from || null;
    const to = trip.to || from;
    if (!from || to !== from || !window.SchedulerPastMidnight.after(trip.leave, trip.back)) return to;
    const next = parseDay(from);
    next.setDate(next.getDate() + 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  }

  /* THE DAYS THE BLOCK NAMES, its second line, which the agreement and the
     office's itinerary print under their names too, so every sheet of a
     quote says the trip's days in the same words: a whole trip's run to the
     day it is back, the next where it is back past midnight, and a leg's
     are its own. */
  function days(trip) {
    const from = trip.from || null;
    return from ? dates(from, trip.leg ? trip.to || from : backOn(trip)) : '';
  }

  /* The block itself, a line each: what it is, "52-seat round trip"; the
     days, "Nov 16–17, 2026", which a customer's office matches an invoice
     by; the places, "Mission, TX to San Antonio, TX"; and the times, "6:00 AM
     – 8:42 PM" from leaving to getting back. A line the trip cannot answer
     yet is dropped, except the times, which the office writes as TBD and
     settles with the customer: one of the two unknown is TBD in its place,
     "6:00 AM – TBD", and both unknown are "Times TBD", because two TBDs
     about a dash say nothing of what is to be decided.

     ONE LEG OF A DROP-OFF AND PICKUP TRIP (`leg`) IS A LINE OF ITS OWN, and
     says which it is: the way out is the drop-off, from the pickup to the
     destination, and the way back is the pickup, from the destination to
     where the group was picked up, so the two lines tell the legs apart by
     more than their dates. Each says only when it departs, "Departs 9:00
     AM", because to the customer each leg is a departure. */
  function description(trip) {
    const leg = !trip.leg ? null : trip.leg === 'return' ? 'return' : 'outbound';
    const pickup = place(trip.pickup || '');
    const drop = String(trip.destination || '').trim();
    const [start, end] = leg === 'return' ? [drop, pickup] : [pickup, drop];
    const kind = (leg && LEG_TYPES[leg]) || TRIP_TYPES[trip.type] || 'trip';
    return [
      `${vehicle(trip.pax56)} ${kind}`,
      days(trip) || null,
      start && end ? `${start} to ${end}` : start ? `from ${start}` : end ? `to ${end}` : null,
      leg ? `Departs ${clock(trip.leave) || 'TBD'}`
        : !trip.leave && !trip.back ? 'Times TBD'
          : `${clock(trip.leave) || 'TBD'} – ${clock(trip.back) || 'TBD'}`,
    ].filter(Boolean).join('\n');
  }

  window.SchedulerQuoteText = { place, dates, days, clock, vehicle, description };
})();
