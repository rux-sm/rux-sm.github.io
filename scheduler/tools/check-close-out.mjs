// Runs close-out.js, what a trip that is back still asks, against sample
// trips: when a trip counts as back on the office's clock, which trips ask
// nothing, and each thing a record can lack. The scripts it needs are loaded
// beside it as a page loads them.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
const context = { window, Intl, Date, Math, Number, String, Map, Set, Array, JSON };
for (const file of ['requirements.js', 'leg-facts.js', 'billing.js', 'week.js', 'close-out.js']) {
  runInNewContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
}
const { FROM, isBack, asks, backAt } = window.SchedulerCloseOut;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const at = s => Date.parse(s);
const stops = (depart, back) => [
  { leg: 'outbound', type: 'pickup', position: 0, depart_prev: depart },
  { leg: 'outbound', type: 'stop', position: 1, depart_prev: '08:00' },
  { leg: 'outbound', type: 'return', position: 2, depart_prev: '17:00', arrive: back },
];
const seat = { leg: 'outbound', bus_id: 'b1', active_roles: ['driver'], trip_drivers: [{ driver_id: 'd1', role: 'driver' }] };
// A day trip on Tuesday 20 October 2026, back at the yard at 6 PM, with its
// record whole: a bus, a driver, actual miles, an invoice and paid.
const done = {
  id: 't1', start_date: '2026-10-20', end_date: '2026-10-20', bus_count: 1,
  trip_stops: stops('06:00', '18:00'), trip_assignments: [seat],
  actual_miles: 212, invoice_number: '15800', quoted_price: 1000, trip_payments: [{ amount: 1000, date: '2026-10-21' }],
};

// ── when a trip is back ─────────────────────────────────────────────────────
expect('back at its yard return, read as McAllen time', new Date(backAt(done)).toISOString(), '2026-10-20T23:00:00.000Z');
expect('not back a minute before, back a minute after',
  [isBack(done, at('2026-10-20T22:59:00Z')), isBack(done, at('2026-10-20T23:01:00Z'))], [false, true]);
const late = { ...done, trip_stops: stops('18:00', '01:30') };
expect('a return past midnight is back the next morning', new Date(backAt(late)).toISOString(), '2026-10-21T06:30:00.000Z');
const untimed = { ...done, trip_stops: [] };
expect('a leg with no times is back at the late-return hour after its last day',
  new Date(backAt(untimed)).toISOString(), '2026-10-21T09:00:00.000Z');
expect('a cancelled trip is never back', isBack({ ...done, cancelled_at: '2026-10-19T00:00:00Z' }, at('2026-11-01T00:00:00Z')), false);

// ── what it asks ────────────────────────────────────────────────────────────
const after = at('2026-10-22T12:00:00Z');
expect('a whole record asks nothing', asks(done, after), []);
expect('a trip not back yet asks nothing', asks({ ...done, actual_miles: null }, at('2026-10-20T20:00:00Z')), []);
expect('a trip that ended before close-out began asks nothing',
  asks({ ...done, start_date: '2026-10-01', end_date: '2026-10-01', actual_miles: null }, after), []);
expect('close-out begins on its own day', FROM, '2026-10-15');
expect('a placeholder asks nothing', asks({ ...done, trip_bar_color: 'amber', actual_miles: null }, after), []);
expect('a leg short of a bus', asks({ ...done, bus_count: 2 }, after), ['bus']);
expect('a seat with no driver', asks({ ...done, trip_assignments: [{ ...seat, trip_drivers: [] }] }, after), ['driver']);
expect('a co-driver turned on and not filled',
  asks({ ...done, trip_assignments: [{ ...seat, active_roles: ['driver', 'co-driver'] }] }, after), ['driver']);
expect('no actual miles', asks({ ...done, actual_miles: null }, after), ['miles']);
expect('no invoice', asks({ ...done, invoice_number: null }, after), ['invoice']);
expect('a balance still owed', asks({ ...done, trip_payments: [{ amount: 400, date: '2026-10-21' }] }, after), ['balance']);
expect('a balance a PO covers is not asked for', asks({ ...done, po_ref: 'PO-1', trip_payments: [{ amount: 400, date: '2026-10-21' }] }, after), []);
expect('everything at once, in the card\'s order',
  asks({ ...done, bus_count: 2, trip_assignments: [{ ...seat, trip_drivers: [] }], actual_miles: null, invoice_number: null, trip_payments: [] }, after),
  ['bus', 'driver', 'miles', 'invoice', 'balance']);
expect('a leg with no bus at all asks for the bus, which has no seat yet',
  asks({ ...done, trip_assignments: [] }, after), ['bus']);
window.SchedulerBilling.setWorkflow({ workflow: { invoiced: { active: false } } });
expect('an office that does not invoice is not asked for one', asks({ ...done, invoice_number: null }, after), []);

console.log(failed ? `\n  ${failed} fault(s) in close-out` : '');
process.exit(failed ? 1 : 0);
