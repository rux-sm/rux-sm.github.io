// Runs follow-up.js, which trips wait on the customer, against invented
// trips: the chase window on a quote not answered yet, a balance after a trip
// has left and the PO that covers it, and when the customer was last told.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
for (const file of ['billing.js', 'follow-up.js']) {
  runInNewContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { window });
}
const { waitsOf, quietSince, asks, set } = window.SchedulerFollowUp;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Days from the office's today, as the rules count them, whatever clock the check runs on.
const day = n => { const [y, m, d] = window.SchedulerFollowUp.today().split('-').map(Number); return iso(new Date(y, m - 1, d + n)); };
const ago = n => new Date(Date.now() - n * 864e5).toISOString();

// A quote out and not answered, its itinerary in.
const quote = { id: 'q', confirmed: false, quoted_price: 1000, created_at: ago(20), trip_documents: [{ label: 'Itinerary' }], trip_updates: [] };
set(null);
expect('a quote is chased once its trip is 60 days out, not before',
  [waitsOf({ ...quote, start_date: day(60) }), waitsOf({ ...quote, start_date: day(61) })], [['confirmation'], []]);
expect('outside the window an unanswered quote waits on nothing, its itinerary included',
  waitsOf({ ...quote, start_date: day(90), trip_documents: [] }), []);
expect('a quote with no date is always chased', waitsOf(quote), ['confirmation']);
set({ wait_days: 3, chase_days: 90 });
expect('the office\'s window moves it', waitsOf({ ...quote, start_date: day(90) }), ['confirmation']);
set(null);

// A confirmed trip that has left.
const ran = { id: 'r', confirmed: true, quoted_price: 1000, start_date: day(-3), end_date: day(-2), created_at: ago(40), trip_updates: [] };
expect('after it has left, a confirmed trip with money owed asks for it',
  [waitsOf(ran), waitsOf({ ...ran, trip_payments: [{ amount: 400 }] })], [['balance'], ['balance']]);
expect('a PO covers what is owed, however much of it',
  [waitsOf({ ...ran, po_ref: 'PO-7' }), waitsOf({ ...ran, po_received: true, trip_pos: [{ amount: 100 }] })], [[], []]);
expect('paid in full, unconfirmed or with no price, nothing is owed',
  [waitsOf({ ...ran, trip_payments: [{ amount: 1000 }] }), waitsOf({ ...ran, confirmed: false }), waitsOf({ ...ran, quoted_price: 0 })], [[], [], []]);
expect('before it leaves, a balance waits for the two weeks before, and only once something is paid',
  [waitsOf({ ...ran, start_date: day(10), po_ref: 'PO-7', trip_pos: [{ amount: 100 }], trip_documents: [{ label: 'Itinerary' }] }),
    waitsOf({ ...ran, start_date: day(20), trip_payments: [{ amount: 400 }], trip_documents: [{ label: 'Itinerary' }] })],
  [['balance'], []]);

// A placeholder, and an amber trip past one.
expect('a placeholder waits on nothing; the same amber with a quote marked sent is chased',
  [waitsOf({ ...quote, trip_bar_color: 'amber' }), waitsOf({ ...quote, trip_bar_color: 'amber', quote_sent_on: day(-1) })], [[], ['confirmation']]);

// When the customer was last told.
expect('with nothing said, the booking', quietSince(quote), quote.created_at);
expect('a quote marked sent after the last update is when they were last told, at noon that day',
  quietSince({ ...quote, quote_sent_on: day(-2), trip_updates: [{ created_at: ago(5), kind: 'note' }] }),
  new Date(`${day(-2)}T12:00:00`).toISOString());
const said = ago(1);
expect('an update after the quote was sent is', quietSince({ ...quote, quote_sent_on: day(-9), trip_updates: [{ created_at: said, kind: 'note' }] }), said);
expect('a quote sent yesterday waits out the three days; one sent a week ago asks',
  [asks({ ...quote, quote_sent_on: day(-1) }), asks({ ...quote, quote_sent_on: day(-7) })], [false, true]);

console.log(failed ? `\n  ${failed} follow-up case(s) failed` : '\n  follow-up: every case passed');
process.exit(failed ? 1 : 0);
