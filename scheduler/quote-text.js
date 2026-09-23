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

  /* State names as a quote abbreviates them: a stored address carries the name
     in full, "Texas 78504", because that is what the map service returned. */
  const STATES = Object.fromEntries('Alabama:AL,Alaska:AK,Arizona:AZ,Arkansas:AR,California:CA,Colorado:CO,Connecticut:CT,Delaware:DE,Florida:FL,Georgia:GA,Hawaii:HI,Idaho:ID,Illinois:IL,Indiana:IN,Iowa:IA,Kansas:KS,Kentucky:KY,Louisiana:LA,Maine:ME,Maryland:MD,Massachusetts:MA,Michigan:MI,Minnesota:MN,Mississippi:MS,Missouri:MO,Montana:MT,Nebraska:NE,Nevada:NV,New Hampshire:NH,New Jersey:NJ,New Mexico:NM,New York:NY,North Carolina:NC,North Dakota:ND,Ohio:OH,Oklahoma:OK,Oregon:OR,Pennsylvania:PA,Rhode Island:RI,South Carolina:SC,South Dakota:SD,Tennessee:TN,Texas:TX,Utah:UT,Vermont:VT,Virginia:VA,Washington:WA,West Virginia:WV,Wisconsin:WI,Wyoming:WY'
    .split(',').map(pair => pair.split(':')));

  /* Split rather than passed to `new Date()`, which reads a bare date as UTC
     midnight and names the day before west of Greenwich. */
  const parseDay = s => {
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  /* A place as a quote names it, "Edinburg, TX": the part before the one
     carrying the ZIP, and that part's state. An address shaped otherwise is
     carried across whole, because a quote reads better with too much address
     than with none. */
  function place(text) {
    const parts = String(text || '').split(',').map(part => part.trim()).filter(Boolean);
    const zipAt = parts.findIndex(part => /\s\d{5}(-\d{4})?$/.test(part));
    const state = zipAt > 0 ? STATES[parts[zipAt].replace(/\s+\d{5}(-\d{4})?$/, '')] : null;
    return state ? `${parts[zipAt - 1]}, ${state}` : parts.join(', ');
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

  /* The vehicle line. The seats are the assigned bus's, so before a bus is
     picked the line names the vehicle alone rather than guessing a size. */
  function vehicle(count, seats) {
    const buses = Math.max(count || 0, 1);
    const what = buses > 1 ? `${buses} buses` : 'Bus';
    return seats ? `${what} (${seats} passengers${buses > 1 ? ' each' : ''})` : what;
  }

  /* The block itself. A line the trip cannot answer yet is dropped, except the
     two times, which the office writes as TBD and settles with the customer.
     One leg of a drop-off and pickup trip (`oneLeg`) says only when it
     departs, because to the customer each leg is a departure. */
  function description(trip) {
    const from = trip.from || null;
    const pickup = place(trip.pickup || '');
    const drop = String(trip.destination || '').trim();
    return [
      `${vehicle(trip.buses, trip.seats)} ${TRIP_TYPES[trip.type] || 'trip'}`,
      [pickup ? `from ${pickup}` : null, drop ? `to ${drop}` : null].filter(Boolean).join(' '),
      from ? `on ${dates(from, trip.to || from)}` : null,
      `departing at ${clock(trip.leave) || 'TBD'}`,
      trip.oneLeg ? null : `arriving at ${clock(trip.back) || 'TBD'}`,
    ].filter(Boolean).join('\n');
  }

  window.SchedulerQuoteText = { place, dates, clock, vehicle, description };
})();
