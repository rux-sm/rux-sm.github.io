// Runs samsara-share's handler, the door a trip bar's Copy tracking link
// knocks on, against an invented fleet: which bus gets a link, how long it
// lasts, and what a caller who should not get one, or a key that may not make
// one, is told. The handler is TypeScript with no imports; its types are
// taken off and the rest is run as a module.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Taking the types off is new enough in Node to warn each time it is used.
process.removeAllListeners('warning');

const source = readFileSync(new URL('../samsara-share/handler.ts', import.meta.url), 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'check-samsara-share-'));
const file = join(scratch, 'handler.mjs');
writeFileSync(file, stripTypeScriptTypes(source));
const { handle, MAX_MS } = await import(pathToFileURL(file).href);
rmSync(scratch, { recursive: true, force: true });

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const NOW = Date.parse('2026-11-07T20:00:00Z');
const H = 3600_000;
const BUSES = { b1: { id: 'b1', number: '218' }, b2: { id: 'b2', number: '999' } };

function deps({ keyed = true, refuse = null } = {}) {
  const asked = [];
  return {
    asked,
    deps: {
      keyed,
      now: () => NOW,
      bus: async id => BUSES[id] ?? null,
      vehicles: async () => [{ id: 'v218', name: ' 218 ' }, { id: 'v470', name: '470' }],
      share: async body => {
        asked.push(body);
        if (refuse) throw Object.assign(new Error('refused'), { status: refuse });
        return { id: 'l1', liveSharingUrl: 'https://cloud.samsara.com/o/1/fleet/viewer/x', expiresAtTime: body.expiresAtTime };
      },
    },
  };
}
const ask = async (body, d = deps().deps, auth = 'Bearer t') => {
  const res = await handle(new Request('https://x/samsara-share', {
    method: 'POST', headers: { authorization: auth, origin: 'http://localhost:8641' }, body: JSON.stringify(body),
  }), d);
  return [res.status, await res.json()];
};

console.log('\n  samsara-share');
let p = deps();
expect('a bus Samsara has gets its one vehicle\'s link, named for the bus, until the time asked',
  [await ask({ bus_id: 'b1', until: new Date(NOW + 5 * H).toISOString() }, p.deps), p.asked],
  [[200, { url: 'https://cloud.samsara.com/o/1/fleet/viewer/x', until: new Date(NOW + 5 * H).toISOString() }],
    [{ name: 'Bus 218', type: 'assetsLocation', assetsLocationLinkConfig: { assetId: 'v218' }, expiresAtTime: new Date(NOW + 5 * H).toISOString() }]]);
p = deps();
expect('a link lasts no longer than the most a link may',
  (await ask({ bus_id: 'b1', until: new Date(NOW + 30 * 24 * H).toISOString() }, p.deps))[1].until, new Date(NOW + MAX_MS).toISOString());
expect('a past time, no bus or no body is refused before Samsara is asked',
  [(await ask({ bus_id: 'b1', until: new Date(NOW - H).toISOString() }))[0], (await ask({ until: new Date(NOW + H).toISOString() }))[0], (await ask(null))[0]],
  [400, 400, 400]);
p = deps();
expect('a bus the caller cannot read, or one Samsara does not have, gets no link and asks Samsara for none',
  [await ask({ bus_id: 'b9', until: new Date(NOW + H).toISOString() }, p.deps), await ask({ bus_id: 'b2', until: new Date(NOW + H).toISOString() }, p.deps), p.asked.length],
  [[404, { error: 'not-found' }], [404, { error: 'no-vehicle' }], 0]);
expect('no log-in, or no key, is said',
  [(await ask({ bus_id: 'b1', until: new Date(NOW + H).toISOString() }, deps().deps, ''))[0], await ask({ bus_id: 'b1', until: new Date(NOW + H).toISOString() }, deps({ keyed: false }).deps)],
  [401, [503, { error: 'no-key' }]]);
expect('a key Samsara refuses the link is said as no permission; any other failure as Samsara\'s',
  [await ask({ bus_id: 'b1', until: new Date(NOW + H).toISOString() }, deps({ refuse: 403 }).deps), (await ask({ bus_id: 'b1', until: new Date(NOW + H).toISOString() }, deps({ refuse: 500 }).deps))[1]],
  [[403, { error: 'no-permission' }], { error: 'samsara' }]);

console.log(failed ? `\n  ${failed} fault(s) in samsara-share` : '\n  samsara-share: every case passed');
process.exit(failed ? 1 : 0);
