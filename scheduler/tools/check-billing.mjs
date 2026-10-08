// Runs billing.js, where a trip's money stands, against sample trips and
// fails when a trip lands on the wrong rung or confirms when it should not.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../billing.js', import.meta.url), 'utf8'), { window });
const Billing = window.SchedulerBilling;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

// A quoted trip with nothing in, and what each thing that arrives makes it.
const quoted = { quoted_price: 1000, confirmed: false, contract_status: null, trip_payments: [], trip_pos: [] };
const stands = trip => { const b = Billing.of(trip); return [b.rung, Billing.confirmsTrip(b.rung), b.paid, b.remaining]; };
const pay = (...amounts) => amounts.map(amount => ({ amount, date: '2026-01-05' }));

expect('a quoted trip with nothing in is pending and not confirmed', stands(quoted), ['pending', false, 0, 1000]);

expect('a signed contract confirms it, with the whole price owed',
  stands({ ...quoted, contract_status: 'Signed' }), ['contract_signed', true, 0, 1000]);

expect('a deposit confirms it, and the rest is owed',
  stands({ ...quoted, trip_payments: pay(200) }), ['deposit_received', true, 200, 800]);

expect('a PO for the whole price confirms it',
  stands({ ...quoted, po_received: true, trip_pos: [{ amount: 1000 }] }), ['po_received', true, 0, 1000]);

expect('a PO for part of the price confirms as a PO does',
  stands({ ...quoted, po_received: true, trip_pos: [{ amount: 400 }] }), ['po_partial', true, 0, 1000]);

expect('payments that reach the price are paid in full, with nothing owed',
  stands({ ...quoted, trip_payments: pay(200, 800) }), ['paid_full', true, 1000, 0]);

expect('payments past the price are overpaid, and still confirm the trip',
  stands({ ...quoted, trip_payments: pay(1040) }), ['overpaid', true, 1040, 0]);

expect('a trip marked paid with no payment rows carries its whole price as paid',
  stands({ ...quoted, date_paid: '2026-01-05' }), ['paid_full', true, 1000, 0]);

expect('a confirmed trip from before the contract column counts as signed',
  stands({ ...quoted, confirmed: true }), ['contract_signed', true, 0, 1000]);

// An office that confirms on a PO alone: nothing else confirms, overpaid included.
Billing.setWorkflow({ confirmWhen: ['po_received'] });
expect('with only a PO confirming, a contract, a payment in full and an overpayment do not',
  [stands({ ...quoted, contract_status: 'Signed' })[1], stands({ ...quoted, trip_payments: pay(1000) })[1],
    stands({ ...quoted, trip_payments: pay(1040) })[1], stands({ ...quoted, po_received: true, trip_pos: [{ amount: 400 }] })[1]],
  [false, false, false, true]);

// A milestone the office has turned off counts as off.
Billing.setWorkflow({ workflow: { contractSigned: { active: false } } });
expect('a contract milestone that is off does not confirm a signed trip',
  stands({ ...quoted, contract_status: 'Signed' }), ['pending', false, 0, 1000]);

console.log(failed ? `\n  billing: ${failed} case(s) failed` : '\n  billing: every case passed');
process.exit(failed ? 1 : 0);
