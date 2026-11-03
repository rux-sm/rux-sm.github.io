// Runs samsara-fuel's handler, the nightly working out of each bus's miles
// per gallon, against invented burns: the miles per gallon, a bus Samsara
// has no vehicle for, what is saved, a dry run, and what a caller without
// the night key is told. The handler is TypeScript with no imports; its
// types are taken off and the rest is run as a module.
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
const { handle, mpgOf, night } = await import(pathToFileURL(file).href);
rmSync(scratch, { recursive: true, force: true });

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const GAL = 3785.411784;
const MILE = 1609.344;

// Bus 218's 90 days from Samsara to 2026-11-02: 1,804 gallons over 11,354 miles.
expect('miles per gallon are the miles over the gallons, and nothing burned gives none',
  [mpgOf({ fuelConsumedMl: 1804 * GAL, distanceTraveledMeters: 11354 * MILE }), mpgOf({ fuelConsumedMl: 0, distanceTraveledMeters: 5000 }), mpgOf(null)],
  [6.29, null, null]);

const NOW = Date.UTC(2026, 10, 2, 12);
const deps = (saved = [], seen = []) => ({
  keyed: true,
  now: () => NOW,
  buses: async () => [{ id: 'b1', number: '218' }, { id: 'b2', number: '897' }, { id: 'b3', number: '999' }],
  vehicles: async () => [{ id: 'v1', name: '218 ' }, { id: 'v2', name: '897' }],
  burn: async (id, from, to) => { seen.push([id, from, to]); return id === 'v1' ? { fuelConsumedMl: 600 * GAL, distanceTraveledMeters: 3600 * MILE } : null; },
  save: async rows => { saved.push(...rows); },
});
const saved = [], seen = [];
const done = await night(deps(saved, seen), true);
expect('each bus Samsara knows by name gets its miles per gallon, none where Samsara reports no burn',
  done.profiles.map(p => [p.bus_id, p.mpg]), [['b1', 6], ['b2', null]]);
expect('the burn is read across the last 90 days',
  seen[0].slice(1), [new Date(NOW - 90 * 864e5).toISOString(), new Date(NOW).toISOString()]);
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
