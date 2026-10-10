// Runs quote-lines.js, the rule for a Billing line's cost, against sample
// lines and fails when a line stops following the calculator, or starts,
// where it should not.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../quote-lines.js', import.meta.url), 'utf8'), { window });
const { follows, costShown, costKept } = window.SchedulerQuoteLines;

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

console.log(failed ? `\n  ${failed} quote line case(s) failed` : '\n  quote lines: every case passed');
process.exit(failed ? 1 : 0);
