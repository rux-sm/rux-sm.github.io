// Runs quote.js, the quote calculator's formulas, on invented rates and
// fails when a price stops following a rule written in
// scheduler/docs/quote-calculator.md. The office's own rates are in the
// database and never here; these are made up, chosen so that rounding each
// part and rounding the sum give different answers.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
// quote.js draws two pages as well. Only its formulas are run here; the page it would draw is never asked for.
const page = new Proxy(function () {}, { get: (_, k) => (k === Symbol.toPrimitive ? () => '' : page), apply: () => page, construct: () => page });
try {
  runInNewContext(readFileSync(new URL('../quote.js', import.meta.url), 'utf8'),
    { window, document: page, location: { search: '', pathname: '' }, localStorage: page, sessionStorage: page, URLSearchParams, Intl, console });
} catch { /* the page's own start, which has no page here */ }
if (!window.Rux?.quote) { console.log('  FAIL  quote.js no longer gives Rux.quote'); process.exit(1); }
const { tripQuote, driverPay, up5 } = window.Rux.quote;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

// Invented rates. The rules, the miles a band or a free day starts at, are the file's own.
const r = {
  trip_local_daily: 501, trip_extra_day: 203, trip_dead_miles: 1.11,
  driver_local_daily: 101, driver_short_first_day: 152, driver_extra_day: 103,
  driver_per_mile: 0.31, driver_per_mile_1k_one: 0.77, driver_per_mile_1k_two: 0.27,
  driver_meal_daily: 31, driver_relief_flat: 222,
};
const RATE = 2.13;

// ── Rounding ────────────────────────────────────────────────────────────────
expect('a part rounds up to the next $5, and one a hair over a multiple of 5 stays on it',
  [up5(0.01), up5(5), up5(5.004), up5(5.01), up5(0)], [5, 5, 5, 10, 0]);

// 750 miles over two days, 100 of them dead: the regular miles, the dead miles and the half extra day, each on its own.
const long = tripQuote({ miles: [400, 350], rate: RATE, dead: 100 }, r);
expect('the regular miles, the dead miles and the extra days each round on their own',
  [long.local, long.extra, long.amount], [false, 0.5, 1385 + 115 + 105]);
expect('which is not the sum rounded once', long.amount === up5(RATE * 650 + 100 * r.trip_dead_miles + r.trip_extra_day * 0.5), false);

expect('a local trip is the daily rate for its days, rounded up',
  [tripQuote({ miles: [100, 50], rate: RATE, dead: 0 }, r).local, tripQuote({ miles: [100, 50], rate: RATE, dead: 0 }, r).amount], [true, 1005]);

const short = driverPay({ driver1: [150, 100], driver2: [0, 0], drivers: 2 }, r);
expect('each part of the second driver\'s pay rounds on its own, and so do the meals',
  [short.band, short.amount, short.meal], [2, 155 + 105, 65]);

const cents = [];
for (let miles = 40; miles <= 3000; miles += 37) {
  for (const days of [1, 2, 3]) {
    const each = Array.from({ length: days }, (_, i) => Math.floor(miles / days) + (i ? 0 : miles % days));
    const trip = tripQuote({ miles: each, rate: RATE, dead: Math.min(60, miles) }, r).amount;
    const pay = driverPay({ driver1: each, driver2: each.map(() => 0), drivers: 2 }, r);
    for (const n of [trip, pay.amount, pay.meal]) if (n !== null && n % 5 !== 0) cents.push([miles, days, n]);
  }
}
expect('no charge it works out has cents, at any miles or days tried', cents, []);

// ── Drivers and dead miles ──────────────────────────────────────────────────
const together = driverPay({ driver1: [400, 350], driver2: [0, 0], drivers: 2 }, r);
const split = driverPay({ driver1: [300, 100], driver2: [100, 250], drivers: 2 }, r);
expect('the second driver\'s pay is worked out on both drivers\' miles together, however they are split',
  [together.total, together.amount, split.total, split.amount], [750, 235 + 105, 750, 235 + 105]);

const noDead = tripQuote({ miles: [400, 350], rate: RATE, dead: 0 }, r);
expect('dead miles lower the mileage charge, and nothing else in the trip\'s price',
  [noDead.amount, noDead.amount - long.amount], [1600 + 105, 1600 - (1385 + 115)]);
expect('and the driver is paid for every mile, dead ones among them', together.total, 750);

const over = tripQuote({ miles: [300], rate: RATE, dead: 400 }, r);
expect('more dead miles than the trip has are still counted, the mileage charge below zero', over.amount, -210 + 445);

const far = driverPay({ driver1: [600, 600], driver2: [0, 0], drivers: 2 }, r);
const farOther = driverPay({ driver1: [600, 600], driver2: [0, 0], drivers: 2 }, { ...r, driver_per_mile_1k_one: 99 });
expect('the fourth band\'s one-driver rate is not used in a second driver\'s pay',
  [far.band, far.amount, farOther.amount], [4, 325, 325]);

console.log(failed ? `\n  ${failed} quote case(s) failed` : '\n  quote: every case passed');
process.exit(failed ? 1 : 0);
