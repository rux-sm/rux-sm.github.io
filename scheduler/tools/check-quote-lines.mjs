// Runs quote-lines.js, the rule for a Billing line's cost, against sample
// lines and fails when a line stops following the calculator, or starts,
// where it should not, or when the calculator's figure for a line, which
// Billing and the Detailed itinerary both print, is asked for on other
// miles, days, dead miles or rate than the line's.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../quote-lines.js', import.meta.url), 'utf8'), { window });
const { follows, costShown, costKept, milesADay, calculated } = window.SchedulerQuoteLines;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}
// A line through its window and back with nothing typed: what Cost opened on is what Done reads.
const through = line => ({ ...line, ...costKept(line.kind, costShown(line, line.cost)) });

const rental = { kind: 'rental', cost: 1840, cost_typed: false };
expect('a rental the calculator priced opens with Cost empty', costShown(rental, rental.cost), null);
expect('and still follows the calculator after its window is opened and closed',
  [through(rental).cost, through(rental).cost_typed, follows(through(rental))], [null, false, true]);

expect('a second driver and a relief driver follow it too',
  ['second_driver', 'relief'].map(kind => follows(through({ kind, cost: 300, cost_typed: false }))), [true, true]);

const typed = { kind: 'rental', cost: 2000, cost_typed: true };
expect('a rental with a typed cost opens on it and keeps it',
  [costShown(typed, typed.cost), through(typed).cost, follows(through(typed))], [2000, 2000, false]);

expect('a figure typed in Cost makes a typed price', costKept('rental', 1900), { cost: 1900, cost_typed: true });

const other = { kind: 'other', cost: 75, cost_typed: false };
expect('a line the calculator does not price opens on the cost it was given',
  [costShown(other, other.cost), through(other).cost], [75, 75]);

const discount = { kind: 'discount', cost: -150, cost_typed: true };
expect('a discount opens as the amount off and is kept as a negative cost',
  [costShown(discount, discount.cost), through(discount).cost], [150, -150]);

expect('a line with no cost opens empty and keeps none', [costShown({ kind: 'other', cost: null }, null), costKept('other', null)],
  [null, { cost: null, cost_typed: false }]);

expect('a leg\'s miles a day are the Route Summary\'s rows, rounded, where any has miles',
  milesADay([120.4, 0, 310.6], 431, 3), [120, 0, 311]);
expect('or else the whole miles spread over the days, the odd miles on the first',
  [milesADay([0], 709, 1), milesADay(null, 100, 3), milesADay(null, 0, 2)], [[709], [34, 33, 33], null]);

// A stand-in for quote.js's formulas, which check-quote.mjs proves; it hands back what it was asked.
const asked = [];
const q = {
  tripQuote: (a, r) => (asked.push(['trip', a]), { amount: 1000.004 + r.base }),
  driverPay: (a, r) => (asked.push(['driver', a]), { amount: 250 + r.base }),
};
const named = { base: 5, driver_relief_flat: 400 };
const basis = { perDay: [300, 100], days: 2, dead: 18, rate: 3.1 };
expect('a rental is the trip formula on the leg\'s miles a day, its rate and its dead miles, to the cent',
  [calculated('rental', basis, named, q), asked.pop()], [1005, ['trip', { miles: [300, 100], rate: 3.1, dead: 18 }]]);
expect('a second driver is the driver formula with the miles split between two drivers',
  [calculated('second_driver', basis, named, q), asked.pop()],
  [255, ['driver', { driver1: [150, 50], driver2: [150, 50], drivers: 2 }]]);
expect('a relief driver is the flat charge, whatever the trip',
  calculated('relief', { perDay: null, days: null }, named, q), 400);
expect('nothing is worked out with no miles, no days, no rate, no rates or another kind of line',
  [calculated('rental', { ...basis, perDay: null }, named, q), calculated('rental', { ...basis, days: null }, named, q),
    calculated('rental', { ...basis, rate: null }, named, q), calculated('rental', basis, null, q),
    calculated('hotel', basis, named, q), asked.length], [null, null, null, null, null, 0]);

console.log(failed ? `\n  ${failed} quote line case(s) failed` : '\n  quote lines: every case passed');
process.exit(failed ? 1 : 0);
