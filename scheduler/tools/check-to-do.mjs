// Runs to-do.js, the to-do list's computed rules, against sample trips and
// fails when a row appears or disappears, or the Prep list joins them, where it should not.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
for (const file of ['billing.js', 'follow-up.js', 'checklist.js', 'to-do.js']) {
  runInNewContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { window });
}
const { rows } = window.SchedulerToDo;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const ago = n => new Date(Date.now() - n * 864e5).toISOString();
const said = list => list.map(r => `${r.key} ${r.what}${r.detail ? ` [${r.detail}]` : ''}`);
// A Prep row: its day from today, its trip, its leg where it names one, and its gaps.

// A confirmed trip with nothing to ask: paid, its itinerary in, a bus on it and times in.
const bus = { leg: 'outbound', bus_id: 1 };
const good = {
  id: 'a', trip_type: 'round_trip', confirmed: true, quoted_price: 1000, date_paid: day(-1), created_at: ago(1),
  start_date: day(20), end_date: day(20), bus_count: 1, trip_assignments: [bus],
  trip_documents: [{ label: 'Itinerary' }], trip_stops: [{ arrive: '08:00' }], trip_updates: [],
};
const full = { busesNeeded: 1, busesAssigned: 1, busesShort: 0, seatsOpen: 0, seats: 1, unconfirmed: 0 };
const facts = { factsOf: () => full, contactOf: () => true };

expect('a trip waiting on nothing gives no row', said(rows([good], facts)), []);

expect('a quiet unconfirmed trip asks for a follow-up, with how long it has been quiet',
  said(rows([{ ...good, confirmed: false, created_at: ago(10) }], facts)),
  ['follow-up:a Trip unconfirmed [10d]']);

expect('a cancelled trip and a placeholder give no row',
  said(rows([{ ...good, confirmed: false, created_at: ago(10), cancelled_at: ago(1) },
    { ...good, confirmed: false, created_at: ago(10), trip_bar_color: 'amber', trip_assignments: [], trip_stops: [] }], facts)),
  []);

expect('a confirmed trip within 30 days with a leg short of a bus says so, and not past 30',
  said(rows([{ ...good, bus_count: 2 }, { ...good, id: 'b', bus_count: 2, start_date: day(31), end_date: day(31) }], facts)),
  ['short:a:outbound Short of buses [1 of 2]']);

expect('an unconfirmed trip short of a bus is not a Short row',
  said(rows([{ ...good, confirmed: false, trip_assignments: [] }], facts)), []);

expect('a split trip names the leg that is short',
  rows([{ ...good, trip_type: 'dropoff_pickup', return_start_date: day(22), return_bus_count: 1 }], facts)
    .map(r => [r.key, r.legName, r.day]),
  [['short:a:return', 'Pickup', day(22)]]);

expect('a confirmed trip within a week with no times says so, and not past a week',
  said(rows([{ ...good, start_date: day(7), end_date: day(7), trip_stops: [{ arrive: null }] },
    { ...good, id: 'b', start_date: day(8), end_date: day(8), trip_stops: [] }], facts)),
  ['times:a:outbound No times']);

expect('a split trip dropped off with times and picked up in two days with none names the pickup',
  rows([{ ...good, trip_type: 'dropoff_pickup', start_date: day(-5), end_date: day(-5), return_start_date: day(2),
    return_bus_count: 1, trip_assignments: [bus, { leg: 'return', bus_id: 1 }],
    trip_stops: [{ leg: 'outbound', arrive: '08:00' }, { leg: 'return', arrive: null }] }], facts)
    .map(r => [r.key, r.legName, r.day]),
  [['times:a:return', 'Pickup', day(2)]]);

const soon = { ...good, start_date: day(1), end_date: day(1) };
expect('a leg leaving tomorrow with a seat open and no contact says both, and nothing from Paperwork',
  said(rows([soon], { factsOf: () => ({ ...full, seatsOpen: 1, seats: 0 }), contactOf: () => false })),
  ['leaving:a:outbound Trip contact missing · 1 seat open']);

expect('a leg leaving in three days is not leaving soon',
  said(rows([{ ...good, start_date: day(3), end_date: day(3) }], { factsOf: () => ({ ...full, seatsOpen: 1 }), contactOf: () => false })),
  []);

const clash = ['Bus 897: On trip Austin', 'Rigo: Time off'];
expect('a leg within 30 days with something in its way is a Clash row, whatever its confirmation',
  said(rows([good, { ...good, id: 'b', confirmed: false, quoted_price: null, created_at: ago(0) }], { ...facts, factsOf: () => ({ ...full, clashes: clash }) }))
    .filter(r => r.startsWith('clash')),
  ['clash:a:outbound Bus 897: On trip Austin · Rigo: Time off', 'clash:b:outbound Bus 897: On trip Austin · Rigo: Time off']);
expect('a clash past 30 days, or on a placeholder, gives no row',
  said(rows([{ ...good, start_date: day(31), end_date: day(31) }, { ...good, id: 'p', trip_bar_color: 'amber' }],
    { ...facts, factsOf: () => ({ ...full, clashes: clash }) })), []);
expect('leaving soon leaves out a clash the Clash row already says',
  said(rows([soon], { factsOf: () => ({ ...full, clashes: clash }), contactOf: () => true })),
  ['clash:a:outbound Bus 897: On trip Austin · Rigo: Time off']);

expect('a driver who declined and a change to tell are each a row, and leaving soon leaves them out',
  said(rows([soon], { factsOf: () => ({ ...full, unconfirmed: 1, declined: [{ name: 'Ana' }], toTell: [{ name: 'Rigo', lines: ['Bus: 470 → 763'] }] }), contactOf: () => true }))
    .map(r => r.split(' ')[0]),
  ['declined:a:outbound', 'tell:a:outbound', 'leaving:a:outbound']);

expect('leaving soon leaves out what the follow-up and Short rows already say',
  said(rows([{ ...soon, confirmed: false, trip_assignments: [], trip_documents: [] },
    { ...soon, id: 'b', bus_count: 2 }],
  { factsOf: t => ({ ...full, busesNeeded: t.bus_count, busesAssigned: (t.trip_assignments || []).length, unconfirmed: 1 }), contactOf: () => true })),
  ['leaving:a:outbound Bus not assigned (0 of 1) · 1 driver not confirmed',
    'follow-up:a Trip unconfirmed · Itinerary missing [1d]',
    'short:b:outbound Short of buses [1 of 2]',
    'leaving:b:outbound 1 driver not confirmed']);

console.log(failed ? `\n  ${failed} to-do case(s) failed` : '\n  to-do: every case passed');
process.exit(failed ? 1 : 0);
