// Runs past-midnight.js, the one rule for the day a leg's undated times fall
// on, against sample runs of times, and fails when a day moves.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../past-midnight.js', import.meta.url), 'utf8'), { window });
const { minutesOf, after, daysPast, forward } = window.SchedulerPastMidnight;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

expect('a time is read from its clock, or from minutes',
  [minutesOf('06:30'), minutesOf('6:05:00'), minutesOf(90), minutesOf(''), minutesOf(null), minutesOf('TBD')], [390, 365, 90, null, null, null]);
expect('a day out and back in daylight passes no midnight',
  daysPast(['05:15', '06:00', '06:30', '12:00', '18:30', '19:15']), [0, 0, 0, 0, 0, 0]);
expect('a time earlier than the one before it is the next day\'s, and so is every time after it',
  daysPast(['14:10', '15:00', '22:00', '00:30', '01:15']), [0, 0, 0, 1, 1]);
expect('an empty time takes the count so far and is compared with nothing',
  daysPast(['20:00', null, '', '02:00', null, '03:00']), [0, 0, 0, 1, 1, 1]);
expect('two midnights are counted as two',
  daysPast(['20:00', '04:00', '22:00', '03:00']), [0, 1, 1, 2]);
expect('a time equal to the one before it is the same day', daysPast(['10:00', '10:00']), [0, 0]);
expect('after says whether a time is past a midnight after another',
  [after('22:00', '01:00'), after('01:00', '22:00'), after('10:00', '10:00'), after(null, '01:00'), after('22:00', null)],
  [true, false, false, false, false]);
expect('forward moves a value on by days until it is not before the one before it',
  forward([1200, 30, 1500, null, 100, 50]), [1200, 1470, 1500, null, 1540, 2930]);
expect('forward keeps a value already after the one before it', forward([300, 900, 2000]), [300, 900, 2000]);

console.log(failed ? `\n  ${failed} past midnight case(s) failed` : '\n  past midnight: every case passed');
process.exit(failed ? 1 : 0);
