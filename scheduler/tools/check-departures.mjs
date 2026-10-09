// Runs departures.js, the Departures panel's rules, against sample trips and
// fails when a line appears, disappears or changes state where it should not.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
for (const file of ['billing.js', 'follow-up.js', 'checklist.js', 'requirements.js', 'leg-facts.js', 'to-do.js', 'departures.js']) {
  runInNewContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { window });
}
const { prepDays, legsOn, page, summary } = window.SchedulerDepartures;
const { statusKey } = window.SchedulerLegFacts;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const said = lines => lines.map(l => `${l.state} ${l.label}${l.value ? ` [${l.value}]` : ''}${l.action ? ` -> ${l.action}` : ''}`);

const done = { itinerary_printed: true, itinerary_printed_at: 't1', itinerary_printed_by: 'p1',
  envelope_printed: true, envelope_printed_at: 't2', envelope_printed_by: 'p1',
  trip_reminder_sent: true, trip_reminder_sent_at: 't3', trip_reminder_sent_by: 'p2' };
const seat = (id, driver, role, more = {}) => ({ id, driver_id: driver, role, ...more });
const bus = (id, busId, drivers, more = {}) => ({ id, leg: 'outbound', bus_id: busId, position: 0, active_roles: null, trip_drivers: drivers, ...more });
// A day trip tomorrow, confirmed and paid, its itinerary in, a contact named.
const trip = {
  id: 't', trip_type: 'round_trip', confirmed: true, po_ref: '0482', quoted_price: 1000, date_paid: day(-1),
  start_date: day(1), end_date: day(1), bus_count: 1, booking_contact_name: 'Dayna Mendez', trip_contact_1_name: 'Pat Lee',
  trip_documents: [{ label: 'Itinerary', created_at: '2026-10-05T10:00:00Z' }], trip_prep: { driver_info_sent: true, driver_info_sent_at: 't9', driver_info_sent_by: 'p1' },
  trip_assignments: [bus('a1', 1, [seat('s1', 'd1', 'driver', done)])],
};
const read = {
  busesById: new Map([[1, { id: 1, sleeper: true, ada_lift: false, capacity: 56 }], [2, { id: 2, sleeper: false }]]),
  driversById: new Map([['d1', { name: 'George', employment_type: 'full-time' }], ['d2', { name: 'Maria', employment_type: 'part-time' }]]),
  statuses: new Map([[statusKey('t', 'd1', 'outbound', 'driver'), { status: 'confirmed', acceptedAt: 'a1' }]]),
};

expect('a leg shows on the day it leaves and on no other',
  [legsOn([trip], day(1)).length, legsOn([trip], day(0)).length, legsOn([{ ...trip, cancelled_at: 'x' }, { ...trip, trip_bar_color: 'amber' }], day(1)).length],
  [1, 0, 0]);

const ready = page(trip, 'outbound', read);
expect('a ready trip: its own lines, all done',
  said(ready.lines),
  ['done Confirmed [PO 0482]', 'done Itinerary received', 'done Trip contact [Pat Lee]', 'done Driver info sent to Dayna']);
expect('and its one bus, its one driver, nothing left',
  [ready.buses.length, said(ready.buses[0].crew[0].lines), ready.left],
  [1, ['done Confirmed', 'done Itinerary', 'done Envelope', 'done Reminder'], 0]);
expect('a done step keeps when and whose', [ready.buses[0].crew[0].lines[3].at, ready.buses[0].crew[0].lines[3].by, ready.lines[3].at], ['t3', 'p2', 't9']);

const raw = page({ ...trip, confirmed: false, po_ref: null, date_paid: null, trip_documents: [], trip_contact_1_name: null, trip_prep: null,
  trip_assignments: [bus('a1', 1, [seat('s1', 'd1', 'driver')])] }, 'outbound', { ...read, statuses: new Map() });
expect('nothing done: problems warn, and the office\'s own steps say where they are done',
  [said(raw.lines), said(raw.buses[0].crew[0].lines), raw.left],
  [['warn Trip unconfirmed', 'warn Itinerary missing', 'warn Trip contact missing', 'todo Driver info sent to Dayna -> contacts'],
    ['warn Trip not sent', 'todo Itinerary -> forms:itinerary', 'todo Envelope -> forms:envelope', 'todo Reminder -> contacts'], 8]);

expect('a step still to do names the column it is kept in, and the hotel, booked on the trip, names none',
  [raw.lines.at(-1).mark, raw.buses[0].crew[0].lines.map(l => l.mark),
    page({ ...trip, need_hotel: true }, 'outbound', read).lines.find(l => l.key === 'hotel').mark],
  ['driver_info_sent', [null, 'itinerary_printed', 'envelope_printed', 'trip_reminder_sent'], null]);

expect('a confirmed trip that still owes says so, with the figure',
  said(page({ ...trip, date_paid: null, deposit_amount: 200 }, 'outbound', read).lines).filter(l => /Balance|PO\/payment/.test(l)),
  ['warn Balance due [$800]']);

expect('not needed leaves the contact out and keeps the itinerary, done',
  said(page({ ...trip, trip_documents: [], itinerary_not_needed: true, contact_not_needed: true, trip_contact_1_name: null }, 'outbound', read).lines),
  ['done Confirmed [PO 0482]', 'done Itinerary not needed', 'done Driver info sent to Dayna']);

expect('the hotel is a line only where the office books it',
  [said(page({ ...trip, trip_reqs: { hotel: true } }, 'outbound', read).lines).filter(l => /Hotel/.test(l)),
    said(page({ ...trip, need_hotel: true, hotel_booked_outbound: true, hotel_itinerary_number_outbound: 'H77' }, 'outbound', read).lines).filter(l => /Hotel/.test(l))],
  [['todo Hotel booked -> billing'], ['done Hotel booked [H77]']]);

const two = page({ ...trip, bus_count: 3, trip_reqs: { sleeper: true }, trip_assignments: [
  bus('a1', 1, [seat('s1', 'd1', 'driver', done), seat('s2', 'd2', 'co-driver', { itinerary_printed: true })], { needs: { sleeper: true }, active_roles: ['driver', 'co-driver'] }),
  bus('a2', 2, [], { position: 1, needs: { sleeper: true } }),
] }, 'outbound', read);
expect('a part-time co-driver has an HOS form line, and a bus says what it needs',
  [two.buses[0].needs.map(n => `${n.label}:${n.met}`), two.buses[0].crew[1].partTime, said(two.buses[0].crew[1].lines)],
  [['Sleeper:true'], true, ['warn Trip not sent', 'done Itinerary', 'todo Envelope -> forms:envelope', 'todo Reminder -> contacts', 'todo HOS form -> forms:hos']]);
expect('a bus that lacks a need and has no driver says both, and a bus the leg has no row for is counted',
  [two.buses[1].needs.map(n => `${n.label}:${n.met}`), said(two.buses[1].crew[0].lines), two.buses[1].left, two.missing, two.left],
  [['Sleeper:false'], ['warn Driver needed'], 2, 1, 4 + 2 + 1]);

const card = page({ ...trip, bus_count: 2, need_fuel_card: true, trip_assignments: [
  bus('a1', 1, [seat('s1', 'd1', 'driver', done)], { fuel_card_number: '4417' }),
  bus('a2', 2, [seat('s2', 'd2', 'driver', done)], { position: 1 }),
] }, 'outbound', read);
expect('a trip with a fuel card asks one of every bus, by its number',
  [card.buses.map(b => b.needs.filter(n => n.id === 'fuelCard').map(n => `${n.label}:${n.met}`)[0]), card.buses.map(b => b.left)],
  [['Fuel card 4417:true', 'Fuel card:false'], [0, 3]]);

const split = { ...trip, trip_type: 'dropoff_pickup', return_start_date: day(3), return_bus_count: 1,
  trip_assignments: [bus('a1', 1, [seat('s1', 'd1', 'driver', done)]), bus('a3', 1, [seat('s3', 'd1', 'driver')], { leg: 'return' })] };
const back = page(split, 'return', read);
expect('a split trip\'s later leg is its own page on its own day, with the trip\'s lines already done',
  [legsOn([split], day(1)).map(l => l.leg), legsOn([split], day(3)).map(l => l.leg), back.legName, said(back.lines).at(-1), said(back.buses[0].crew[0].lines).slice(1)],
  [['outbound'], ['return'], 'Pickup', 'done Driver info sent to Dayna', ['todo Itinerary -> forms:itinerary', 'todo Envelope -> forms:envelope', 'todo Reminder -> contacts']]);

expect('a working day preps for tomorrow, and a Friday, a Saturday and a Sunday for every day until the office is open again',
  [prepDays('2026-10-07'), prepDays('2026-10-09'), prepDays('2026-10-10'), prepDays('2026-10-11'), prepDays('2026-10-30')],
  [['2026-10-08'], ['2026-10-10', '2026-10-11', '2026-10-12'], ['2026-10-11', '2026-10-12'], ['2026-10-12'], ['2026-10-31', '2026-11-01', '2026-11-02']]);

expect('the summary counts the day\'s legs and the ready ones',
  summary([trip, { ...trip, id: 'u', confirmed: false }], day(1), read), { legs: 2, ready: 1 });

console.log(failed ? `\n  ${failed} departures case(s) failed` : '\n  departures: every case passed');
process.exit(failed ? 1 : 0);
