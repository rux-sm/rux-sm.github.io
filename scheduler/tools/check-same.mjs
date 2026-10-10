// Runs the two rules that say two records are the same one, the phone
// digits in phone.js and the address key in places.js, against sample
// spellings, and fails when one way of typing a number or an address stops
// matching another.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
// places.js draws with the page too; only its rule is run here, and the page it would draw on is never asked for.
const document = new Proxy({}, { get: () => () => ({}) });
for (const file of ['phone.js', 'places.js']) {
  runInNewContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { window, document });
}
const { digits } = window.SchedulerPhone;
const { addressKey } = window.SchedulerPlaces;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

expect('a number is its digits, however it is typed',
  ['(956) 555-0142', '956.555.0142', '956 555 0142'].map(digits), ['9565550142', '9565550142', '9565550142']);
expect('a US number\'s leading 1 is dropped, with a plus or without',
  ['+1 (956) 555-0142', '1-956-555-0142'].map(digits), ['9565550142', '9565550142']);
expect('a 1 that is not a country code stays, and no number is no digits',
  [digits('155-0142'), digits(''), digits(null)], ['1550142', '', '']);

const same = (a, b) => addressKey(a) === addressKey(b);
expect('a road and a compass point match in full or in short',
  same('150 North Ohio Avenue, Mercedes, TX 78570', '150 N Ohio Ave, Mercedes, TX 78570'), true);
expect('the state\'s name, the country and a ZIP\'s last four make no second place',
  same('1200 W Sample Dr, Edinburg, Texas 78539-2909, United States', '1200 W Sample Dr, Edinburg, TX 78539'), true);
expect('punctuation and capitals do not count', same('100 MAIN ST., SUITE #4', '100 Main St Ste 4'), true);
expect('another street number is another place', same('150 N Ohio Ave', '160 N Ohio Ave'), false);

console.log(failed ? `\n  ${failed} same-record case(s) failed` : '\n  same record: every case passed');
process.exit(failed ? 1 : 0);
