// Runs samsara-fuel's handler, the nightly working out of each bus's miles
// per gallon and tank gallons, against invented fuel percents and burns: the
// stretches a fill-up ends, the tank from them and the median that stands,
// no tank under three stretches, the miles per gallon, what is saved, and
// what a caller without the night key is told. The handler is TypeScript
// with no imports; its types are taken off and the rest is run as a module.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

process.removeAllListeners('warning');

const source = readFileSync(new URL('../samsara-fuel/handler.ts', import.meta.url), 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'check-samsara-fuel-'));
const file = join(scratch, 'handler.mjs');
writeFileSync(file, stripTypeScriptTypes(source));
const { handle, mpgOf, night, stretchesOf, tankOf } = await import(pathToFileURL(file).href);
rmSync(scratch, { recursive: true, force: true });

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const GAL = 3785.411784;
const MILE = 1609.344;
const at = h => new Date(Date.UTC(2026, 7, 9) + h * 36e5).toISOString();
const run = (start, values) => values.map((value, i) => ({ time: at(start + i), value }));

expect('a stretch runs while the percent falls, a rise of 3 points ends it, and one under 20 points is passed over',
  stretchesOf([...run(0, [90, 80, 70, 60]), ...run(4, [95, 90, 85]), ...run(7, [100, 70, 71, 40])]),
  [{ from: at(0), to: at(3), fell: 30 }, { from: at(7), to: at(10), fell: 60 }]);
expect('points are read in time order whatever order they come in',
  stretchesOf(run(0, [80, 70, 60, 50]).reverse()), [{ from: at(0), to: at(3), fell: 30 }]);

// Bus 218's four stretches from Samsara, 90 days to 2026-11-02, against the 222 gallons of Prevost's H3-45 sheet.
expect('the tank is the median of what each stretch burned over the share it fell',
  tankOf([{ fell: 44, gallons: 85.1 }, { fell: 45, gallons: 99.3 }, { fell: 32, gallons: 95.3 }, { fell: 39, gallons: 75.4 }]),
  { tank: 207, count: 4 });
expect('under three stretches with a burn there is no tank',
  tankOf([{ fell: 44, gallons: 85.1 }, { fell: 45, gallons: null }, { fell: 32, gallons: 95.3 }]), { tank: null, count: 2 });
expect('miles per gallon are the miles over the gallons, and nothing burned gives none',
  [mpgOf({ fuelConsumedMl: 1804 * GAL, distanceTraveledMeters: 11354 * MILE }), mpgOf({ fuelConsumedMl: 0, distanceTraveledMeters: 5000 }), mpgOf(null)],
  [6.29, null, null]);

const NOW = Date.UTC(2026, 10, 2, 12);
const deps = (saved = []) => ({
  keyed: true,
  now: () => NOW,
  buses: async () => [{ id: 'b1', number: '218' }, { id: 'b2', number: '897' }, { id: 'b3', number: '999' }],
  vehicles: async () => [{ id: 'v1', name: '218 ' }, { id: 'v2', name: '897' }],
  fuel: async ids => new Map([['v1', [...run(0, [90, 46]), ...run(2, [95, 50]), ...run(4, [96, 64]), ...run(6, [97, 58])]], ['v2', run(0, [80, 50])]].filter(([k]) => ids.includes(k))),
  burn: async (id, from, to) => {
    if (from === new Date(NOW - 90 * 864e5).toISOString()) return { fuelConsumedMl: 600 * GAL, distanceTraveledMeters: 3600 * MILE };
    const gal = { [at(0)]: 85.1, [at(2)]: 99.3, [at(4)]: 95.3, [at(6)]: 75.4 }[from];
    return id === 'v1' && gal ? { fuelConsumedMl: gal * GAL, distanceTraveledMeters: 1 } : null;
  },
  save: async rows => { saved.push(...rows); },
});
const saved = [];
const done = await night(deps(saved), true);
expect('each bus Samsara knows by name gets its miles per gallon, and a tank where three stretches burned',
  done.profiles.map(p => [p.bus_id, p.mpg, p.tank_gallons, p.stretches]), [['b1', 6, 207, 4], ['b2', 6, null, 0]]);
expect('a bus Samsara has no vehicle for is named, not guessed', done.unmatched, ['999']);
expect('the profiles are saved, stamped with when they were worked out',
  saved.map(p => [p.bus_id, p.worked_out_at]), [['b1', new Date(NOW).toISOString()], ['b2', new Date(NOW).toISOString()]]);
const dry = [];
await night(deps(dry), false);
expect('a dry run saves nothing', dry.length, 0);

const req = (headers = {}, method = 'POST') => new Request('https://x/functions/v1/samsara-fuel', { method, headers, body: method === 'POST' ? '{}' : undefined });
expect('without the night key, or with the wrong one, nothing runs',
  [(await handle(req(), deps(), 'k')).status, (await handle(req({ 'x-night-key': 'no' }), deps(), 'k')).status, (await handle(req({ 'x-night-key': 'k' }), deps(), '')).status],
  [401, 401, 401]);
expect('only a POST runs it, and a Samsara failure answers 502',
  [(await handle(req({}, 'GET'), deps(), 'k')).status, (await handle(req({ 'x-night-key': 'k' }), { ...deps(), vehicles: async () => { throw new Error('x'); } }, 'k')).status],
  [405, 502]);

console.log(failed ? `\n  samsara-fuel: ${failed} case(s) failed` : '\n  samsara-fuel: every case passed');
process.exit(failed ? 1 : 0);
