// Runs samsara-share's handler, the door the customer's tracking page knocks
// on, against an invented trip: what a link says before, during, between and
// after its legs, which bus gets a link and how long it lasts, that a second
// visit gets the same link and a swapped bus a new one, and what a key that
// may not make one is told. The handler is TypeScript with no imports; its
// types are taken off and the rest is run as a module.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from './build-samsara-share.mjs';

// Taking the types off is new enough in Node to warn each time it is used.
process.removeAllListeners('warning');

const source = readFileSync(new URL('../samsara-share/handler.ts', import.meta.url), 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'check-samsara-share-'));
const file = join(scratch, 'handler.mjs');
writeFileSync(file, stripTypeScriptTypes(source));
const { handle, MAX_MS, AFTER_MS, END_MS } = await import(pathToFileURL(file).href);
rmSync(scratch, { recursive: true, force: true });

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

console.log('\n  samsara-share');
// ── the borrowed file is samsara-miles's handler as it is ───────────────────
for (const [name, text] of Object.entries(build())) {
  let now = '';
  try { now = readFileSync(new URL(`../samsara-share/${name}`, import.meta.url), 'utf8'); } catch { /* stale */ }
  expect(`${name} is built from the file as it is (npm run build)`, now === text, true);
}

const NOW = Date.parse('2026-11-07T20:00:00Z');
const H = 3600_000;
const at = h => new Date(NOW + h * H).toISOString();
const TOKEN = 'a'.repeat(32);
const BUSES = [{ id: 'b1', number: '218' }, { id: 'b2', number: '999' }, { id: 'b3', number: '47' }];
// A drop-off out now, back in five hours, and its pickup two days on.
const trip = (over = {}) => ({ id: 't1', cancelled: false,
  legs: [{ id: 'l1', start: NOW - H, end: NOW + 5 * H, buses: ['b1'] }, { id: 'l2', start: NOW + 48 * H, end: NOW + 54 * H, buses: ['b1'] }], ...over });

// A world that keeps what the handler keeps, so one visit can follow another.
function world({ trip: t = trip(), keyed = true, refuse = null, now = NOW, kept = [] } = {}) {
  const w = { trip: t, kept: [...kept], asked: [], ended: [], n: 0 };
  w.deps = {
    keyed,
    now: () => now,
    trip: async token => (token === TOKEN ? w.trip : null),
    kept: async () => [...w.kept],
    keep: async (tripId, row) => {
      const stands = w.kept.find(r => r.leg_id === row.leg_id && r.bus_id === row.bus_id);
      if (stands) return stands;
      const made = { id: `k${w.kept.length + 1}`, ...row };
      w.kept.push(made);
      return made;
    },
    drop: async id => { w.kept = w.kept.filter(r => r.id !== id); },
    buses: async ids => BUSES.filter(b => ids.includes(b.id)),
    vehicles: async () => [{ id: 'v218', name: ' 218 ' }, { id: 'v47', name: '47' }],
    share: async link => {
      w.asked.push(link);
      if (refuse) throw Object.assign(new Error('refused'), { status: refuse });
      w.n++;
      return { id: `s${w.n}`, liveSharingUrl: `https://cloud.samsara.com/o/1/fleet/viewer/${w.n}`, expiresAtTime: link.expiresAtTime };
    },
    end: async (id, when) => { w.ended.push([id, when]); },
  };
  return w;
}
const ask = async (w, body = { token: TOKEN }) => {
  const res = await handle(new Request('https://x/samsara-share', {
    method: 'POST', headers: { origin: 'http://localhost:8641' }, body: JSON.stringify(body),
  }), w.deps);
  return [res.status, await res.json()];
};

let w = world();
expect('a leg that is out shows its bus on its one vehicle\'s link, named for the bus, until an hour after its yard-back',
  [await ask(w), w.asked],
  [[200, { state: 'live', until: at(6), buses: [{ number: '218', url: 'https://cloud.samsara.com/o/1/fleet/viewer/1' }] }],
    [{ name: 'Bus 218', type: 'assetsLocation', assetsLocationLinkConfig: { assetId: 'v218' }, expiresAtTime: at(6) }]]);
expect('a second visit gets the same link and asks Samsara for none',
  [(await ask(w))[1].buses[0].url, w.asked.length, w.kept.length], ['https://cloud.samsara.com/o/1/fleet/viewer/1', 1, 1]);

w.trip = trip({ legs: [{ id: 'l1', start: NOW - H, end: NOW + 5 * H, buses: ['b3'] }] });
expect('a swapped bus gets a link of its own, and the old bus\'s is ended in Samsara and forgotten',
  [(await ask(w))[1].buses, w.ended, w.kept.map(r => r.bus_id)],
  [[{ number: '47', url: 'https://cloud.samsara.com/o/1/fleet/viewer/2' }], [['s1', new Date(NOW + END_MS).toISOString()]], ['b3']]);

w = world({ trip: trip({ legs: [{ id: 'l1', start: NOW - H, end: NOW + 5 * H, buses: ['b2', 'b1'] }] }) });
expect('two buses are listed by number, and one Samsara does not have has no link',
  (await ask(w))[1].buses, [{ number: '218', url: 'https://cloud.samsara.com/o/1/fleet/viewer/1' }, { number: '999', url: null }]);

w = world({ now: NOW - 2 * H });
expect('before the yard-out it says when the map starts, and asks Samsara for nothing',
  [await ask(w), w.asked.length], [[200, { state: 'before', starts: at(-1) }], 0]);
w = world({ now: NOW + 5 * H + AFTER_MS - 1 });
expect('the bus still shows to the end of the hour after the yard-back',
  (await ask(w))[1].state, 'live');
w = world({ now: NOW + 5 * H + AFTER_MS, kept: [{ id: 'k1', leg_id: 'l1', bus_id: 'b1', samsara_id: 's1', url: 'u', expires_at: at(6) }] });
expect('between a drop-off and its pickup it says when the next starts, and the first leg\'s link is forgotten',
  [await ask(w), w.kept.length, w.ended.length], [[200, { state: 'before', starts: at(48) }], 0, 0]);
expect('after the last leg it has ended',
  await ask(world({ now: NOW + 60 * H })), [200, { state: 'ended' }]);

w = world({ trip: trip({ cancelled: true }), kept: [{ id: 'k1', leg_id: 'l1', bus_id: 'b1', samsara_id: 's1', url: 'u', expires_at: at(6) }] });
expect('a cancelled trip has ended, and its working link is ended in Samsara',
  [await ask(w), w.ended.map(e => e[0]), w.kept.length], [[200, { state: 'ended' }], ['s1'], 0]);
expect('a trip with none of the company\'s buses has no map',
  await ask(world({ trip: trip({ legs: [{ id: 'l1', start: NOW - H, end: NOW + 5 * H, buses: [] }] }) })), [200, { state: 'none' }]);

w = world({ trip: trip({ legs: [{ id: 'l1', start: NOW - H, end: NOW + 30 * 24 * H, buses: ['b1'] }] }) });
expect('a link lasts no longer than the most a link may, though the leg shows to its end',
  [(await ask(w))[1].until, w.asked[0].expiresAtTime], [at(30 * 24 + 1), new Date(NOW + MAX_MS).toISOString()]);
w = world({ trip: w.trip, now: NOW + MAX_MS, kept: w.kept });
expect('a link that ran out on a leg still out is made again',
  [(await ask(w))[1].buses[0].url, w.kept.length, w.ended.length], ['https://cloud.samsara.com/o/1/fleet/viewer/1', 1, 0]);

expect('no token, a token of another shape, or no body is refused; a token no link has is not found',
  [(await ask(world(), {}))[0], (await ask(world(), { token: 'abc' }))[0], (await ask(world(), null))[0], await ask(world(), { token: 'b'.repeat(32) })],
  [400, 400, 400, [404, { error: 'not-found' }]]);
expect('no key is said only when a link has to be made',
  [await ask(world({ keyed: false })), (await ask(world({ keyed: false, now: NOW - 2 * H })))[0]],
  [[503, { error: 'no-key' }], 200]);
expect('a key Samsara refuses the link is said as no permission; any other failure as Samsara\'s',
  [await ask(world({ refuse: 403 })), (await ask(world({ refuse: 500 })))[1]],
  [[403, { error: 'no-permission' }], { error: 'samsara' }]);

console.log(failed ? `\n  ${failed} fault(s) in samsara-share` : '\n  samsara-share: every case passed');
process.exit(failed ? 1 : 0);
